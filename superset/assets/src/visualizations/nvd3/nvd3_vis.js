import throttle from 'lodash.throttle';
import d3 from 'd3';
import nv from 'nvd3';
import mathjs from 'mathjs';
import moment from 'moment';
import d3tip from 'd3-tip';
import dompurify from 'dompurify';
import PropTypes from 'prop-types';
import 'nvd3/build/nv.d3.min.css';

import { getColorFromScheme } from '../../modules/colors';
import AnnotationTypes, { applyNativeColumns } from '../../modules/AnnotationTypes';
import { customizeToolTip, d3TimeFormatPreset, d3FormatPreset, tryNumify } from '../../modules/utils';
import { formatDateVerbose } from '../../modules/dates';
import { isTruthy } from '../../utils/common';
import { t } from '../../locales';
import { VIZ_TYPES } from '../index';
import {
  addTotalBarValues,
  hideTooltips,
  wrapTooltip,
  getLabel,
  getMaxLabelSize,
  formatLabel,
  computeBarChartWidth,
} from './utils';

import './nvd3_vis.css';

// Limit on how large axes margins can grow as the chart window is resized
const MAX_MARGIN_PAD = 30;
const ANIMATION_TIME = 1000;
const MIN_HEIGHT_FOR_BRUSH = 480;

const BREAKPOINTS = {
  small: 340,
};

const TIMESERIES_VIZ_TYPES = [
  'line',
  'dual_line',
  'line_multi',
  'area',
  'compare',
  'bar',
  'time_pivot',
];

const numberOrAutoType = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.oneOf(['auto']),
]);

const stringOrObjectWithLabelType = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.shape({
    label: PropTypes.string,
  }),
]);

const propTypes = {
  data: PropTypes.array,
  width: PropTypes.number,
  height: PropTypes.number,
  annotationData: PropTypes.object,
  bottomMargin: numberOrAutoType,
  colorScheme: PropTypes.string,
  isBarStacked: PropTypes.bool,
  leftMargin: numberOrAutoType,
  lineInterpolation: PropTypes.string,
  onError: PropTypes.func,
  orderBars: PropTypes.bool,
  reduceXTicks: PropTypes.bool,
  showBarValue: PropTypes.bool,
  showBrush: PropTypes.oneOf([true, false, 'auto']),
  showControls: PropTypes.bool,
  showLabels: PropTypes.bool,
  showLegend: PropTypes.bool,
  showMarkers: PropTypes.bool,
  useRichTooltip: PropTypes.bool,
  vizType: PropTypes.string,
  xAxisFormat: PropTypes.string,
  xAxisLabel: PropTypes.string,
  xAxisShowMinMax: PropTypes.bool,
  xIsLogScale: PropTypes.bool,
  xTicksLayout: PropTypes.oneOf(['auto', 'staggered', '45°']),
  yAxisFormat: PropTypes.string,
  yAxis2Format: PropTypes.string,
  yAxisBounds: PropTypes.arrayOf(PropTypes.number),
  yAxisLabel: PropTypes.string,
  yAxisShowMinMax: PropTypes.bool,
  yIsLogScale: PropTypes.bool,
  // Pie chart only
  isDonut: PropTypes.bool,
  isPieLabelOutside: PropTypes.bool,
  pieLabelType: PropTypes.string,
  // Area chart only
  areaStackedStyle: PropTypes.string,
  // Bubble chart only
  entity: PropTypes.string,
  maxBubbleSize: PropTypes.number,
  x: stringOrObjectWithLabelType,
  y: stringOrObjectWithLabelType,
  size: stringOrObjectWithLabelType,
};

const formatter = d3.format('.3s');

