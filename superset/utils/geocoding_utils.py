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
import json
import time

import requests
from requests import HTTPError, RequestException, Timeout


class GeocoderUtil:  # pylint: disable=too-few-public-methods
    """
    The GeoCoder object holds the logic for geocoding given data
    """

    interruptflag = False
    conf: dict = {}
    progress: dict = {}

    def __init__(self, config):
        self.conf = config

    def geocode(self, geocoder: str, data: list):
        try:
            if geocoder == "MapTiler":
                return self._geocode_maptiler(data)
            return self._geocode_testing()
        except Exception as e:
            raise e
        finally:
            self.progress["progress"] = 0
            self.progress["is_in_progress"] = False

    def _geocode_maptiler(self, data: list) -> list:
        """
        geocode the data using the Maptiler API
        :param data: the addresses to be geocoded as a list of tuples
        :return: a dictionary containing the addresses and their long,lat values
        """
        errors = []
        geocoded_data = [()]
        data_length = len(data)
        counter = 0
        self.progress["success_counter"] = 0
        self.progress["is_in_progress"] = True
        self.progress["progress"] = 0

        for datum in data:
            try:
                if self.interruptflag:
                    self.interruptflag = False
                    self.progress["progress"] = 0
                    self.progress["is_in_progress"] = False
                    return geocoded_data
                address = " ".join(datum)
                geocoded = self._get_coordinates_from_address(address)
                if geocoded is not None:
                    geocoded_data.append(datum + tuple(geocoded))

                    self.progress["success_counter"] += 1
                counter += 1
                self.progress["progress"] = counter / data_length
            except ConnectionError as e:
                errors.append("A network error occurs: {0}".format(e.args[0]))
            except HTTPError as e:
                errors.append(
                    "The request for {0} returns a wrong HTTP answer: {1}".format(
                        address, e.args[0]
                    )
                )
            except Timeout as e:
                errors.append(
                    "The request for {0} run into a time out: {1}".format(
                        address, e.args[0]
                    )
                )
            except RequestException as e:
                errors.append(
                    "While geocode the address {0}, an error occurs: {1}".format(
                        address, e.args[0]
                    )
                )

        self.progress["progress"] = 100
        self.progress["is_in_progress"] = False
        # TODO also return amount of geocoded values or store in
        #  class-variable and errors
        return geocoded_data

    def _get_coordinates_from_address(self, address: str):
        base_url = "https://api.maptiler.com/geocoding/"
        response = requests.get(
            base_url + address + ".json?key=" + self.conf["MAPTILER_API_KEY"]
        )
        decoded_data = json.loads(response.content.decode())
        # TODO make use of relevance if wanted
        features = decoded_data["features"]
        if features:
            coordinates = features[0]
            # TODO check if it is possible, that there is no center attribute
            #  -> get API doc from mr. Keller
            # TODO don't raise success_counter if there is no 'center' Attribute
            return coordinates["center"] or None
        return None

    def _geocode_testing(self) -> dict:
        counter = 0
        datalen = 10
        self.progress["is_in_progress"] = True
        self.progress["progress"] = 0
        for _ in range(datalen):
            if self.interruptflag:
                self.interruptflag = False
                self.progress["is_in_progress"] = False
                self.progress["progress"] = 0
                return {0: ""}
            time.sleep(2)
            counter = counter + 1
            self.progress["progress"] = counter / datalen
        return {0: ""}
