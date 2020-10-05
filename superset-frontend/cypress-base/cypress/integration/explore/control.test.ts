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
// ***********************************************
// Tests for setting controls in the UI
// ***********************************************
import { FORM_DATA_DEFAULTS, NUM_METRIC } from './visualizations/shared.helper';

describe('Datasource control', () => {
  const newMetricName = `abc${Date.now()}`;

  it('should allow edit dataset', () => {
    let numScripts = 0;

    cy.login();
    cy.server();
    cy.route('GET', '/superset/explore_json/**').as('getJson');
    cy.route('POST', '/superset/explore_json/**').as('postJson');
    cy.visitChartByName('Num Births Trend');
    cy.verifySliceSuccess({ waitAlias: '@postJson' });
    cy.get('script').then(nodes => {
      numScripts = nodes.length;
    });
    cy.get('[data-test="datasource-menu"]').click();
    cy.get('[data-test="edit-datasource"]').click();

    // should load additional scripts for the modal
    cy.get('script').then(nodes => {
      expect(nodes.length).to.greaterThan(numScripts);
    });

    // create new metric
    cy.get('[data-test="collection-tab-Metrics"]').click();
    cy.get('[data-test="add-item-button"]').click();
    cy.get('[data-test="table-content-rows"]')
      .find('input[value="<new metric>"]')
      .click();
    cy.get('[data-test="table-content-rows"]')
      .find('input[value="<new metric>"]')
      .focus()
      .clear()
      .type(`${newMetricName}{enter}`);
    cy.get('[data-test="datasource-modal-save"]').contains('Save').click();
    cy.get('.modal-footer button').contains('OK').click();
    // select new metric
    cy.get('[data-test=metrics]')
      .find('.Select__control input')
      .focus()
      .type(newMetricName, { force: true });
    // delete metric
    cy.get('[data-test="datasource-menu"]').click();
    cy.get('[data-test="edit-datasource"]').contains('Edit Datasource').click();
    cy.get('[data-test="collection-tab-Metrics"]').click();

    cy.get('[data-test="table-content-rows"]')
      .find(`input[value="${newMetricName}"]`)
      .closest('[data-test="table-row"]')
      .find('[data-test="crud-delete-icon"]')
      .click();
    cy.get('[data-test="datasource-modal-save"]')
      .contains('Save')
      .click({ force: true });
    cy.get('.modal-footer button').contains('OK').click();
    cy.get('[data-test="table-content-rows"]')
      .find(`input[value="${newMetricName}"]`)
      .should('not.exist');
  });
});

describe('VizType control', () => {
  beforeEach(() => {
    cy.login();
    cy.server();
    cy.route('GET', '/superset/explore_json/**').as('getJson');
    cy.route('POST', '/superset/explore_json/**').as('postJson');
  });

  it('Can change vizType', () => {
    cy.visitChartByName('Daily Totals');
    cy.verifySliceSuccess({ waitAlias: '@postJson' });

    let numScripts = 0;
    cy.get('script').then(nodes => {
      numScripts = nodes.length;
    });

    cy.get('[data-test="viz_type"]').contains('Table').click();
    cy.get('[data-test="viz-row"]')
      .children()
      .first()
      .find('[data-test="viztype-label"]')
      .contains('Line Chart')
      .click();

    // should load mathjs for line chart
    cy.get('script[src*="mathjs"]').should('have.length', 1);
    cy.get('script').then(nodes => {
      expect(nodes.length).to.greaterThan(numScripts);
    });

    cy.get('button[data-test="run-query-button"]').click();
    cy.verifySliceSuccess({ waitAlias: '@postJson', chartSelector: 'svg' });
  });
});

describe('Time range filter', () => {
  beforeEach(() => {
    cy.login();
    cy.server();
    cy.route('GET', '/superset/explore_json/**').as('getJson');
    cy.route('POST', '/superset/explore_json/**').as('postJson');
  });

  it('Defaults to the correct tab for time_range params', () => {
    const formData = {
      ...FORM_DATA_DEFAULTS,
      metrics: [NUM_METRIC],
      viz_type: 'line',
      time_range: '100 years ago : now',
    };

    cy.visitChartByParams(JSON.stringify(formData));
    cy.verifySliceSuccess({ waitAlias: '@postJson' });

    cy.get('[data-test=time_range]').within(() => {
      cy.get('[data-test="popover-trigger"]').click();
    });

    cy.get('[data-test="date-input-group"]').within(() => {
      cy.get('[data-test="date-from-input"]').should(
        'have.value',
        '100 years ago',
      );
      cy.get('[data-test="date-to-input"]').should('have.value', 'now');
    });
    cy.get('[data-test="date-ok-button"]').contains('Ok').click();
    cy.get('[data-test="date-input-group"]').should('not.exist');
  });
});

describe('Groupby control', () => {
  it('Set groupby', () => {
    cy.server();
    cy.login();
    cy.route('GET', '/superset/explore_json/**').as('getJson');
    cy.route('POST', '/superset/explore_json/**').as('postJson');
    cy.visitChartByName('Num Births Trend');
    cy.verifySliceSuccess({ waitAlias: '@postJson' });

    cy.get('[data-test=groupby]').within(() => {
      cy.get('.Select__control').click();
      cy.get('input[type=text]').type('state{enter}');
    });
    cy.get('button[data-test="run-query-button"]').click();
    cy.verifySliceSuccess({ waitAlias: '@postJson', chartSelector: 'svg' });
  });
});
