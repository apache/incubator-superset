# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
# pylint: disable=C,R,W
"""a collection of model-related helper classes and functions"""
from datetime import datetime
import json
import logging
import re

from flask import escape, Markup
from flask_appbuilder.models.decorators import renders
from flask_appbuilder.models.mixins import AuditMixin
import humanize
import sqlalchemy as sa
from sqlalchemy import UniqueConstraint
from sqlalchemy.ext.declarative import declared_attr
import yaml

from superset.utils.core import QueryStatus
from superset.utils.sqla import uuid_sqla_column


def json_to_dict(json_str):
    if json_str:
        val = re.sub(",[ \t\r\n]+}", "}", json_str)
        val = re.sub(",[ \t\r\n]+\]", "]", val)
        return json.loads(val)
    else:
        return {}


class ExportImportMixin(object):
    uuid = uuid_sqla_column
    export_parent = None

    # The name of the attribute
    # with the SQL Alchemy back reference
    export_children = []

    # The names of the attributes
    # that are made available for import and export
    export_fields = []

    # Fields that are stored as json string in db, this abstraction
    # will serialize/deserialize them so that it's a consistent data structure
    export_fields_json = []

    # If a collection is exported, this str represents by which argument
    # to sort the collection achieve a deterministic order.
    # Deterministic ordering is useful for diffing and unit tests
    export_ordering = None

    @classmethod
    def _parent_foreign_key_mappings(cls):
        """Get a mapping of foreign name to the local name of foreign keys"""
        parent_rel = cls.__mapper__.relationships.get(cls.export_parent)
        if parent_rel:
            return {l.name: r.name for (l, r) in parent_rel.local_remote_pairs}
        return {}

    @property
    def export_fields_with_uuid(self):
        return list(self.export_fields) + ["uuid"]

    @classmethod
    def _unique_constrains(cls):
        """Get all (single column and multi column) unique constraints"""
        unique = [
            {c.name for c in u.columns}
            for u in cls.__table_args__
            if isinstance(u, UniqueConstraint)
        ]
        unique.extend({c.name} for c in cls.__table__.columns if c.unique)
        return unique

    def as_json(self):
        return json.dumps(self.export_to_dict(), indent=2, sort_keys=True)

    def as_yaml(self):
        return yaml.safe_dump(self.export_to_dict())

    @property
    def as_json_wrapped(self):
        s = escape(self.as_json())
        return Markup(f"<pre><code>{s}</code></pre>")

    @property
    def as_yaml_wrapped(self):
        s = escape(self.as_yaml())
        return Markup(f"<pre><code>{s}</code></pre>")

    @classmethod
    def export_schema(cls, recursive=True, include_parent_ref=False):
        """Export schema as a dictionary"""
        parent_excludes = {}
        if not include_parent_ref:
            parent_ref = cls.__mapper__.relationships.get(cls.export_parent)
            if parent_ref:
                parent_excludes = {c.name for c in parent_ref.local_columns}

        def formatter(c):
            return (
                "{0} Default ({1})".format(str(c.type), c.default.arg)
                if c.default
                else str(c.type)
            )

        schema = {
            c.name: formatter(c)
            for c in cls.__table__.columns
            if (c.name in cls.export_fields and c.name not in parent_excludes)
        }
        if recursive:
            for c in cls.export_children:
                child_class = cls.__mapper__.relationships[c].argument.class_
                schema[c] = [
                    child_class.export_schema(
                        recursive=recursive, include_parent_ref=include_parent_ref
                    )
                ]
        return schema

    @classmethod
    def import_from_dict(
        cls, session, dict_rep, parent=None, recursive=True, sync=None
    ):
        """Import obj from a dictionary"""
        sync = sync or []
        parent_refs = cls._parent_foreign_key_mappings()
        export_fields = set(cls.export_fields) | set(parent_refs.keys())

        for k in list(dict_rep):
            # Remove fields that should not get imported
            if k not in export_fields and k != "uuid":
                del dict_rep[k]
            # Serialize json fields that are stored as text in the db
            if k in cls.export_fields_json:
                dict_rep[k] = json.dumps(dict_rep[k])

        if parent:
            # Set foreign keys to parent obj
            for k, v in parent_refs.items():
                dict_rep[k] = getattr(parent, v)
        elif cls.export_parent:
            for p in parent_refs.keys():
                if p not in dict_rep:
                    raise RuntimeError(f"{cls.__name__}: Missing field {p}")

        # Check if object already exists in DB, break if more than one is found
        obj = session.query(cls).filter_by(uuid=dict_rep.get("uuid")).one_or_none()

        if not obj:
            logging.info("Creating new %s %s", cls.__tablename__, str(obj))
            obj = cls(**dict_rep)
            if cls.export_parent and parent:
                setattr(obj, cls.export_parent, parent)
            session.add(obj)
        else:
            logging.info("Updating %s %s", obj.__tablename__, str(obj))
            # Update columns
            for k, v in dict_rep.items():
                setattr(obj, k, v)

        # Recursively create children
        if recursive:
            import_args = dict(session=session, parent=obj, sync=sync)
            for rel in cls.export_children:
                child_class = cls.__mapper__.relationships[rel].argument.class_
                children = dict_rep.get(rel, [])
                children_orm = [
                    child_class.import_from_dict(child, **import_args)
                    for child in children
                ]
                setattr(obj, rel, children_orm)
        return obj

    def export_to_dict(
        self, recursive=True, include_parent_ref=False, include_defaults=False
    ):
        """Export obj to dictionary"""
        cls = self.__class__
        parent_excludes = {}
        if recursive and not include_parent_ref:
            parent_ref = cls.__mapper__.relationships.get(cls.export_parent)
            if parent_ref:
                parent_excludes = {c.name for c in parent_ref.local_columns}

        dict_rep = dict()

        for c in cls.__table__.columns:
            key = c.name
            value = getattr(self, key)
            if (
                key in self.export_fields_with_uuid
                and key not in parent_excludes
                and (
                    include_defaults
                    or (value is not None and (not c.default or value != c.default.arg))
                )
            ):
                if key in self.export_fields_json:
                    value = json.loads(value)
                dict_rep[key] = value
        if recursive:
            for relationship_name in self.export_children:
                # sorting to make lists of children stable
                orm_children = getattr(self, relationship_name)
                sort_by = None
                children = []
                if orm_children:
                    children = [
                        child.export_to_dict(
                            recursive=recursive,
                            include_parent_ref=include_parent_ref,
                            include_defaults=include_defaults,
                        )
                        for child in orm_children
                    ]
                    sort_by = orm_children[0].export_ordering
                if sort_by:
                    children = sorted(children, key=lambda x: x.get(sort_by))
                dict_rep[relationship_name] = children

        return dict_rep

    def override(self, obj):
        """Overrides the plain fields of the dashboard."""
        for field in obj.__class__.export_fields:
            setattr(self, field, getattr(obj, field))

    def copy(self):
        """Creates a copy of the dashboard without relationships."""
        new_obj = self.__class__()
        new_obj.override(self)
        return new_obj

    def alter_params(self, **kwargs):
        d = self.params_dict
        d.update(kwargs)
        self.params = json.dumps(d)

    @property
    def params_dict(self):
        return json_to_dict(self.params)

    @property
    def template_params_dict(self):
        return json_to_dict(self.template_params)


