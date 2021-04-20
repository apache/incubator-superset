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

import os
from unittest import mock

import pytest
from sqlalchemy.engine import create_engine
from sqlalchemy.exc import ProgrammingError

from superset import db, security_manager
from superset.exceptions import SupersetSecurityException
from superset.models.core import Database

session = db.session


@pytest.fixture()
def database1():
    database = Database(
        database_name="database1",
        sqlalchemy_uri="sqlite:///database1.db",
        allow_dml=True,
    )
    session.add(database)
    session.commit()

    yield database

    session.delete(database)
    session.commit()
    os.unlink("database1.db")


@pytest.fixture()
def table1(database1):
    engine = database1.get_sqla_engine()
    conn = engine.connect()
    conn.execute("CREATE TABLE table1 (a INTEGER NOT NULL PRIMARY KEY, b INTEGER)")
    conn.execute("INSERT INTO table1 (a, b) VALUES (1, 10), (2, 20)")
    session.commit()

    yield

    conn.execute("DROP TABLE table1")
    session.commit()


@pytest.fixture()
def database2():
    database = Database(
        database_name="database2",
        sqlalchemy_uri="sqlite:///database2.db",
        allow_dml=False,
    )
    session.add(database)
    session.commit()

    yield database

    session.delete(database)
    session.commit()
    os.unlink("database2.db")


@pytest.fixture()
def table2(database2):
    engine = database2.get_sqla_engine()
    conn = engine.connect()
    conn.execute("CREATE TABLE table2 (a INTEGER NOT NULL PRIMARY KEY, b TEXT)")
    conn.execute("INSERT INTO table2 (a, b) VALUES (1, 'ten'), (2, 'twenty')")
    session.commit()

    yield

    conn.execute("DROP TABLE table2")
    session.commit()


@mock.patch("superset.security.manager.g")
def test_superset(g, app_context, table1):
    g.user = security_manager.find_user("admin")

    engine = create_engine("superset://")
    conn = engine.connect()
    results = conn.execute('SELECT * FROM "superset.database1.table1"')
    assert list(results) == [(1, 10), (2, 20)]


@mock.patch("superset.security.manager.g")
def test_superset_joins(g, app_context, table1, table2):
    g.user = security_manager.find_user("admin")

    engine = create_engine("superset://")
    conn = engine.connect()
    results = conn.execute(
        """
        SELECT t1.b, t2.b
        FROM "superset.database1.table1" AS t1
        JOIN "superset.database2.table2" AS t2
        ON t1.a = t2.a
        """
    )
    assert list(results) == [(10, "ten"), (20, "twenty")]


@mock.patch("superset.security.manager.g")
def test_dml(g, app_context, table1, table2):
    g.user = security_manager.find_user("admin")

    engine = create_engine("superset://")
    conn = engine.connect()

    conn.execute('INSERT INTO "superset.database1.table1" (a, b) VALUES (3, 30)')
    results = conn.execute('SELECT * FROM "superset.database1.table1"')
    assert list(results) == [(1, 10), (2, 20), (3, 30)]
    conn.execute('UPDATE "superset.database1.table1" SET b=35 WHERE a=3')
    results = conn.execute('SELECT * FROM "superset.database1.table1"')
    assert list(results) == [(1, 10), (2, 20), (3, 35)]
    conn.execute('DELETE FROM "superset.database1.table1" WHERE b>20')
    results = conn.execute('SELECT * FROM "superset.database1.table1"')
    assert list(results) == [(1, 10), (2, 20)]

    with pytest.raises(ProgrammingError) as excinfo:
        conn.execute(
            """INSERT INTO "superset.database2.table2" (a, b) VALUES (3, 'thirty')"""
        )
    assert (
        str(excinfo.value).strip()
        == '(shillelagh.exceptions.ProgrammingError) DML not enabled in database "database2"\n[SQL: INSERT INTO "superset.database2.table2" (a, b) VALUES (3, \'thirty\')]\n(Background on this error at: http://sqlalche.me/e/13/f405)'
    )


@mock.patch("superset.security.manager.g")
def test_security_manager(g, app_context, table1):
    g.user = security_manager.find_user("gamma")

    engine = create_engine("superset://")
    conn = engine.connect()
    with pytest.raises(SupersetSecurityException) as excinfo:
        conn.execute('SELECT * FROM "superset.database1.table1"')
    assert (
        str(excinfo.value)
        == "You need access to the following tables: `table1`,\n            `all_database_access` or `all_datasource_access` permission"
    )
