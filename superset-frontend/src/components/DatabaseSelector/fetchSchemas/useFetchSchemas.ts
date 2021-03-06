/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useEffect, useRef } from 'react';
import { factoryFetchSchemas } from './factoryFetchSchemas';

export const useFetchSchemas = ({
  setSchemaLoading,
  setSchemaOptions,
  onSchemasLoad,
  handleError,
}: {
  setSchemaLoading: (loading: boolean) => void;
  setSchemaOptions: (options: any[]) => void;
  onSchemasLoad?: (schemas: Array<object>) => void;
  handleError: (msg: string) => void;
}) => {
  const fetchSchemas = useRef(
    factoryFetchSchemas({
      setSchemaOptions,
      onSchemasLoad,
      setSchemaLoading,
      handleError,
    }),
  );
  useEffect(() => {
    fetchSchemas.current = factoryFetchSchemas({
      setSchemaOptions,
      onSchemasLoad,
      setSchemaLoading,
      handleError,
    });
  }, [handleError, onSchemasLoad, setSchemaLoading, setSchemaOptions]);

  return fetchSchemas;
};
