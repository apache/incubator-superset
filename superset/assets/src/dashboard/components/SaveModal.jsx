/* eslint-env browser */
import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';

import { Button, FormControl, FormGroup, Radio } from 'react-bootstrap';
import { getAjaxErrorMsg } from '../../modules/utils';
import ModalTrigger from '../../components/ModalTrigger';
import { t } from '../../locales';
import Checkbox from '../../components/Checkbox';

const propTypes = {
  addSuccessToast: PropTypes.func.isRequired,
  addDangerToast: PropTypes.func.isRequired,
  dashboardId: PropTypes.number.isRequired,
  dashboardTitle: PropTypes.string.isRequired,
  expandedSlices: PropTypes.object.isRequired,
  layout: PropTypes.object.isRequired,
  triggerNode: PropTypes.node.isRequired,
  filters: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
  isMenuItem: PropTypes.bool,
};

const defaultProps = {
  isMenuItem: false,
};

class SaveModal extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      saveType: 'overwrite',
      newDashName: `${props.dashboardTitle} [copy]`,
      duplicateSlices: false,
    };
    this.modal = null;
    this.handleSaveTypeChange = this.handleSaveTypeChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.saveDashboard = this.saveDashboard.bind(this);
    this.setModalRef = this.setModalRef.bind(this);
    this.toggleDuplicateSlices = this.toggleDuplicateSlices.bind(this);
  }

  setModalRef(ref) {
    this.modal = ref;
  }

  toggleDuplicateSlices() {
    this.setState({ duplicateSlices: !this.state.duplicateSlices });
  }

  handleSaveTypeChange(event) {
    this.setState({
      saveType: event.target.value,
    });
  }

  handleNameChange(event) {
    this.setState({
      newDashName: event.target.value,
      saveType: 'newDashboard',
    });
  }

  // @TODO this should all be moved to actions
  saveDashboardRequest(data, url, saveType) {
    $.ajax({
      type: 'POST',
      url,
      data: {
        data: JSON.stringify(data),
      },
      success: resp => {
        this.modal.close();
        this.props.onSave();
        if (saveType === 'newDashboard') {
          window.location = `/superset/dashboard/${resp.id}/`;
        } else {
          this.props.addSuccessToast(
            t('This dashboard was saved successfully.'),
          );
        }
      },
      error: error => {
        this.modal.close();
        const errorMsg = getAjaxErrorMsg(error);
        this.props.addDangerToast(
          `${t('Sorry, there was an error saving this dashboard: ')}
          ${errorMsg}`,
        );
      },
    });
  }

  saveDashboard() {
    const { saveType, newDashName } = this.state;
    const {
      dashboardTitle,
      layout: positions,
      expandedSlices,
      filters,
      dashboardId,
    } = this.props;

    const data = {
      positions,
      expanded_slices: expandedSlices,
      dashboard_title: dashboardTitle,
      default_filters: JSON.stringify(filters),
      duplicate_slices: this.state.duplicateSlices,
    };

    let url = null;
    if (saveType === 'overwrite') {
      url = `/superset/save_dash/${dashboardId}/`;
      this.saveDashboardRequest(data, url, saveType);
    } else if (saveType === 'newDashboard') {
      if (!newDashName) {
        this.props.addDangerToast(
          t('You must pick a name for the new dashboard'),
        );
      } else {
        data.dashboard_title = newDashName;
        url = `/superset/copy_dash/${dashboardId}/`;
        this.saveDashboardRequest(data, url, saveType);
      }
    }
  }

  render() {
    return (
      <ModalTrigger
        ref={this.setModalRef}
        isMenuItem={this.props.isMenuItem}
        triggerNode={this.props.triggerNode}
        modalTitle={t('Save Dashboard')}
        modalBody={
          <FormGroup>
            <Radio
              value="overwrite"
              onChange={this.handleSaveTypeChange}
              checked={this.state.saveType === 'overwrite'}
            >
              {t('Overwrite Dashboard [%s]', this.props.dashboardTitle)}
            </Radio>
            <hr />
            <Radio
              value="newDashboard"
              onChange={this.handleSaveTypeChange}
              checked={this.state.saveType === 'newDashboard'}
            >
              {t('Save as:')}
            </Radio>
            <FormControl
              type="text"
              placeholder={t('[dashboard name]')}
              value={this.state.newDashName}
              onFocus={this.handleNameChange}
              onChange={this.handleNameChange}
            />
            <div className="m-l-25 m-t-5">
              <Checkbox
                checked={this.state.duplicateSlices}
                onChange={this.toggleDuplicateSlices}
              />
              <span className="m-l-5">also copy (duplicate) slices</span>
            </div>
          </FormGroup>
        }
        modalFooter={
          <div>
            <Button bsStyle="primary" onClick={this.saveDashboard}>
              {t('Save')}
            </Button>
          </div>
        }
      />
    );
  }
}

SaveModal.propTypes = propTypes;
SaveModal.defaultProps = defaultProps;

export default SaveModal;
