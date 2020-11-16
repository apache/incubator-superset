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
import logging
from datetime import datetime, timedelta
from typing import Optional

from flask_appbuilder.security.sqla.models import User
from sqlalchemy.orm import Session

from superset.commands.base import BaseCommand
from superset.dao.exceptions import DAODeleteFailedError
from superset.models.reports import ReportSchedule
from superset.reports.commands.base import normal_session_scope
from superset.reports.commands.exceptions import (
    ReportScheduleDeleteFailedError,
    ReportScheduleNotFoundError,
)
from superset.reports.dao import ReportScheduleDAO
from superset.utils.celery import session_scope

logger = logging.getLogger(__name__)


class PruneReportScheduleLogCommand(BaseCommand):
    """
    Prunes logs from all report schedules
    """

    def __init__(self, worker_context: bool = True):
        self._worker_context = worker_context

    def run(self) -> None:
        if self._worker_context:
            session_context = session_scope(nullpool=True)
        else:
            session_context = normal_session_scope
        with session_context as session:
            self.validate()
            for report_schedule in session.query(ReportSchedule).all():
                from_date = datetime.utcnow() - timedelta(
                    days=report_schedule.log_retention
                )
                ReportScheduleDAO.bulk_delete_logs(
                    report_schedule, from_date, session=session, commit=False
                )

    def validate(self) -> None:
        pass
