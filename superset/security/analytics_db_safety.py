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
from sqlalchemy.engine.url import URL
from sqlalchemy.exc import NoSuchModuleError

from superset.exceptions import SupersetException

# list of unsafe SQLAlchemy dialects
BLOCKLIST = {
    # sqlite creates a local DB, which allows mapping server's filesystem
    "sqlite",
    # shillelagh allow opening local files (eg, csv:///etc/passwd)
    "shillelagh",
}


class DBSecurityException(SupersetException):
    """ Exception to prevent a security issue with connecting to a DB """

    status = 400


def check_sqlalchemy_uri(uri: URL) -> None:
    if uri.drivername in BLOCKLIST:
        try:
            dialect = uri.get_dialect().__name__
        except NoSuchModuleError:
            dialect = uri.drivername

        raise DBSecurityException(
            f"{dialect} cannot be used as a data source for security reasons."
        )