class AuditMixinNullable(AuditMixin):

    """Altering the AuditMixin to use nullable fields

    Allows creating objects programmatically outside of CRUD
    """

    created_on = sa.Column(sa.DateTime, default=datetime.now, nullable=True)
    changed_on = sa.Column(
        sa.DateTime, default=datetime.now, onupdate=datetime.now, nullable=True
    )

    @declared_attr
    def created_by_fk(self):  # noqa
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=self.get_user_id,
            nullable=True,
        )

    @declared_attr
    def changed_by_fk(self):  # noqa
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=self.get_user_id,
            onupdate=self.get_user_id,
            nullable=True,
        )

    def _user_link(self, user):
        if not user:
            return ""
        url = "/superset/profile/{}/".format(user.username)
        return Markup('<a href="{}">{}</a>'.format(url, escape(user) or ""))

    def changed_by_name(self):
        if self.created_by:
            return escape("{}".format(self.created_by))
        return ""

    @renders("created_by")
    def creator(self):  # noqa
        return self._user_link(self.created_by)

    @property
    def changed_by_(self):
        return self._user_link(self.changed_by)

    @renders("changed_on")
    def changed_on_(self):
        return Markup(f'<span class="no-wrap">{self.changed_on}</span>')

    @property
    def changed_on_humanized(self):
        return humanize.naturaltime(datetime.now() - self.changed_on)

    @renders("changed_on")
    def modified(self):
        return Markup(f'<span class="no-wrap">{self.changed_on_humanized}</span>')


class QueryResult(object):

    """Object returned by the query interface"""

    def __init__(  # noqa
        self, df, query, duration, status=QueryStatus.SUCCESS, error_message=None
    ):
        self.df = df
        self.query = query
        self.duration = duration
        self.status = status
        self.error_message = error_message


class ExtraJSONMixin:
    """Mixin to add an `extra` column (JSON) and utility methods"""

    extra_json = sa.Column(sa.Text, default="{}")

    @property
    def extra(self):
        try:
            return json.loads(self.extra_json)
        except Exception:
            return {}

    def set_extra_json(self, d):
        self.extra_json = json.dumps(d)

    def set_extra_json_key(self, key, value):
        extra = self.extra
        extra[key] = value
        self.extra_json = json.dumps(extra)