function nvd3Vis(element, props, slice) {
  PropTypes.checkPropTypes(propTypes, props, 'prop', 'NVD3Vis');

  const {
    data,
    width: maxWidth,
    height: maxHeight,
    annotationData,
    areaStackedStyle,
    bottomMargin,
    colorScheme,
    entity,
    isBarStacked,
    isDonut,
    isPieLabelOutside,
    leftMargin,
    lineInterpolation = 'linear',
    maxBubbleSize,
    onError = () => {},
    orderBars,
    pieLabelType,
    reduceXTicks = false,
    showBarValue,
    showBrush,
    showControls,
    showLabels,
    showLegend,
    showMarkers,
    size,
    useRichTooltip,
    vizType,
    x,
    xAxisFormat,
    xAxisLabel,
    xAxisShowMinMax = false,
    xIsLogScale,
    xTicksLayout,
    y,
    yAxisFormat,
    yAxis2Format,
    yAxisBounds,
    yAxisLabel,
    yAxisShowMinMax = false,
    yIsLogScale,
  } = props;

  const isExplore = document.querySelector('#explorer-container') !== null;
  const container = element;
  container.innerHTML = '';

  const fd = slice.formData;
  let chart;
  let width = maxWidth;
  let colorKey = 'key';
  let stacked = false;
  let row;

  function isVizTypes(types) {
    return types.indexOf(vizType) >= 0;
  }

  const drawGraph = function () {
    const $element = d3.select(element);
    let svg = $element.select('svg');
    if (svg.empty()) {
      svg = $element.append('svg');
    }
    let height = maxHeight;
    const isTimeSeries = isVizTypes(TIMESERIES_VIZ_TYPES);

    // Handling xAxis ticks settings
    const staggerLabels = xTicksLayout === 'staggered';
    const xLabelRotation =
      ((xTicksLayout === 'auto' && isVizTypes(['column', 'dist_bar']))
      || xTicksLayout === '45°')
      ? 45 : 0;
    if (xLabelRotation === 45 && isTruthy(showBrush)) {
      onError(t('You cannot use 45° tick layout along with the time range filter'));
      return null;
    }

    const canShowBrush = (
      isTruthy(showBrush) ||
      (showBrush === 'auto' && height >= MIN_HEIGHT_FOR_BRUSH && xTicksLayout !== '45°')
    );

    switch (vizType) {
      case 'line':
        if (canShowBrush) {
          chart = nv.models.lineWithFocusChart();
          if (staggerLabels) {
            // Give a bit more room to focus area if X axis ticks are staggered
            chart.focus.margin({ bottom: 40 });
            chart.focusHeight(80);
          }
          chart.focus.xScale(d3.time.scale.utc());
        } else {
          chart = nv.models.lineChart();
        }
        chart.xScale(d3.time.scale.utc());
        chart.interpolate(lineInterpolation);
        break;

      case 'time_pivot':
        chart = nv.models.lineChart();
        chart.xScale(d3.time.scale.utc());
        chart.interpolate(lineInterpolation);
        break;

      case 'dual_line':
      case 'line_multi':
        chart = nv.models.multiChart();
        chart.interpolate(lineInterpolation);
        break;

      case 'bar':
        chart = nv.models.multiBarChart()
        .showControls(showControls)
        .groupSpacing(0.1);

        if (!reduceXTicks) {
          width = computeBarChartWidth(data, isBarStacked, maxWidth);
        }
        chart.width(width);
        chart.xAxis
        .showMaxMin(false);

        stacked = isBarStacked;
        chart.stacked(stacked);

        if (showBarValue) {
          setTimeout(function () {
            addTotalBarValues(svg, chart, data, stacked, yAxisFormat);
          }, ANIMATION_TIME);
        }
        break;

      case 'dist_bar':
        chart = nv.models.multiBarChart()
        .showControls(showControls)
        .reduceXTicks(reduceXTicks)
        .groupSpacing(0.1); // Distance between each group of bars.

        chart.xAxis.showMaxMin(false);

        stacked = isBarStacked;
        chart.stacked(stacked);
        if (orderBars) {
          data.forEach((d) => {
            d.values.sort((a, b) => tryNumify(a.x) < tryNumify(b.x) ? -1 : 1);
          });
        }
        if (showBarValue) {
          setTimeout(function () {
            addTotalBarValues(svg, chart, data, stacked, yAxisFormat);
          }, ANIMATION_TIME);
        }
        if (!reduceXTicks) {
          width = computeBarChartWidth(data, isBarStacked, maxWidth);
        }
        chart.width(width);
        break;

      case 'pie':
        chart = nv.models.pieChart();
        colorKey = 'x';
        chart.valueFormat(formatter);
        if (isDonut) {
          chart.donut(true);
        }
        chart.showLabels(showLabels);
        chart.labelsOutside(isPieLabelOutside);
        chart.labelThreshold(0.05);  // Configure the minimum slice size for labels to show up
        chart.cornerRadius(true);

        if (pieLabelType !== 'key_percent' && pieLabelType !== 'key_value') {
          chart.labelType(pieLabelType);
        } else if (pieLabelType === 'key_value') {
          chart.labelType(d => `${d.data.x}: ${d3.format('.3s')(d.data.y)}`);
        }

        if (pieLabelType === 'percent' || pieLabelType === 'key_percent') {
          const total = d3.sum(data, d => d.y);
          chart.tooltip.valueFormatter(d => `${((d / total) * 100).toFixed()}%`);
          if (pieLabelType === 'key_percent') {
            chart.labelType(d => `${d.data.x}: ${((d.data.y / total) * 100).toFixed()}%`);
          }
        }

        break;

      case 'column':
        chart = nv.models.multiBarChart()
          .reduceXTicks(false);
        break;

      case 'compare':
        chart = nv.models.cumulativeLineChart();
        chart.xScale(d3.time.scale.utc());
        chart.useInteractiveGuideline(true);
        chart.xAxis.showMaxMin(false);
        break;

      case 'bubble':
        row = (col1, col2) => `<tr><td>${col1}</td><td>${col2}</td></tr>`;
        chart = nv.models.scatterChart();
        chart.showDistX(true);
        chart.showDistY(true);
        chart.tooltip.contentGenerator(function (obj) {
          const p = obj.point;
          const yAxisFormatter = d3FormatPreset(yAxisFormat);
          const xAxisFormatter = d3FormatPreset(xAxisFormat);
          let s = '<table>';
          s += (
            `<tr><td style="color: ${p.color};">` +
              `<strong>${p[entity]}</strong> (${p.group})` +
            '</td></tr>');
          s += row(getLabel(x), xAxisFormatter(p.x));
          s += row(getLabel(y), yAxisFormatter(p.y));
          s += row(getLabel(size), formatter(p.size));
          s += '</table>';
          return s;
        });
        chart.pointRange([5, maxBubbleSize ** 2]);
        chart.pointDomain([0, d3.max(data, d => d3.max(d.values, v => v.size))]);
        break;

      case 'area':
        chart = nv.models.stackedAreaChart();
        chart.showControls(showControls);
        chart.style(areaStackedStyle);
        chart.xScale(d3.time.scale.utc());
        break;

      case 'box_plot':
        colorKey = 'label';
        chart = nv.models.boxPlotChart();
        chart.x(d => d.label);
        chart.maxBoxWidth(75); // prevent boxes from being incredibly wide
        break;

      case 'bullet':
        chart = nv.models.bulletChart();
        break;

      default:
        throw new Error('Unrecognized visualization for nvd3' + vizType);
    }

    if (canShowBrush && isTruthy(fd.send_time_range)) {
      chart.focus.dispatch.on('brush', (event) => {
        const extent = event.extent;
        if (extent.some(d => d.toISOString === undefined)) {
          return;
        }
        const timeRange = extent.map(d => d.toISOString().slice(0, -1)).join(' : ');
        event.brush.on('brushend', () => slice.addFilter('__time_range', timeRange, false, true));
      });
    }

    if (chart.xAxis && chart.xAxis.staggerLabels) {
      chart.xAxis.staggerLabels(staggerLabels);
    }
    if (chart.xAxis && chart.xAxis.rotateLabels) {
      chart.xAxis.rotateLabels(xLabelRotation);
    }
    if (chart.x2Axis && chart.x2Axis.staggerLabels) {
      chart.x2Axis.staggerLabels(staggerLabels);
    }
    if (chart.x2Axis && chart.x2Axis.rotateLabels) {
      chart.x2Axis.rotateLabels(xLabelRotation);
    }

    if ('showLegend' in chart && typeof showLegend !== 'undefined') {
      if (width < BREAKPOINTS.small && vizType !== 'pie') {
        chart.showLegend(false);
      } else {
        chart.showLegend(showLegend);
      }
    }

    if (vizType === 'bullet') {
      height = Math.min(height, 50);
    }

    if (chart.forceY && yAxisBounds &&
        (yAxisBounds[0] !== null || yAxisBounds[1] !== null)) {
      chart.forceY(yAxisBounds);
    }
    if (yIsLogScale) {
      chart.yScale(d3.scale.log());
    }
    if (xIsLogScale) {
      chart.xScale(d3.scale.log());
    }

    let xAxisFormatter = d3FormatPreset(xAxisFormat);
    if (isTimeSeries) {
      xAxisFormatter = d3TimeFormatPreset(xAxisFormat);
      // In tooltips, always use the verbose time format
      chart.interactiveLayer.tooltip.headerFormatter(formatDateVerbose);
    }
    if (chart.x2Axis && chart.x2Axis.tickFormat) {
      chart.x2Axis.tickFormat(xAxisFormatter);
    }
    const isXAxisString = ['dist_bar', 'box_plot'].indexOf(vizType) >= 0;
    if (!isXAxisString && chart.xAxis && chart.xAxis.tickFormat) {
      chart.xAxis.tickFormat(xAxisFormatter);
    }

    let yAxisFormatter = d3FormatPreset(yAxisFormat);
    if (chart.yAxis && chart.yAxis.tickFormat) {
      if (fd.contribution || fd.comparison_type === 'percentage') {
        // When computing a "Percentage" or "Contribution" selected, we force a percentage format
        yAxisFormatter = d3.format('.1%');
      }
      chart.yAxis.tickFormat(yAxisFormatter);
    }
    if (chart.y2Axis && chart.y2Axis.tickFormat) {
      chart.y2Axis.tickFormat(yAxisFormatter);
    }

    if (chart.yAxis) {
      chart.yAxis.ticks(5);
    }
    if (chart.y2Axis) {
      chart.y2Axis.ticks(5);
    }

    // Set showMaxMin for all axis
    function setAxisShowMaxMin(axis, showminmax) {
      if (axis && axis.showMaxMin && showminmax !== undefined) {
        axis.showMaxMin(showminmax);
      }
    }

    setAxisShowMaxMin(chart.xAxis, xAxisShowMinMax);
    setAxisShowMaxMin(chart.x2Axis, xAxisShowMinMax);
    setAxisShowMaxMin(chart.yAxis, yAxisShowMinMax);
    setAxisShowMaxMin(chart.y2Axis, yAxisShowMinMax);

    if (vizType === 'time_pivot') {
      chart.color((d) => {
        const c = fd.color_picker;
        let alpha = 1;
        if (d.rank > 0) {
          alpha = d.perc * 0.5;
        }
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
      });
    } else if (vizType !== 'bullet') {
      chart.color(d => d.color || getColorFromScheme(d[colorKey], colorScheme));
    }
    if ((vizType === 'line' || vizType === 'area') && useRichTooltip) {
      chart.useInteractiveGuideline(true);
      if (vizType === 'line') {
        // Custom sorted tooltip
        // use a verbose formatter for times
        chart.interactiveLayer.tooltip.contentGenerator((d) => {
          let tooltip = '';
          tooltip += "<table><thead><tr><td colspan='3'>"
            + `<strong class='x-value'>${formatDateVerbose(d.value)}</strong>`
            + '</td></tr></thead><tbody>';
          d.series.sort((a, b) => a.value >= b.value ? -1 : 1);
          d.series.forEach((series) => {
            tooltip += (
              `<tr class="${series.highlight ? 'emph' : ''}">` +
                `<td class='legend-color-guide' style="opacity: ${series.highlight ? '1' : '0.75'};"">` +
                  '<div ' +
                    `style="border: 2px solid ${series.highlight ? 'black' : 'transparent'}; background-color: ${series.color};"` +
                  '></div>' +
                '</td>' +
                `<td>${dompurify.sanitize(series.key)}</td>` +
                `<td>${yAxisFormatter(series.value)}</td>` +
              '</tr>'
            );
          });
          tooltip += '</tbody></table>';
          return tooltip;
        });
      }
    }

    if (isVizTypes(['dual_line', 'line_multi'])) {
      const yAxisFormatter1 = d3.format(yAxisFormat);
      const yAxisFormatter2 = d3.format(yAxis2Format);
      chart.yAxis1.tickFormat(yAxisFormatter1);
      chart.yAxis2.tickFormat(yAxisFormatter2);
      const yAxisFormatters = data.map(datum => (
        datum.yAxis === 1 ? yAxisFormatter1 : yAxisFormatter2));
      customizeToolTip(chart, xAxisFormatter, yAxisFormatters);
      if (vizType === 'dual_line') {
        chart.showLegend(width > BREAKPOINTS.small);
      } else {
        chart.showLegend(showLegend);
      }
    }
    // This is needed for correct chart dimensions if a chart is rendered in a hidden container
    chart.width(width);
    chart.height(height);
    slice.container.css('height', height + 'px');

    svg
    .datum(data)
    .transition().duration(500)
    .attr('height', height)
    .attr('width', width)
    .call(chart);

    // align yAxis1 and yAxis2 ticks
    if (isVizTypes(['dual_line', 'line_multi'])) {
      const count = chart.yAxis1.ticks();
      const ticks1 = chart.yAxis1.scale().domain(chart.yAxis1.domain()).nice(count).ticks(count);
      const ticks2 = chart.yAxis2.scale().domain(chart.yAxis2.domain()).nice(count).ticks(count);

      // match number of ticks in both axes
      const difference = ticks1.length - ticks2.length;
      if (ticks1.length && ticks2.length && difference !== 0) {
        const smallest = difference < 0 ? ticks1 : ticks2;
        const delta = smallest[1] - smallest[0];
        for (let i = 0; i < Math.abs(difference); i++) {
          if (i % 2 === 0) {
            smallest.unshift(smallest[0] - delta);
          } else {
            smallest.push(smallest[smallest.length - 1] + delta);
          }
        }
        chart.yDomain1([ticks1[0], ticks1[ticks1.length - 1]]);
        chart.yDomain2([ticks2[0], ticks2[ticks2.length - 1]]);
        chart.yAxis1.tickValues(ticks1);
        chart.yAxis2.tickValues(ticks2);
      }
    }

    if (showMarkers) {
      svg.selectAll('.nv-point')
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);
    }

    if (chart.yAxis !== undefined || chart.yAxis2 !== undefined) {
      // Hack to adjust y axis left margin to accommodate long numbers
      const containerWidth = slice.container.width();
      const marginPad = Math.ceil(
        Math.min(isExplore ? containerWidth * 0.01 : containerWidth * 0.03, MAX_MARGIN_PAD),
      );
      const maxYAxisLabelWidth = chart.yAxis2 ? getMaxLabelSize(slice.container, 'nv-y1')
                                              : getMaxLabelSize(slice.container, 'nv-y');
      const maxXAxisLabelHeight = getMaxLabelSize(slice.container, 'nv-x');
      chart.margin({ left: maxYAxisLabelWidth + marginPad });
      if (yAxisLabel && yAxisLabel !== '') {
        chart.margin({ left: maxYAxisLabelWidth + marginPad + 25 });
      }
      // Hack to adjust margins to accommodate long axis tick labels.
      // - has to be done only after the chart has been rendered once
      // - measure the width or height of the labels
      // ---- (x axis labels are rotated 45 degrees so we use height),
      // - adjust margins based on these measures and render again
      const margins = chart.margin();
      margins.bottom = 28;
      if (xAxisShowMinMax) {
        // If x bounds are shown, we need a right margin
        margins.right = Math.max(20, maxXAxisLabelHeight / 2) + marginPad;
      }
      if (xLabelRotation === 45) {
        margins.bottom = maxXAxisLabelHeight + marginPad;
        margins.right = maxXAxisLabelHeight + marginPad;
      } else if (staggerLabels) {
        margins.bottom = 40;
      }

      if (['dual_line', 'line_multi'].indexOf(vizType) >= 0) {
        const maxYAxis2LabelWidth = getMaxLabelSize(slice.container, 'nv-y2');
        margins.right = maxYAxis2LabelWidth + marginPad;
      }
      if (bottomMargin && bottomMargin !== 'auto') {
        margins.bottom = parseInt(bottomMargin, 10);
      }
      if (leftMargin && leftMargin !== 'auto') {
        margins.left = leftMargin;
      }

      if (xAxisLabel && xAxisLabel !== '' && chart.xAxis) {
        margins.bottom += 25;
        let distance = 0;
        if (margins.bottom && !Number.isNaN(margins.bottom)) {
          distance = margins.bottom - 45;
        }
        // nvd3 bug axisLabelDistance is disregarded on xAxis
        // https://github.com/krispo/angular-nvd3/issues/90
        chart.xAxis.axisLabel(xAxisLabel).axisLabelDistance(distance);
      }

      if (yAxisLabel && yAxisLabel !== '' && chart.yAxis) {
        let distance = 0;
        if (margins.left && !Number.isNaN(margins.left)) {
          distance = margins.left - 70;
        }
        chart.yAxis.axisLabel(yAxisLabel).axisLabelDistance(distance);
      }

      const annotationLayers = (slice.formData.annotation_layers || []).filter(x => x.show);
      if (isTimeSeries && annotationLayers && annotationData) {
        // Time series annotations add additional data
        const timeSeriesAnnotations = annotationLayers
          .filter(a => a.annotationType === AnnotationTypes.TIME_SERIES).reduce((bushel, a) =>
        bushel.concat((annotationData[a.name] || []).map((series) => {
          if (!series) {
            return {};
          }
          const key = Array.isArray(series.key) ?
            `${a.name}, ${series.key.join(', ')}` : `${a.name}, ${series.key}`;
          return {
            ...series,
            key,
            color: a.color,
            strokeWidth: a.width,
            classed: `${a.opacity} ${a.style} nv-timeseries-annotation-layer showMarkers${a.showMarkers} hideLine${a.hideLine}`,
          };
        })), []);
        data.push(...timeSeriesAnnotations);
      }

      // render chart
      svg
      .datum(data)
      .transition().duration(500)
      .attr('width', width)
      .attr('height', height)
      .call(chart);

      // on scroll, hide tooltips. throttle to only 4x/second.
      window.addEventListener('scroll', throttle(hideTooltips, 250));

      // The below code should be run AFTER rendering because chart is updated in call()
      if (isTimeSeries && annotationLayers) {
        // Formula annotations
        const formulas = annotationLayers.filter(a => a.annotationType === AnnotationTypes.FORMULA)
          .map(a => ({ ...a, formula: mathjs.parse(a.value) }));

        let xMax;
        let xMin;
        let xScale;
        if (vizType === VIZ_TYPES.bar) {
          xMin = d3.min(data[0].values, d => (d.x));
          xMax = d3.max(data[0].values, d => (d.x));
          xScale = d3.scale.quantile()
            .domain([xMin, xMax])
            .range(chart.xAxis.range());
        } else {
          xMin = chart.xAxis.scale().domain()[0].valueOf();
          xMax = chart.xAxis.scale().domain()[1].valueOf();
          if (chart.xScale) {
            xScale = chart.xScale();
          } else if (chart.xAxis.scale) {
            xScale = chart.xAxis.scale();
          } else {
            xScale = d3.scale.linear();
          }
        }
        if (xScale && xScale.clamp) {
          xScale.clamp(true);
        }

        if (Array.isArray(formulas) && formulas.length) {
          const xValues = [];
          if (vizType === VIZ_TYPES.bar) {
            // For bar-charts we want one data point evaluated for every
            // data point that will be displayed.
            const distinct = data.reduce((xVals, d) => {
              d.values.forEach(x => xVals.add(x.x));
              return xVals;
            }, new Set());
            xValues.push(...distinct.values());
            xValues.sort();
          } else {
            // For every other time visualization it should be ok, to have a
            // data points in even intervals.
            let period = Math.min(...data.map(d =>
              Math.min(...d.values.slice(1).map((v, i) => v.x - d.values[i].x))));
            const dataPoints = (xMax - xMin) / (period || 1);
            // make sure that there are enough data points and not too many
            period = dataPoints < 100 ? (xMax - xMin) / 100 : period;
            period = dataPoints > 500 ? (xMax - xMin) / 500 : period;
            xValues.push(xMin);
            for (let x = xMin; x < xMax; x += period) {
              xValues.push(x);
            }
            xValues.push(xMax);
          }
          const formulaData = formulas.map(fo => ({
            key: fo.name,
            values: xValues.map((x => ({ y: fo.formula.eval({ x }), x }))),
            color: fo.color,
            strokeWidth: fo.width,
            classed: `${fo.opacity} ${fo.style}`,
          }));
          data.push(...formulaData);
        }
        const xAxis = chart.xAxis1 ? chart.xAxis1 : chart.xAxis;
        const yAxis = chart.yAxis1 ? chart.yAxis1 : chart.yAxis;
        const chartWidth = xAxis.scale().range()[1];
        const annotationHeight = yAxis.scale().range()[0];
        const tipFactory = layer => d3tip()
          .attr('class', 'd3-tip')
          .direction('n')
          .offset([-5, 0])
          .html((d) => {
            if (!d) {
              return '';
            }
            const title = d[layer.titleColumn] && d[layer.titleColumn].length ?
              d[layer.titleColumn] + ' - ' + layer.name :
              layer.name;
            const body = Array.isArray(layer.descriptionColumns) ?
              layer.descriptionColumns.map(c => d[c]) : Object.values(d);
            return '<div><strong>' + title + '</strong></div><br/>' +
              '<div>' + body.join(', ') + '</div>';
          });

        if (annotationData) {
          // Event annotations
          annotationLayers.filter(x => (
            x.annotationType === AnnotationTypes.EVENT &&
            annotationData && annotationData[x.name]
          )).forEach((config, index) => {
            const e = applyNativeColumns(config);
            // Add event annotation layer
            const annotations = d3.select(element)
              .select('.nv-wrap')
              .append('g')
              .attr('class', `nv-event-annotation-layer-${index}`);
            const aColor = e.color || getColorFromScheme(e.name, colorScheme);

            const tip = tipFactory(e);
            const records = (annotationData[e.name].records || []).map((r) => {
              const timeValue = new Date(moment.utc(r[e.timeColumn]));

              return {
                ...r,
                [e.timeColumn]: timeValue,
              };
            }).filter(record => !Number.isNaN(record[e.timeColumn].getMilliseconds()));

            if (records.length) {
              annotations.selectAll('line')
                .data(records)
                .enter()
                .append('line')
                .attr({
                  x1: d => xScale(new Date(d[e.timeColumn])),
                  y1: 0,
                  x2: d => xScale(new Date(d[e.timeColumn])),
                  y2: annotationHeight,
                })
                .attr('class', `${e.opacity} ${e.style}`)
                .style('stroke', aColor)
                .style('stroke-width', e.width)
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .call(tip);
            }

            // update annotation positions on brush event
            chart.focus.dispatch.on('onBrush.event-annotation', function () {
              annotations.selectAll('line')
                .data(records)
                .attr({
                  x1: d => xScale(new Date(d[e.timeColumn])),
                  y1: 0,
                  x2: d => xScale(new Date(d[e.timeColumn])),
                  y2: annotationHeight,
                  opacity: (d) => {
                    const x = xScale(new Date(d[e.timeColumn]));
                    return (x > 0) && (x < chartWidth) ? 1 : 0;
                  },
                });
            });
          });

          // Interval annotations
          annotationLayers.filter(x => (
            x.annotationType === AnnotationTypes.INTERVAL &&
            annotationData && annotationData[x.name]
          )).forEach((config, index) => {
            const e = applyNativeColumns(config);
            // Add interval annotation layer
            const annotations = d3.select(element)
              .select('.nv-wrap')
              .append('g')
              .attr('class', `nv-interval-annotation-layer-${index}`);

            const aColor = e.color || getColorFromScheme(e.name, colorScheme);
            const tip = tipFactory(e);

            const records = (annotationData[e.name].records || []).map((r) => {
              const timeValue = new Date(moment.utc(r[e.timeColumn]));
              const intervalEndValue = new Date(moment.utc(r[e.intervalEndColumn]));
              return {
                ...r,
                [e.timeColumn]: timeValue,
                [e.intervalEndColumn]: intervalEndValue,
              };
            }).filter(record => (
              !Number.isNaN(record[e.timeColumn].getMilliseconds()) &&
              !Number.isNaN(record[e.intervalEndColumn].getMilliseconds())
            ));

            if (records.length) {
              annotations.selectAll('rect')
                .data(records)
                .enter()
                .append('rect')
                .attr({
                  x: d => Math.min(xScale(new Date(d[e.timeColumn])),
                    xScale(new Date(d[e.intervalEndColumn]))),
                  y: 0,
                  width: d => Math.max(Math.abs(xScale(new Date(d[e.intervalEndColumn])) -
                    xScale(new Date(d[e.timeColumn]))), 1),
                  height: annotationHeight,
                })
                .attr('class', `${e.opacity} ${e.style}`)
                .style('stroke-width', e.width)
                .style('stroke', aColor)
                .style('fill', aColor)
                .style('fill-opacity', 0.2)
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .call(tip);
            }

            // update annotation positions on brush event
            chart.focus.dispatch.on('onBrush.interval-annotation', function () {
              annotations.selectAll('rect')
                .data(records)
                .attr({
                  x: d => xScale(new Date(d[e.timeColumn])),
                  width: (d) => {
                    const x1 = xScale(new Date(d[e.timeColumn]));
                    const x2 = xScale(new Date(d[e.intervalEndColumn]));
                    return x2 - x1;
                  },
                });
            });
          });
        }

        // rerender chart appended with annotation layer
        svg.datum(data)
          .attr('height', height)
          .attr('width', width)
          .call(chart);

        // Display styles for Time Series Annotations
        d3.selectAll('.slice_container .nv-timeseries-annotation-layer.showMarkerstrue .nv-point')
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);
        d3.selectAll('.slice_container .nv-timeseries-annotation-layer.hideLinetrue')
          .style('stroke-width', 0);
      }
    }

    wrapTooltip(chart, slice.container);
    return chart;
  };

  // hide tooltips before rendering chart, if the chart is being re-rendered sometimes
  // there are left over tooltips in the dom,
  // this will clear them before rendering the chart again.
  hideTooltips();

  nv.addGraph(drawGraph);
}

