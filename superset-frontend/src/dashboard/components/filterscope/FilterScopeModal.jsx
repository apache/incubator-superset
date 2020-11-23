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
import PropTypes from 'prop-types';
import { styled } from '@superset-ui/core';

import ModalTrigger from '../../../components/ModalTrigger';
import FilterScope from '../../containers/FilterScope';

const propTypes = {
  triggerNode: PropTypes.node.isRequired,
};

const FilterScopeModalBody = styled.div`
  padding: ${({ theme }) => theme.gridUnit * 2}px
    ${({ theme }) => theme.gridUnit * 2}px
    ${({ theme }) => theme.gridUnit * 3}px
    ${({ theme }) => theme.gridUnit * 2}px;
`;

export default class FilterScopeModal extends React.PureComponent {
  constructor(props) {
    super(props);

    this.modal = React.createRef();
    this.handleCloseModal = this.handleCloseModal.bind(this);
  }

  handleCloseModal() {
    if (this.modal.current) {
      this.modal.current.close();
    }
  }

  render() {
    return (
      <ModalTrigger
        ref={this.modal}
        triggerNode={this.props.triggerNode}
        modalBody={
          <FilterScopeModalBody>
            <FilterScope onCloseModal={this.handleCloseModal} />
          </FilterScopeModalBody>
        }
        width="80%"
      />
    );
  }
}

FilterScopeModal.propTypes = propTypes;
