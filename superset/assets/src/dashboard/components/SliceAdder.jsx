import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import { List } from 'react-virtualized';
import SearchInput, { createFilter } from 'react-search-input';

import DragDroppable from '../v2/components/dnd/DragDroppable';
import { CHART_TYPE, NEW_COMPONENT_SOURCE_TYPE } from '../v2/util/componentTypes';
import { NEW_CHART_ID, NEW_COMPONENTS_SOURCE_ID } from '../v2/util/constants';
import { slicePropShape } from '../v2/util/propShapes';

const propTypes = {
  fetchAllSlices: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  slices: PropTypes.objectOf(slicePropShape).isRequired,
  lastUpdated: PropTypes.number.isRequired,
  errorMessage: PropTypes.string,
  userId: PropTypes.string.isRequired,
  selectedSliceIds: PropTypes.object,
  editMode: PropTypes.bool,
};

const defaultProps = {
  selectedSliceIds: new Set(),
  editMode: false,
};

const KEYS_TO_FILTERS = ['slice_name', 'viz_type', 'datasource_name'];
const KEYS_TO_SORT = [
  { key: 'slice_name', label: 'Name' },
  { key: 'viz_type', label: 'Visualization' },
  { key: 'datasource_name', label: 'Datasource' },
  { key: 'changed_on', label: 'Recent' },
];

class SliceAdder extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      filteredSlices: [],
      searchTerm: '',
      sortBy: KEYS_TO_SORT.findIndex(item => (item.key === 'changed_on')),
    };

    this.rowRenderer = this.rowRenderer.bind(this);
    this.searchUpdated = this.searchUpdated.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
  }

  componentDidMount() {
    this.slicesRequest = this.props.fetchAllSlices(this.props.userId);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.lastUpdated !== this.props.lastUpdated) {
      this.setState({
        filteredSlices: Object.values(nextProps.slices)
          .filter(createFilter(this.state.searchTerm, KEYS_TO_FILTERS))
          .sort(this.sortByComparator(KEYS_TO_SORT[this.state.sortBy].key)),
      });
    }
  }

  componentWillUnmount() {
    if (this.slicesRequest && this.slicesRequest.abort) {
      this.slicesRequest.abort();
    }
  }

  getFilteredSortedSlices(searchTerm, sortBy) {
    return Object.values(this.props.slices)
      .filter(createFilter(searchTerm, KEYS_TO_FILTERS))
      .sort(this.sortByComparator(KEYS_TO_SORT[sortBy].key));
  }

  sortByComparator(attr) {
    const desc = (attr === 'changed_on') ? -1 : 1;

    return (a, b) => {
      if (a[attr] < b[attr]) {
        return -1 * desc;
      } else if (a[attr] > b[attr]) {
        return 1 * desc;
      }
      return 0;
    };
  }

  handleKeyPress(ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();

      this.searchUpdated(ev.target.value);
    }
  }

  searchUpdated(searchTerm) {
    this.setState({
      searchTerm,
      filteredSlices: this.getFilteredSortedSlices(searchTerm, this.state.sortBy),
    });
  }

  handleSelect(sortBy) {
    this.setState({
      sortBy,
      filteredSlices: this.getFilteredSortedSlices(this.state.searchTerm, sortBy),
    });
  }

  rowRenderer({ key, index, style }) {
    const cellData = this.state.filteredSlices[index];
    const duration = cellData.modified ? cellData.modified.replace(/<[^>]*>/g, '') : '';
    const isSelected = this.props.selectedSliceIds.has(cellData.slice_id);
    const type = CHART_TYPE;
    const id = NEW_CHART_ID;
    const meta = {
      chartId: cellData.slice_id,
    };

    return (
      <DragDroppable
        component={{ type, id, meta }}
        parentComponent={{ id: NEW_COMPONENTS_SOURCE_ID, type: NEW_COMPONENT_SOURCE_TYPE }}
        index={0}
        depth={0}
        disableDragDrop={isSelected}
        editMode={this.props.editMode}
      >
        {({ dragSourceRef }) => (
          <div
            ref={dragSourceRef}
            className="chart-card-container"
            key={key}
            style={style}
          >
            <div className={cx('chart-card', { 'is-selected': isSelected })}>
              <div className="card-title">{cellData.slice_name}</div>
              <div className="card-body">
                <div className="item">
                  <span>Modified </span>
                  <span>{duration}</span>
                </div>
                <div className="item">
                  <span>Visualization </span>
                  <span>{cellData.viz_type}</span>
                </div>
                <div className="item">
                  <span>Data source </span>
                  <span dangerouslySetInnerHTML={{ __html: cellData.datasource_link }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </DragDroppable>
    );
  }

  render() {
    return (
      <div className="slice-adder-container">
        <div className="controls">
          <DropdownButton
            title={KEYS_TO_SORT[this.state.sortBy].label}
            onSelect={this.handleSelect}
            id="slice-adder-sortby"
          >
            {KEYS_TO_SORT.map((item, index) => (
              <MenuItem key={item.key} eventKey={index}>{item.label}</MenuItem>
            ))}
          </DropdownButton>

          <SearchInput
            onChange={this.searchUpdated}
            onKeyPress={this.handleKeyPress}
          />
        </div>

        {this.props.isLoading &&
          <img
            src="/static/assets/images/loading.gif"
            className="loading"
            alt="loading"
          />
        }
        <div className={this.props.errorMessage ? '' : 'hidden'}>
          {this.props.errorMessage}
        </div>
        <div className={!this.props.isLoading ? '' : 'hidden'}>
          {this.state.filteredSlices.length > 0 &&
            <List
              width={376}
              height={500}
              rowCount={this.state.filteredSlices.length}
              rowHeight={136}
              rowRenderer={this.rowRenderer}
              searchTerm={this.state.searchTerm}
              sortBy={this.state.sortBy}
              selectedSliceIds={this.props.selectedSliceIds}
            />
          }
        </div>
      </div>
    );
  }
}

SliceAdder.propTypes = propTypes;
SliceAdder.defaultProps = defaultProps;

export default SliceAdder;
