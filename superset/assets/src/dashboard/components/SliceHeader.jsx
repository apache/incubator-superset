import React from 'react';
import PropTypes from 'prop-types';

import { t } from '../../locales';
import EditableTitle from '../../components/EditableTitle';
import TooltipWrapper from '../../components/TooltipWrapper';
import SliceHeaderControls from './SliceHeaderControls';

const propTypes = {
  innerRef: PropTypes.func,
  slice: PropTypes.object.isRequired,
  isExpanded: PropTypes.bool,
  isCached: PropTypes.bool,
  cachedDttm: PropTypes.string,
  updateSliceName: PropTypes.func,
  toggleExpandSlice: PropTypes.func,
  forceRefresh: PropTypes.func,
  exploreChart: PropTypes.func,
  exportCSV: PropTypes.func,
  editMode: PropTypes.bool,
  annotationQuery: PropTypes.object,
  annotationError: PropTypes.object,
};

const defaultProps = {
  innerRef: null,
  forceRefresh: () => ({}),
  removeSlice: () => ({}),
  updateSliceName: () => ({}),
  toggleExpandSlice: () => ({}),
  exploreChart: () => ({}),
  exportCSV: () => ({}),
  editMode: false,
};

class SliceHeader extends React.PureComponent {
  constructor(props) {
    super(props);

    this.onSaveTitle = this.onSaveTitle.bind(this);
  }

  onSaveTitle(newTitle) {
    if (this.props.updateSliceName) {
      this.props.updateSliceName(this.props.slice.slice_id, newTitle);
    }
  }

  render() {
    const {
      slice,
      isExpanded,
      isCached,
      cachedDttm,
      toggleExpandSlice,
      forceRefresh,
      exploreChart,
      exportCSV,
      innerRef,
    } = this.props;

    const annoationsLoading = t('Annotation layers are still loading.');
    const annoationsError = t('One ore more annotation layers failed loading.');

    return (
      <div className="chart-header" ref={innerRef}>
        <div className="header">
          <EditableTitle
            title={slice.slice_name}
            canEdit={!!this.props.updateSliceName && this.props.editMode}
            onSaveTitle={this.onSaveTitle}
            noPermitTooltip={'You don\'t have the rights to alter this dashboard.'}
            showTooltip={!!this.props.updateSliceName && this.props.editMode}
          />
          {!!Object.values(this.props.annotationQuery || {}).length &&
            <TooltipWrapper
              label="annotations-loading"
              placement="top"
              tooltip={annoationsLoading}
            >
              <i className="fa fa-refresh warning" />
            </TooltipWrapper>
          }
          {!!Object.values(this.props.annotationError || {}).length &&
            <TooltipWrapper
              label="annoation-errors"
              placement="top"
              tooltip={annoationsError}
            >
              <i className="fa fa-exclamation-circle danger" />
            </TooltipWrapper>
          }
          {!this.props.editMode &&
            <SliceHeaderControls
              slice={slice}
              isCached={isCached}
              isExpanded={isExpanded}
              cachedDttm={cachedDttm}
              toggleExpandSlice={toggleExpandSlice}
              forceRefresh={forceRefresh}
              exploreChart={exploreChart}
              exportCSV={exportCSV}
            />
          }
        </div>
      </div>
    );
  }
}

SliceHeader.propTypes = propTypes;
SliceHeader.defaultProps = defaultProps;

export default SliceHeader;
