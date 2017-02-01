/* eslint camelcase: 0 */
import React from 'react';
import ReactDOM from 'react-dom';
import ExploreViewContainer from './components/ExploreViewContainer';
import { createStore, applyMiddleware, compose } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { now } from '../modules/dates';
import { initEnhancer } from '../reduxUtils';
import { getFieldsState } from './stores/store';


// jquery and bootstrap required to make bootstrap dropdown menu's work
const $ = window.$ = require('jquery'); // eslint-disable-line
const jQuery = window.jQuery = require('jquery'); // eslint-disable-line
require('bootstrap');
require('./main.css');

const exploreViewContainer = document.getElementById('js-explore-view-container');
const bootstrapData = JSON.parse(exploreViewContainer.getAttribute('data-bootstrap'));

import { exploreReducer } from './reducers/exploreReducer';
const formData = bootstrapData.form_data;
const fields = getFieldsState(bootstrapData, formData);
delete bootstrapData.form_data;

// Initial state
const bootstrappedState = Object.assign(
  bootstrapData, {
    chartStatus: 'loading',
    chartUpdateEndTime: null,
    chartUpdateStartTime: now(),
    dashboards: [],
    fields,
    filterColumnOpts: [],
    isDatasourceMetaLoading: false,
    isStarred: false,
    queryResponse: null,
  }
);

const store = createStore(exploreReducer, bootstrappedState,
  compose(applyMiddleware(thunk), initEnhancer(false))
);

ReactDOM.render(
  <Provider store={store}>
    <ExploreViewContainer />
  </Provider>,
  exploreViewContainer
);
