import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { SupersetClient } from '@superset-ui/core';

import * as Actions from '../actions';

const QUERY_UPDATE_FREQ = 2000;
const QUERY_UPDATE_BUFFER_MS = 5000;
const MAX_QUERY_AGE_TO_POLL = 21600000;

class QueryAutoRefresh extends React.PureComponent {
  componentWillMount() {
    this.startTimer();
  }
  componentWillUnmount() {
    this.stopTimer();
  }
  shouldCheckForQueries() {
    // if there are started or running queries, this method should return true
    const { queries, queriesLastUpdate } = this.props;
    const now = new Date().getTime();

    return (
      queriesLastUpdate > 0 &&
      Object.values(queries).some(
        q => ['running', 'started', 'pending', 'fetching', 'rendering'].indexOf(q.state) >= 0 &&
        now - q.startDttm < MAX_QUERY_AGE_TO_POLL,
      )
    );
  }
  startTimer() {
    if (!this.timer) {
      this.timer = setInterval(this.stopwatch.bind(this), QUERY_UPDATE_FREQ);
    }
  }
  stopTimer() {
    clearInterval(this.timer);
    this.timer = null;
  }
  stopwatch() {
    // only poll /superset/queries/ if there are started or running queries
    const self = this;
    if (this.shouldCheckForQueries()) {
      SupersetClient.get({
        endpoint: `/superset/queries/${this.props.queriesLastUpdate - QUERY_UPDATE_BUFFER_MS}`,
        timeout: '7000',
      }).then(({ json }) => {
        if (Object.keys(json).length > 0) {
          this.props.actions.refreshQueries(json);
        }
        }).catch((err) => {
          console.log(err);
        });
    }
  }
/*=======
      const url = `/superset/queries/${this.props.queriesLastUpdate - QUERY_UPDATE_BUFFER_MS}`;
      $.ajax({
        dataType: 'json',
        url,
        success: (data) => {
          if (Object.keys(data).length > 0) {
            self.props.actions.refreshQueries(data);
          }
        },
        error: (XMLHttpRequest) => {
          if (XMLHttpRequest.readyState === 0) {
            self.props.actions.userOffline();
            // document.location.reload(true);
          }
        },
>>>>>>> add timeout and refresh for failed backend*/
  render() {
    return null;
  }
}
QueryAutoRefresh.propTypes = {
  queries: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  queriesLastUpdate: PropTypes.number.isRequired,
};

function mapStateToProps({ sqlLab }) {
  return {
    queries: sqlLab.queries,
    queriesLastUpdate: sqlLab.queriesLastUpdate,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(Actions, dispatch),
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(QueryAutoRefresh);
