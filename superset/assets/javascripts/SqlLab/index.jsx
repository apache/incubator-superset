import React from 'react';
import { render } from 'react-dom';
import { createStore, compose, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';

import { getInitialState, sqlLabReducer } from './reducers';
import { initEnhancer } from '../reduxUtils';
import { initJQueryAjaxCSRF } from '../modules/utils';
import App from './components/App';

require('bootstrap');
require('./main.css');
const $ = window.$ = require('jquery');

const jQuery = window.jQuery = $; // eslint-disable-line

initJQueryAjaxCSRF();

const appContainer = document.getElementById('app');
const bootstrapData = JSON.parse(appContainer.getAttribute('data-bootstrap'));
const state = Object.assign({}, getInitialState(bootstrapData.defaultDbId), bootstrapData);

const store = createStore(
  sqlLabReducer, state, compose(applyMiddleware(thunkMiddleware), initEnhancer()));

// jquery hack to highlight the navbar menu
$('a:contains("SQL Lab")').parent().addClass('active');

render(
  <Provider store={store}>
    <App />
  </Provider>,
  appContainer,
);
