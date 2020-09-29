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
import { WORLD_HEALTH_DASHBOARD, drag } from './dashboard.helper';

describe('Dashboard edit mode', () => {
  beforeEach(() => {
    cy.server();
    cy.login();
    cy.visit(WORLD_HEALTH_DASHBOARD);
    cy.get('[data-test="dashboard-header"]').find('[data-test=pencil]').click();
  });

  it('remove, and add chart flow', () => {
    // wait for box plot to appear
    cy.get('[data-test="grid-container"]').find('.box_plot');

    cy.get('[data-test="icon-button"]')
      .last()
      .then($el => {
        cy.wrap($el).invoke('show').click();
        // box plot should be gone
        cy.get('[data-test="grid-container"]')
          .find('.box_plot')
          .should('not.exist');
      });

    cy.get('[data-test="tabs-component"]').children().siblings().last().click();

    // wait for tab-switching animation to complete
    cy.wait(1000);

    // find box plot is available from list
    cy.get('[data-test="dragdroppable-object"]')
      .find('[data-test="card-title"]')
      .contains('Box plot');

    drag('[data-test="card-title"]', 'Box plot').to(
      '.grid-row.background--transparent:last',
    );

    // add back to dashboard
    cy.get('[data-test="grid-container"]').find('.box_plot').should('be.exist');

    // should show Save changes button
    cy.get('[data-test="dashboard-header"]')
      .find('[data-test="button-container"]')
      .find('[data-test="save-button"]');

    // undo 2 steps
    cy.get('[data-test="dashboard-header"]')
      .find('[data-test="button-container"]')
      .find('[data-test="undo-action"]')
      .click();

    // no changes, can switch to view mode
    cy.get('[data-test="dashboard-header"]')
      .find('[data-test="button-container"]')
      .find('[data-test="discard-changes-button"]')
      .click();
  });
});