nvd3Vis.propTypes = propTypes;

function adaptor(slice, payload) {
  const { formData, datasource, selector, annotationData } = slice;
  const {
    bar_stacked: isBarStacked,
    bottom_margin: bottomMargin,
    color_scheme: colorScheme,
    donut: isDonut,
    entity,
    labels_outside: isPieLabelOutside,
    left_margin: leftMargin,
    line_interpolation: lineInterpolation,
    max_bubble_size: maxBubbleSize,
    order_bars: orderBars,
    pie_label_type: pieLabelType,
    reduce_x_ticks: reduceXTicks,
    rich_tooltip: useRichTooltip,
    show_bar_value: showBarValue,
    show_brush: showBrush,
    show_controls: showControls,
    show_labels: showLabels,
    show_legend: showLegend,
    show_markers: showMarkers,
    size,
    stacked_style: areaStackedStyle,
    viz_type: vizType,
    x,
    x_axis_format: xAxisFormat,
    x_axis_label: xAxisLabel,
    x_axis_showminmax: xAxisShowMinMax,
    x_log_scale: xIsLogScale,
    x_ticks_layout: xTicksLayout,
    y,
    y_axis_format: yAxisFormat,
    y_axis_2_format: yAxis2Format,
    y_axis_bounds: yAxisBounds,
    y_axis_label: yAxisLabel,
    y_axis_showminmax: yAxisShowMinMax,
    y_log_scale: yIsLogScale,
  } = formData;

  const element = document.querySelector(selector);

  const rawData = payload.data || [];
  const data = Array.isArray(rawData)
    ? rawData.map(x => ({
      ...x,
      key: formatLabel(x.key, datasource.verbose_map),
    }))
    : rawData;

  const props = {
    data,
    width: slice.width(),
    height: slice.height(),
    annotationData,
    areaStackedStyle,
    bottomMargin,
    colorScheme,
    entity,
    isBarStacked,
    isDonut,
    isPieLabelOutside,
    leftMargin,
    lineInterpolation,
    maxBubbleSize,
    onError(err) { slice.error(err); },
    orderBars,
    pieLabelType,
    reduceXTicks,
    showBarValue,
    showBrush,
    showControls,
    showLabels,
    showLegend,
    showMarkers,
    size,
    useRichTooltip,
    vizType,
    x,
    xAxisFormat,
    xAxisLabel,
    xAxisShowMinMax,
    xIsLogScale,
    xTicksLayout,
    y,
    yAxisFormat,
    yAxis2Format,
    yAxisBounds,
    yAxisLabel,
    yAxisShowMinMax,
    yIsLogScale,
  };

  slice.clearError();

  return nvd3Vis(element, props, slice);
}

export default adaptor;
