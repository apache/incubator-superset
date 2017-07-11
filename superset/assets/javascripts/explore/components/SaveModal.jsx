/* eslint camelcase: 0 */
import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';
import { Modal, Alert, Button, Radio } from 'react-bootstrap';
import Select from 'react-select';
import { connect } from 'react-redux';
import intl from 'react-intl-universal';
import { getLanguage } from '../stores/language';
import enUS from '../stores/en_US';
import zhCN from '../stores/zh_CN';

const locales = {
  "en_US": enUS,
  "zh_CN": zhCN,
};

const propTypes = {
  can_overwrite: PropTypes.bool,
  onHide: PropTypes.func.isRequired,
  actions: PropTypes.object.isRequired,
  form_data: PropTypes.object,
  user_id: PropTypes.string.isRequired,
  dashboards: PropTypes.array.isRequired,
  alert: PropTypes.string,
  slice: PropTypes.object,
  datasource: PropTypes.object,
};

class SaveModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      saveToDashboardId: null,
      newDashboardName: '',
      newSliceName: '',
      dashboards: [],
      alert: null,
      action: props.can_overwrite ? 'overwrite' : 'saveas',
      addToDash: 'noSave',
    };
  }
  componentDidMount() {
    this.loadLocales();
    this.props.actions.fetchDashboards(this.props.user_id);
  }

  onChange(name, event) {
    switch (name) {
      case 'newSliceName':
        this.setState({ newSliceName: event.target.value });
        break;
      case 'saveToDashboardId':
        this.setState({ saveToDashboardId: event.value });
        this.changeDash('existing');
        break;
      case 'newDashboardName':
        this.setState({ newDashboardName: event.target.value });
        break;
      default:
        break;
    }
  }

  loadLocales() {
    intl.init({
      currentLocale: getLanguage(),
      locales,
    })
    .then(() => {
    this.setState({initDone: true});
    });
  }
  
  changeAction(action) {
    this.setState({ action });
  }
  changeDash(dash) {
    this.setState({ addToDash: dash });
  }
  saveOrOverwrite(gotodash) {
    this.setState({ alert: null });
    this.props.actions.removeSaveModalAlert();
    const sliceParams = {};

    let sliceName = null;
    sliceParams.action = this.state.action;
    if (this.props.slice && this.props.slice.slice_id) {
      sliceParams.slice_id = this.props.slice.slice_id;
    }
    if (sliceParams.action === 'saveas') {
      sliceName = this.state.newSliceName;
      if (sliceName === '') {
        this.setState({ alert: intl.formatMessage({id:'enter_slice_name', defaultMessage: `Please enter a slice name`}) });
        return;
      }
      sliceParams.slice_name = sliceName;
    } else {
      sliceParams.slice_name = this.props.slice.slice_name;
    }

    const addToDash = this.state.addToDash;
    sliceParams.add_to_dash = addToDash;
    let dashboard = null;
    switch (addToDash) {
      case ('existing'):
        dashboard = this.state.saveToDashboardId;
        if (!dashboard) {
          this.setState({ alert: intl.formatMessage({id:'select_dashboard', defaultMessage: `Please select a dashboard`}) });
          return;
        }
        sliceParams.save_to_dashboard_id = dashboard;
        break;
      case ('new'):
        dashboard = this.state.newDashboardName;
        if (dashboard === '') {
          this.setState({ alert: intl.formatMessage({id:'enter_dashboard_name', defaultMessage: `Please enter a dashboard name`}) });
          return;
        }
        sliceParams.new_dashboard_name = dashboard;
        break;
      default:
        dashboard = null;
    }
    sliceParams.goto_dash = gotodash;

    const baseUrl = `/superset/explore/${this.props.datasource.type}/${this.props.datasource.id}/`;
    sliceParams.datasource_name = this.props.datasource.name;

    const saveUrl = `${baseUrl}?form_data=` +
      `${encodeURIComponent(JSON.stringify(this.props.form_data))}` +
      `&${$.param(sliceParams, true)}`;
    this.props.actions.saveSlice(saveUrl)
      .then((data) => {
        // Go to new slice url or dashboard url
        window.location = data;
      });
    this.props.onHide();
  }
  removeAlert() {
    if (this.props.alert) {
      this.props.actions.removeSaveModalAlert();
    }
    this.setState({ alert: null });
  }
  render() {
    return (
      <Modal
        show
        onHide={this.props.onHide}
        bsStyle="large"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {intl.formatMessage({id:'save_a_slice', defaultMessage: `Save A Slice`})}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(this.state.alert || this.props.alert) &&
            <Alert>
              {this.state.alert ? this.state.alert : this.props.alert}
              <i
                className="fa fa-close pull-right"
                onClick={this.removeAlert.bind(this)}
                style={{ cursor: 'pointer' }}
              />
            </Alert>
          }
          {this.props.slice &&
            <Radio
              id="overwrite-radio"
              disabled={!this.props.can_overwrite}
              checked={this.state.action === 'overwrite'}
              onChange={this.changeAction.bind(this, 'overwrite')}
            >
              {`${intl.formatMessage({id:'overwrite_slice', defaultMessage: `Overwrite slice`})} ${this.props.slice.slice_name}`}
            </Radio>
          }

          <Radio
            id="saveas-radio"
            inline
            checked={this.state.action === 'saveas'}
            onChange={this.changeAction.bind(this, 'saveas')}
          > {intl.formatMessage({id:'save_as', defaultMessage: `Save as`})} &nbsp;
          </Radio>
          <input
            name="new_slice_name"
            placeholder={intl.formatMessage({id:'slice_name', defaultMessage: `[slice name]`})}
            onChange={this.onChange.bind(this, 'newSliceName')}
            onFocus={this.changeAction.bind(this, 'saveas')}
          />


          <br />
          <hr />

          <Radio
            checked={this.state.addToDash === 'noSave'}
            onChange={this.changeDash.bind(this, 'noSave')}
          >
          {intl.formatMessage({id:'do_not_add_to_dash', defaultMessage: `Do not add to a dashboard`})}
          </Radio>

          <Radio
            inline
            checked={this.state.addToDash === 'existing'}
            onChange={this.changeDash.bind(this, 'existing')}
          >
          {intl.formatMessage({id:'add_slice_to_existing_dash', defaultMessage: `Add slice to existing dashboard`})}
          </Radio>
          <Select
            options={this.props.dashboards}
            onChange={this.onChange.bind(this, 'saveToDashboardId')}
            autoSize={false}
            value={this.state.saveToDashboardId}
          />

          <Radio
            inline
            checked={this.state.addToDash === 'new'}
            onChange={this.changeDash.bind(this, 'new')}
          >
          {intl.formatMessage({id:'add_to_new_dash', defaultMessage: `Add to new dashboard`})} &nbsp;
          </Radio>
          <input
            onChange={this.onChange.bind(this, 'newDashboardName')}
            onFocus={this.changeDash.bind(this, 'new')}
            placeholder={intl.formatMessage({id:'dash_name', defaultMessage: `Dashboard name`})}
          />
        </Modal.Body>

        <Modal.Footer>
          <Button
            type="button"
            id="btn_modal_save"
            className="btn pull-left"
            onClick={this.saveOrOverwrite.bind(this, false)}
          >
          {intl.formatMessage({id:'save', defaultMessage: `Save`})}
          </Button>
          <Button
            type="button"
            id="btn_modal_save_goto_dash"
            className="btn btn-primary pull-left gotodash"
            disabled={this.state.addToDash === 'noSave'}
            onClick={this.saveOrOverwrite.bind(this, true)}
          >
          {intl.formatMessage({id:'save_go_dash', defaultMessage: `Save & go to dashboard`})}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

SaveModal.propTypes = propTypes;

function mapStateToProps(state) {
  return {
    datasource: state.datasource,
    slice: state.slice,
    can_overwrite: state.can_overwrite,
    user_id: state.user_id,
    dashboards: state.dashboards,
    alert: state.saveModalAlert,
  };
}

export { SaveModal };
export default connect(mapStateToProps, () => ({}))(SaveModal);
