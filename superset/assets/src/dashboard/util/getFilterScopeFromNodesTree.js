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
import { CHART_TYPE, TAB_TYPE } from './componentTypes';

// input [{value, label, children: []}],
// output {
//   filterKey1: { scope: [tab1, tab2], immune: [chart1, chart2] }
//   filterKey2: { scope: [tab1, tab2], immune: [chart1, chart2] }
// }
export default function getFilterScopeFromNodesTree({
  nodes = [],
  checkedChartIds = [],
}) {
  function traverse({ currentNode, parent = '', scope, immune }) {
    if (!currentNode) {
      return;
    }

    const { value: nodeValue, children } = currentNode;
    // any chart type child is checked?
    const chartChildren = children.filter(({ type }) => type === CHART_TYPE);
    if (chartChildren.some(({ value }) => checkedChartIds.includes(value))) {
      if (!scope.has(parent)) {
        scope.add(nodeValue);
      }
      children.forEach(({ value }) => {
        if (!checkedChartIds.includes(value)) {
          immune.push(value);
        }
      });
    }

    const tabChildren = children.filter(({ type }) => type === TAB_TYPE);
    tabChildren.forEach(child => {
      traverse({
        currentNode: child,
        parent: nodeValue,
        scope,
        immune,
      });
    });
  }

  const scope = new Set();
  const immune = [];
  if (nodes && nodes.length) {
    nodes.forEach(node => {
      traverse({
        currentNode: node,
        parent: '',
        scope,
        immune,
      });
    });
  }

  return {
    scope: [...scope],
    immune,
  };
}
