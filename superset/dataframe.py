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
""" Superset utilities for pandas.DataFrame.
"""
from superset.utils.core import JS_MAX_INTEGER
from typing import Dict
import pandas as pd

def df_to_dict(df: pd.DataFrame) -> Dict:
    data = df.to_dict(orient="records")
    # TODO: refactor this
    for d in data:
        for k, v in list(d.items()):
            # if an int is too big for Java Script to handle
            # convert it to a string
            if isinstance(v, int):
                if abs(v) > JS_MAX_INTEGER:
                    d[k] = str(v)
    return data
