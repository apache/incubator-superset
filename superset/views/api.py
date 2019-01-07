# pylint: disable=R
import json

from flask import request
from flask_appbuilder import expose
from flask_appbuilder.security.decorators import has_access_api

import superset.models.core as models

from superset import appbuilder, db, security_manager
from superset.common.query_context import QueryContext
from superset.legacy import update_time_range
from superset.models.core import Log
from .base import api, BaseSupersetView, handle_api_exception

class Api(BaseSupersetView):
    @Log.log_this
    @api
    @handle_api_exception
    @has_access_api
    @expose('/v1/query/', methods=['POST'])
    def query(self):
        """
        Takes a query_obj constructed in the client and returns payload data response
        for the given query_obj.
        """
        query_context = QueryContext(**json.loads(request.form.get('query_context')))
        security_manager.assert_datasource_permission(query_context.datasource)
        payload_json = query_context.get_payload()
        return json.dumps(payload_json)

    @Log.log_this
    @api
    @handle_api_exception
    @has_access_api
    @expose('/v1/form_data/', methods=['GET'])
    def query_form_data(self):
        """
        Takes a query_obj constructed in the client and returns payload data response
        for the given query_obj.
        """
        form_data = {}
        slice_id = request.args.get('slice_id')
        print(slice_id)
        if slice_id:
            slc = db.session.query(models.Slice).filter_by(id=slice_id).one_or_none()
            if slc:
                form_data = slc.form_data.copy()

        update_time_range(form_data)

        return json.dumps(form_data)



appbuilder.add_view_no_menu(Api)
