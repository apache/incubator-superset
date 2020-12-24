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
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setExtraFormData } from 'src/dashboard/actions/nativeFilters';
import { getInitialFilterState } from 'src/dashboard/reducers/nativeFilters';
import { ExtraFormData, t } from '@superset-ui/core';
import { Charts, Layout, RootState } from 'src/dashboard/types';
import { DASHBOARD_ROOT_ID } from 'src/dashboard/util/constants';
import {
  CHART_TYPE,
  DASHBOARD_ROOT_TYPE,
} from 'src/dashboard/util/componentTypes';
import { FormInstance } from 'antd/lib/form';
import {
  Filter,
  FilterConfiguration,
  FilterState,
  FilterType,
  NativeFiltersForm,
  NativeFiltersState,
  TreeItem,
} from './types';
import {
  buildTree,
  getFormData,
  mergeExtraFormData,
  setFilterFieldValues,
  useForceUpdate,
} from './utils';
import { areObjectsEqual } from '../../../reduxUtils';
import { getChartDataRequest } from '../../../chart/chartAction';

const defaultFilterConfiguration: Filter[] = [];

export function useFilterConfiguration() {
  return useSelector<any, FilterConfiguration>(
    state =>
      state.dashboardInfo?.metadata?.filter_configuration ||
      defaultFilterConfiguration,
  );
}

/**
 * returns the dashboard's filter configuration,
 * converted into a map of id -> filter
 */
export function useFilterConfigMap() {
  const filterConfig = useFilterConfiguration();
  return useMemo(
    () =>
      filterConfig.reduce((acc: Record<string, Filter>, filter: Filter) => {
        acc[filter.id] = filter;
        return acc;
      }, {} as Record<string, Filter>),
    [filterConfig],
  );
}

export function useFilterState(id: string) {
  return useSelector<any, FilterState>(state => {
    return state.nativeFilters.filtersState[id] || getInitialFilterState(id);
  });
}

export function useSetExtraFormData() {
  const dispatch = useDispatch();
  return useCallback(
    (id: string, extraFormData: ExtraFormData) =>
      dispatch(setExtraFormData(id, extraFormData)),
    [dispatch],
  );
}

export function useFilterScopeTree(): {
  treeData: [TreeItem];
  layout: Layout;
} {
  const layout = useSelector<RootState, Layout>(
    ({ dashboardLayout: { present } }) => present,
  );

  const charts = useSelector<RootState, Charts>(({ charts }) => charts);
  const tree = {
    children: [],
    key: DASHBOARD_ROOT_ID,
    type: DASHBOARD_ROOT_TYPE,
    title: t('All Panels'),
  };

  // We need to get only nodes that have charts as children or grandchildren
  const validNodes = useMemo(() => {
    return Object.values(layout).reduce<string[]>((acc, cur) => {
      if (cur?.type === CHART_TYPE) {
        return [...new Set([...acc, ...cur?.parents, cur.id])];
      }
      return acc;
    }, []);
  }, [layout]);

  useMemo(() => {
    buildTree(layout[DASHBOARD_ROOT_ID], tree, layout, charts, validNodes);
  }, [charts, layout, tree]);

  return { treeData: [tree], layout };
}

export function useCascadingFilters(id: string) {
  return useSelector<any, ExtraFormData>(state => {
    const { nativeFilters }: { nativeFilters: NativeFiltersState } = state;
    const { filters, filtersState } = nativeFilters;
    const filter = filters[id];
    const cascadeParentIds = filter?.cascadeParentIds ?? [];
    let cascadedFilters = {};
    cascadeParentIds.forEach(parentId => {
      const parentState = filtersState[parentId] || {};
      const { extraFormData: parentExtra = {} } = parentState;
      cascadedFilters = mergeExtraFormData(cascadedFilters, parentExtra);
    });
    return cascadedFilters;
  });
}

// For changes of form fields sometimes we need re-render Filter defaultValue
export const useFEFormUpdate = (
  form: FormInstance<NativeFiltersForm>,
  filterId: string,
  filterToEdit?: Filter,
) => {
  const forceUpdate = useForceUpdate();
  const formFilter = (form.getFieldValue('filters') || {})[filterId];
  useEffect(() => {
    if (!formFilter) {
      return;
    }
    const formData = getFormData({
      datasetId: formFilter?.dataset?.value,
      groupby: formFilter?.column,
      allowsMultipleValues: formFilter?.allowsMultipleValues,
      currentValue: formFilter?.defaultValue,
      defaultValue: filterToEdit?.defaultValue,
      inverseSelection: formFilter?.inverseSelection,
    });
    if (areObjectsEqual(formData, formFilter?.defaultValueFormData)) {
      return;
    }
    setFilterFieldValues(form, filterId, {
      defaultValueFormData: formData,
    });
    forceUpdate();
  });
};

const defaultValuesPerFilterType = {
  [FilterType.filter_select]: [],
  [FilterType.filter_range]: {},
};

// When some fields in form changed we need re-fetch data for Filter defaultValue
export const useBEFormUpdate = (
  form: FormInstance<NativeFiltersForm>,
  filterId: string,
  filterToEdit?: Filter,
) => {
  const forceUpdate = useForceUpdate();
  const formFilter = (form.getFieldValue('filters') || {})[filterId];
  useEffect(() => {
    // No need to check data set change because it cascading update column
    // So check that column exists is enougph
    if (!formFilter || !formFilter?.column) {
      return;
    }
    getChartDataRequest({
      formData: getFormData({
        datasetId: formFilter?.dataset?.value,
        groupby: formFilter?.column,
        allowsMultipleValues: formFilter?.allowsMultipleValues,
        currentValue: formFilter?.defaultValue,
        defaultValue: filterToEdit?.defaultValue,
        inverseSelection: formFilter?.inverseSelection,
      }),
      force: false,
      requestParams: { dashboardId: 0 },
    }).then(response => {
      let resolvedDefaultValue =
        defaultValuesPerFilterType[formFilter?.filterType];
      if (
        filterToEdit?.filterType === formFilter?.filterType &&
        filterToEdit?.targets[0].datasetId === formFilter?.dataset?.value &&
        formFilter?.column === filterToEdit?.targets[0]?.column?.name
      ) {
        resolvedDefaultValue = filterToEdit?.defaultValue;
      }
      setFilterFieldValues(form, filterId, {
        defaultValueQueriesData: response.result,
        defaultValue: resolvedDefaultValue,
      });
      forceUpdate();
    });
  }, [
    formFilter?.filterType,
    formFilter?.column, // Will process also case when update dataset
    filterId,
  ]);
};
