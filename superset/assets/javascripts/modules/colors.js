import $ from 'jquery';
import d3 from 'd3';

// Color related utility functions go in this object
const bnbColors = [
  '#ff5a5f', // rausch
  '#7b0051', // hackb
  '#007A87', // kazan
  '#00d1c1', // babu
  '#8ce071', // lima
  '#ffb400', // beach
  '#b4a76c', // barol
  '#ff8083',
  '#cc0086',
  '#00a1b3',
  '#00ffeb',
  '#bbedab',
  '#ffd266',
  '#cbc29a',
  '#ff3339',
  '#ff1ab1',
  '#005c66',
  '#00b3a5',
  '#55d12e',
  '#b37e00',
  '#988b4e',
];
const d3Category10 = d3.scale.category10().range();
const d3Category20 = d3.scale.category20().range();
const d3Category20b = d3.scale.category20b().range();
const d3Category20c = d3.scale.category20c().range();
const googleCategory10c = [
  '#3366cc',
  '#dc3912',
  '#ff9900',
  '#109618',
  '#990099',
  '#0099c6',
  '#dd4477',
  '#66aa00',
  '#b82e2e',
  '#316395',
];
const googleCategory20c = [
  '#3366cc',
  '#dc3912',
  '#ff9900',
  '#109618',
  '#990099',
  '#0099c6',
  '#dd4477',
  '#66aa00',
  '#b82e2e',
  '#316395',
  '#994499',
  '#22aa99',
  '#aaaa11',
  '#6633cc',
  '#e67300',
  '#8b0707',
  '#651067',
  '#329262',
  '#5574a6',
  '#3b3eac',
];
export const ALL_COLOR_SCHEMES = {
  bnbColors,
  d3Category10,
  d3Category20,
  d3Category20b,
  d3Category20c,
  googleCategory10c,
  googleCategory20c,
};

export const spectrums = {
  blue_white_yellow: [
    '#00d1c1',
    'white',
    '#ffb400',
  ],
  fire: [
    'white',
    'yellow',
    'red',
    'black',
  ],
  white_black: [
    'white',
    'black',
  ],
  black_white: [
    'black',
    'white',
  ],
};

export const getColorFromScheme = (function () {
  // Color factory
  const seen = {};
  return function (s, scheme) {
    if (!s) {
      return;
    }
    const selectedScheme = scheme ? ALL_COLOR_SCHEMES[scheme] : ALL_COLOR_SCHEMES.bnbColors;
    let stringifyS = String(s);
    // next line is for superset series that should have the same color
    stringifyS = stringifyS.replace('---', '');
    if (seen[selectedScheme] === undefined) {
      seen[selectedScheme] = {};
    }
    if (seen[selectedScheme][stringifyS] === undefined) {
      seen[selectedScheme][stringifyS] = Object.keys(seen[selectedScheme]).length;
    }
    /* eslint consistent-return: 0 */
    return selectedScheme[seen[selectedScheme][stringifyS] % selectedScheme.length];
  };
}());

export const colorScalerFactory = function (colors, data, accessor) {
  // Returns a linear scaler our of an array of color
  if (!Array.isArray(colors)) {
    /* eslint no-param-reassign: 0 */
    colors = spectrums[colors];
  }
  let ext = [0, 1];
  if (data !== undefined) {
    ext = d3.extent(data, accessor);
  }
  const points = [];
  const chunkSize = (ext[1] - ext[0]) / colors.length;
  $.each(colors, function (i) {
    points.push(i * chunkSize);
  });
<<<<<<< HEAD
  return d3.scale.linear().domain(points).range(colors);
};
=======
  if (country == 'map'){
    console.log(data.map( function(d) { return d['metric']; } ));
    console.log(data)
    console.log(accessor)
    console.log(ext)
    console.log(colors)
    //console.log(d3.scale.quantile().domain(points).range(colors));
    return d3.scale.quantile().domain(ext).range(colors);
  } else {
    return d3.scale.linear().domain(points).range(colors);
  }
  //return d3.scale.quantize().domain(points).range(colors);
};
>>>>>>> added console log of input accessor
