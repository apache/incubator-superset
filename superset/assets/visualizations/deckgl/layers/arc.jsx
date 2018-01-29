import React from 'react';
import ReactDOM from 'react-dom';

import DeckGLContainer from './../DeckGLContainer';

import { ArcLayer } from 'deck.gl';

import * as common from './common';
import sandboxedEval from '../../../javascripts/modules/sandbox';

function deckArc(slice, payload, setControlValue) {
  const layer = getLayer(slice.formData, payload, slice);
  const viewport = {
    ...slice.formData.viewport,
    width: slice.width(),
    height: slice.height(),
  };
  ReactDOM.render(
    <DeckGLContainer
      mapboxApiAccessToken={payload.data.mapboxApiKey}
      viewport={viewport}
      layers={[layer]}
      mapStyle={slice.formData.mapbox_style}
      setControlValue={setControlValue}
    />,
    document.getElementById(slice.containerId),
  );
}

function getLayer(formData, payload, slice) {
  const fd = formData;
  const fc = fd.color_picker;
  let data = payload.data.arcs.map(d => ({
    ...d,
    color: [fc.r, fc.g, fc.b, 255 * fc.a],
  }));

  if (fd.js_data_mutator) {
    // Applying user defined data mutator if defined
    const jsFnMutator = sandboxedEval(fd.js_data_mutator);
    data = jsFnMutator(data);
  }

  return new ArcLayer({
    id: `path-layer-${fd.slice_id}`,
    data,
    strokeWidth: (fd.stroke_width) ? fd.stroke_width : 3,
    ...common.commonLayerProps(fd, slice),
  });
}

module.exports = deckArc;
