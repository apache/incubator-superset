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
import React from 'react';
import { Col, Row, Panel } from 'react-bootstrap';
import Tabs from 'src/common/components/Tabs';
import { t } from '@superset-ui/core';

import Favorites from './Favorites';
import UserInfo from './UserInfo';
import Security from './Security';
import RecentActivity from './RecentActivity';
import CreatedContent from './CreatedContent';
import { UserWithPermissionsAndRoles } from '../../types/bootstrapTypes';

interface AppProps {
  user: UserWithPermissionsAndRoles;
}

export default function App({ user }: AppProps) {
  return (
    <div className="container app">
      <Row>
        <Col md={3}>
          <UserInfo user={user} />
        </Col>
        <Col md={9}>
          <Tabs>
            <Tabs.TabPane
              key="1"
              tab={
                <div>
                  <i className="fa fa-star" /> {t('Favorites')}
                </div>
              }
            >
              <Panel>
                <Panel.Body>
                  <Favorites user={user} />
                </Panel.Body>
              </Panel>
            </Tabs.TabPane>
            <Tabs.TabPane
              key="2"
              tab={
                <div>
                  <i className="fa fa-paint-brush" /> {t('Created Content')}
                </div>
              }
            >
              <Panel>
                <Panel.Body>
                  <CreatedContent user={user} />
                </Panel.Body>
              </Panel>
            </Tabs.TabPane>
            <Tabs.TabPane
              key="3"
              tab={
                <div>
                  <i className="fa fa-list" /> {t('Recent Activity')}
                </div>
              }
            >
              <Panel>
                <Panel.Body>
                  <RecentActivity user={user} />
                </Panel.Body>
              </Panel>
            </Tabs.TabPane>
            <Tabs.TabPane
              key="4"
              tab={
                <div>
                  <i className="fa fa-lock" /> {t('Security & Access')}
                </div>
              }
            >
              <Panel>
                <Panel.Body>
                  <Security user={user} />
                </Panel.Body>
              </Panel>
            </Tabs.TabPane>
          </Tabs>
        </Col>
      </Row>
    </div>
  );
}
