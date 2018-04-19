import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import GridCell from './GridCell';
import { slicePropShape, chartPropShape } from '../v2/util/propShapes';
import DashboardBuilder from '../v2/containers/DashboardBuilder';

const propTypes = {
  dashboardInfo: PropTypes.shape().isRequired,
  layout: PropTypes.object.isRequired,
  datasources: PropTypes.object,
  charts: PropTypes.objectOf(chartPropShape).isRequired,
  slices: PropTypes.objectOf(slicePropShape).isRequired,
  expandedSlices: PropTypes.object.isRequired,
  sliceIds: PropTypes.object.isRequired,
  filters: PropTypes.object,
  timeout: PropTypes.number,
  onChange: PropTypes.func,
  rerenderCharts: PropTypes.func,
  getFormDataExtra: PropTypes.func,
  exploreChart: PropTypes.func,
  exportCSV: PropTypes.func,
  refreshChart: PropTypes.func,
  saveSliceName: PropTypes.func,
  toggleExpandSlice: PropTypes.func,
  addFilter: PropTypes.func,
  getFilters: PropTypes.func,
  removeFilter: PropTypes.func,
  editMode: PropTypes.bool.isRequired,
  showBuilderPane: PropTypes.bool.isRequired,
};

const defaultProps = {
  expandedSlices: {},
  filters: {},
  timeout: 60,
  onChange: () => ({}),
  getFormDataExtra: () => ({}),
  exploreChart: () => ({}),
  exportCSV: () => ({}),
  refreshChart: () => ({}),
  saveSliceName: () => ({}),
  toggleExpandSlice: () => ({}),
  addFilter: () => ({}),
  getFilters: () => ({}),
  removeFilter: () => ({}),
};

class GridLayout extends React.Component {
  constructor(props) {
    super(props);

    this.updateSliceName = this.props.dashboardInfo.dash_edit_perm ?
      this.updateSliceName.bind(this) : null;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.editMode !== this.props.editMode ||
      prevProps.showBuilderPane !== this.props.showBuilderPane) {
      this.props.rerenderCharts();
    }
  }

  getWidgetId(sliceId) {
    return 'widget_' + sliceId;
  }

  getWidgetHeight(sliceId) {
    const widgetId = this.getWidgetId(sliceId);
    if (!widgetId || !this.refs[widgetId]) {
      return 400;
    }
    return this.refs[widgetId].parentNode.clientHeight;
  }

  getWidgetWidth(sliceId) {
    const widgetId = this.getWidgetId(sliceId);
    if (!widgetId || !this.refs[widgetId]) {
      return 400;
    }
    return this.refs[widgetId].parentNode.clientWidth;
  }

  updateSliceName(sliceId, sliceName) {
    const key = sliceId;
    const currentSlice = this.props.slices[key];
    if (!currentSlice || currentSlice.slice_name === sliceName) {
      return;
    }

    this.props.saveSliceName(currentSlice, sliceName);
  }

  isExpanded(sliceId) {
    return this.props.expandedSlices[sliceId];
  }

  render() {
    const cells = {};
    this.props.sliceIds.forEach((sliceId) => {
      const key = sliceId;
      const currentChart = this.props.charts[key];
      const currentSlice = this.props.slices[key];
      if (currentChart) {
        const currentDatasource = this.props.datasources[currentChart.form_data.datasource];
        const queryResponse = currentChart.queryResponse || {};
        cells[key] = (
          <div
            id={key}
            key={sliceId}
            className={cx('widget', `${currentSlice.viz_type}`, { 'is-edit': this.props.editMode })}
            ref={this.getWidgetId(sliceId)}
          >
            <GridCell
              slice={currentSlice}
              chart={currentChart}
              datasource={currentDatasource}
              filters={this.props.filters}
              formData={this.props.getFormDataExtra(currentChart)}
              timeout={this.props.timeout}
              widgetHeight={this.getWidgetHeight(sliceId)}
              widgetWidth={this.getWidgetWidth(sliceId)}
              exploreChart={this.props.exploreChart}
              exportCSV={this.props.exportCSV}
              isExpanded={!!this.isExpanded(sliceId)}
              isLoading={currentChart.chartStatus === 'loading'}
              isCached={queryResponse.is_cached}
              cachedDttm={queryResponse.cached_dttm}
              toggleExpandSlice={this.props.toggleExpandSlice}
              refreshChart={this.props.refreshChart}
              updateSliceName={this.updateSliceName}
              addFilter={this.props.addFilter}
              getFilters={this.props.getFilters}
              removeFilter={this.props.removeFilter}
              editMode={this.props.editMode}
              annotationQuery={currentChart.annotationQuery}
              annotationError={currentChart.annotationError}
            />
          </div>
        );
      }
    });

    return (
      <DashboardBuilder
        cells={cells}
      />
    );
  }
}

GridLayout.propTypes = propTypes;
GridLayout.defaultProps = defaultProps;

export default GridLayout;
