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
import { Row, Col } from 'src/common/components';
import { FormGroup, FormControl } from 'react-bootstrap';
import { t, styled } from '@superset-ui/core';
import _ from 'lodash';
import ControlHeader from 'src/explore/components/ControlHeader';

const propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.array,
};

const defaultProps = {
  onChange: () => {},
  value: [null, null],
};

const StyledFormGroup = styled(FormGroup)`
  margin-bottom: 0px;
`;

export default class BoundsControl extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      minMax: [
        props.value[0] === null ? '' : props.value[0],
        props.value[1] === null ? '' : props.value[1],
      ],
    };
    this.onChange = this.onChange.bind(this);
    this.onMinChange = this.onMinChange.bind(this);
    this.onMaxChange = this.onMaxChange.bind(this);
    this.update = this.update.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.value, this.props.value)) {
      this.update();
    }
  }

  update() {
    this.setState({
      minMax: [
        Number.isNaN(this.props.value[0]) ? '' : this.props.value[0],
        Number.isNaN(this.props.value[1]) ? '' : this.props.value[1],
      ],
    });
  }

  onMinChange(event) {
    const min = event.target.value;
    this.setState(
      prevState => ({
        minMax: [min, prevState.minMax[1]],
      }),
      this.onChange,
    );
  }

  onMaxChange(event) {
    const max = event.target.value;
    this.setState(
      prevState => ({
        minMax: [prevState.minMax[0], max],
      }),
      this.onChange,
    );
  }

  onChange() {
    const mm = this.state.minMax;
    const errors = [];
    if (mm[0] && Number.isNaN(Number(mm[0]))) {
      errors.push(t('`Min` value should be numeric or empty'));
    }
    if (mm[1] && Number.isNaN(Number(mm[1]))) {
      errors.push(t('`Max` value should be numeric or empty'));
    }
    if (errors.length === 0) {
      this.props.onChange([parseFloat(mm[0]), parseFloat(mm[1])], errors);
    } else {
      this.props.onChange([null, null], errors);
    }
  }

  render() {
    return (
      <div>
        <ControlHeader {...this.props} />
        <StyledFormGroup bsSize="small">
          <Row gutter={4}>
            <Col xs={12}>
              <FormControl
                data-test="min-bound"
                type="text"
                placeholder={t('Min')}
                onChange={this.onMinChange}
                value={this.state.minMax[0]}
              />
            </Col>
            <Col xs={12}>
              <FormControl
                type="text"
                data-test="max-bound"
                placeholder={t('Max')}
                onChange={this.onMaxChange}
                value={this.state.minMax[1]}
              />
            </Col>
          </Row>
        </StyledFormGroup>
      </div>
    );
  }
}

BoundsControl.propTypes = propTypes;
BoundsControl.defaultProps = defaultProps;
