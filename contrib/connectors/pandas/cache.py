from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from io import open
import json
import os
import tempfile
from time import time
try:
    import cPickle as pickle
except ImportError:  # pragma: no cover
    import pickle

import pandas as pd

from werkzeug.contrib.cache import FileSystemCache
from werkzeug.posixemulation import rename


class DataFrameCache(FileSystemCache):
    """
    A cache that stores Pandas DataFrames on the file system.

    DataFrames are stored in Feather Format - a fast on-disk representation
    of the Apache Arrow in-memory format to eliminate serialization
    overhead.

    This cache depends on being the only user of the `cache_dir`. Make
    absolutely sure that nobody but this cache stores files there or
    otherwise the cache will randomly delete files therein.

    :param cache_dir: the directory where cache files are stored.
    :param threshold: the maximum number of items the cache stores before
                      it starts deleting some.
    :param default_timeout: the default timeout that is used if no timeout is
                            specified on :meth:`~BaseCache.set`. A timeout of
                            0 indicates that the cache never expires.
    :param mode: the file mode wanted for the cache files, default 0600
    """

    _fs_cache_suffix = '.cached'
    _fs_metadata_suffix = '.metadata'

    def _list_dir(self):
        """return a list of (fully qualified) cache filenames
        """
        return [os.path.join(self._path, fn) for fn in os.listdir(self._path)
                if fn.endswith(self._fs_cache_suffix)]

    def _prune(self):
        entries = self._list_dir()
        if len(entries) > self._threshold:
            now = time()
            for idx, cname in enumerate(entries):
                mname = os.path.splitext(cname)[0] + self._fs_metadata_suffix
                try:
                    with open(mname, 'r') as f:
                        metadata = json.load(f)
                except (IOError, OSError):
                    metadata = {'expires': -1}
                try:
                    remove = ((metadata['expires'] != 0 and metadata['expires'] <= now)
                              or idx % 3 == 0)
                    if remove:
                        os.remove(cname)
                        os.remove(mname)
                except (IOError, OSError):
                    pass

    def clear(self):
        for cname in self._list_dir():
            try:
                mname = os.path.splitext(cname)[0] + self._fs_metadata_suffix
                os.remove(cname)
                os.remove(mname)
            except (IOError, OSError):
                return False
        return True

    def get(self, key):
        filename = self._get_filename(key)
        cname = filename + self._fs_cache_suffix
        mname = filename + self._fs_metadata_suffix
        try:
            with open(mname, 'r') as f:
                metadata = json.load(f)
        except (IOError, OSError):
            metadata = {'expires': -1}
        try:
            with open(cname, 'rb') as f:
                if metadata['expires'] == 0 or metadata['expires'] > time():
                    read_method = getattr(pd, 'read_{}'.format(metadata['format']))
                    read_args = metadata.get('read_args', {})
                    if metadata['format'] == 'hdf':
                        return read_method(f.name, **read_args)
                    else:
                        return read_method(f, **read_args)
                else:
                    os.remove(cname)
                    os.remove(mname)
                    return None
        except (IOError, OSError):
            return None

    def add(self, key, value, timeout=None):
        filename = self._get_filename(key) + self._fs_cache_suffix
        if not os.path.exists(filename):
            return self.set(key, value, timeout)
        return False

    def set(self, key, value, timeout=None):
        metadata = {'expires': self._normalize_timeout(timeout)}
        filename = self._get_filename(key)
        cname = filename + self._fs_cache_suffix
        mname = filename + self._fs_metadata_suffix
        self._prune()
        try:
            fd, tmp = tempfile.mkstemp(suffix=self._fs_transaction_suffix,
                                       dir=self._path)
            with os.fdopen(fd, 'wb') as f:
                try:
                    value.to_feather(f)
                    metadata['format'] = 'feather'
                except ValueError:
                    try:
                        value.to_hdf(tmp, 'df')
                        metadata['format'] = 'hdf'
                        metadata['read_args'] = {'key': 'df'}
                    except ImportError:
                        # PyTables is not installed, so fallback to pickle
                        pickle.dump(value, f, pickle.HIGHEST_PROTOCOL)
                        metadata['format'] = 'pickle'
            rename(tmp, cname)
            os.chmod(cname, self._mode)
            with open(mname, 'w') as f:
                json.dump(metadata, f)
            os.chmod(mname, self._mode)
        except (IOError, OSError):
            return False
        else:
            return True

    def delete(self, key):
        filename = self._get_filename(key)
        cname = filename + self._fs_cache_suffix
        mname = filename + self._fs_metadata_suffix
        try:
            os.remove(cname)
            os.remove(mname)
        except (IOError, OSError):
            return False
        else:
            return True

    def has(self, key):
        filename = self._get_filename(key)
        cname = filename + self._fs_cache_suffix
        mname = filename + self._fs_metadata_suffix
        try:
            with open(mname, 'r') as f:
                metadata = json.load(f)
        except (IOError, OSError):
            metadata = {'expires': -1}
        try:
            with open(cname, 'rb') as f:
                if metadata['expires'] == 0 or metadata['expires'] > time():
                    return True
                else:
                    os.remove(cname)
                    os.remove(mname)
                    return False
        except (IOError, OSError):
            return False

    def inc(self, key, delta=1):
        raise NotImplementedError()

    def dec(self, key, delta=1):
        raise NotImplementedError()


dataframe_cache = DataFrameCache(
    cache_dir='/tmp/pandasdatasource_cache',
    threshold=200,
    default_timeout=24 * 60 * 60,
)
