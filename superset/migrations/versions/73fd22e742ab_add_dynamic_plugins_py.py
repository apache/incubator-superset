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
"""add_dynamic_plugins.py

Revision ID: 73fd22e742ab
Revises: 2f1d15e8a6af
Create Date: 2020-07-09 17:12:00.686702

"""

# revision identifiers, used by Alembic.
revision = "73fd22e742ab"
down_revision = "2f1d15e8a6af"

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


def upgrade():
    op.create_table(
        "dynamic_plugin",
        sa.Column("created_on", sa.DateTime(), nullable=True),
        sa.Column("changed_on", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("bundle_url", sa.Text(), nullable=False),
        sa.Column("created_by_fk", sa.Integer(), nullable=True),
        sa.Column("changed_by_fk", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["changed_by_fk"], ["ab_user.id"],),
        sa.ForeignKeyConstraint(["created_by_fk"], ["ab_user.id"],),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bundle_url"),
        sa.UniqueConstraint("key"),
        sa.UniqueConstraint("name"),
    )


def downgrade():
    op.drop_table("dynamic_plugin")
