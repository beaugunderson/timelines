'use strict';

var d3 = require('d3');
var fs = require('fs');
var moment = require('moment');
var yaml = require('js-yaml');
var $ = require('jquery');
var _ = require('lodash');

require('d3-layout-timeline');

function makeAgeYears() {
  var years = [];

  for (var i = 1982; i < 2082; i++) {
    years.push({
      name: String(i - 1982),
      start: new Date(`12/27/${i}`),
      end: new Date(`12/26/${i + 1}`)
    });
  }

  return years;
}

function makeYears() {
  var years = [];

  for (var i = 1900; i < 2100; i++) {
    years.push({
      name: String(i),
      start: new Date(`1/1/${i}`),
      end: new Date(`12/31/${i}`)
    });
  }

  return years;
}

function makeDecades() {
  var decades = [];

  for (var i = 1900; i < 2100; i += 10) {
    decades.push({
      name: i + 's',
      start: new Date(`1/1/${i}`),
      end: new Date(`12/31/${i + 9}`)
    });
  }

  return decades;
}

var types = [
  'Presidents',
  'World Events',
  'Year Decades',
  'Years',
  'Life Decades',
  'Age Years',
  'Lifespan',
  'Addresses',
  'People',
  'Pets',
  'Boat',
  'Relationships',
  'Computers',
  'Phones',
  'IM',
  'Websites',
  'Schools',
  'Jobs',
  'Twitter bots',
  'Trips'
];

// TODO: gradients for estimated times
// TODO: add hiding of lanes
// TODO: snap x axis to day boundary so there are no gaps?

var colorScale = d3.scale.ordinal()
  .domain(types)
  .range(['#ccc', '#999']);

var WIDTH = $('svg').width();
var HEIGHT = $('svg').height();

var START = new Date('12/27/1982');
var END = new Date();

var timeline = d3.layout.timeline()
  .size([WIDTH, 200])
  .extent([START, END])
  .padding(3)
  .maxBandHeight(24);

var data = {
  // TODO: load these all automatically; specify key in YAML?
  Addresses: yaml.safeLoad(fs.readFileSync('./timelines/addresses.yml', 'utf8')),
  Boat: yaml.safeLoad(fs.readFileSync('./timelines/boat.yml', 'utf8')),
  Computers: yaml.safeLoad(fs.readFileSync('./timelines/computers.yml', 'utf8')),
  Phones: yaml.safeLoad(fs.readFileSync('./timelines/phones.yml', 'utf8')),
  People: yaml.safeLoad(fs.readFileSync('./timelines/people.yml', 'utf8')),
  IM: yaml.safeLoad(fs.readFileSync('./timelines/im.yml', 'utf8')),
  Jobs: yaml.safeLoad(fs.readFileSync('./timelines/jobs.yml', 'utf8')),
  'Life Decades': yaml.safeLoad(fs.readFileSync('./timelines/life-decades.yml', 'utf8')),
  'Lifespan': yaml.safeLoad(fs.readFileSync('./timelines/lifespan.yml', 'utf8')),
  Pets: yaml.safeLoad(fs.readFileSync('./timelines/pets.yml', 'utf8')),
  Presidents: yaml.safeLoad(fs.readFileSync('./timelines/presidents.yml', 'utf8')),
  Relationships: yaml.safeLoad(fs.readFileSync('./timelines/relationships.yml', 'utf8')),
  Trips: yaml.safeLoad(fs.readFileSync('./timelines/trips.yml', 'utf8')),
  'Twitter bots': yaml.safeLoad(fs.readFileSync('./timelines/twitter-bots.yml', 'utf8')),
  Schools: yaml.safeLoad(fs.readFileSync('./timelines/schools.yml', 'utf8')),
  Websites: yaml.safeLoad(fs.readFileSync('./timelines/websites.yml', 'utf8')),
  'World Events': yaml.safeLoad(fs.readFileSync('./timelines/world-events.yml', 'utf8')),

  // auto-generated
  'Year Decades': makeDecades(),
  'Age Years': makeAgeYears(),
  Years: makeYears()
};

var textColors = {
  Presidents: 'white'
};

// TODO: add scales to the YAML files?
var scales = {
  Presidents: {
    attribute: 'name',
    scale: d3.scale.ordinal()
      .domain(_.map(data.Presidents, 'name'))
      .range(['#e91d0e', '#e91d0e', '#232066', '#e91d0e', '#232066', '#e91d0e', '#232066'])
  },
  Jobs: {
    attribute: 'type',
    scale: d3.scale.ordinal()
      .domain(['employee', 'freelance', 'temporary'])
      .range(['lightgreen', 'orange', 'lightgray'])
  },
  Addresses: {
    attribute: 'state',
    scale: d3.scale.ordinal()
      .domain(['WA', 'CA', 'None'])
      .range(['lightblue', 'lightyellow', 'lightgray'])
  }
};

window.data = data;
window.d3 = d3;

var lastHeight = 0;

var x = d3.time.scale()
  .domain([START, END])
  .range([0, WIDTH]);

var y = d3.scale.linear()
  .domain([0, HEIGHT])
  .range([0, HEIGHT]);

var labelSelectors = [];
var bandSelectors = [];
var timelineLabelSelectors = [];

function labelX(d) {
  if (x(d.originalStart) < 0 &&
      x(d.originalEnd) > 175 + this.getComputedTextLength()) {
    return 175;
  }

  return (x(d.originalStart) + x(d.originalEnd)) / 2;
}

function labelOpacity(d) {
  return (x(d.originalEnd) - x(d.originalStart)) >
    this.getComputedTextLength() ? 1 : 0;
}

var lastY = 0;

var zoom = d3.behavior.zoom()
  .x(x)
  .scaleExtent([-1, 500])
  .size([WIDTH, HEIGHT]);

zoom.on('zoom', () => {
  var translateY;

  axisElement.call(axis);

  // update the label scale when we zoom in/out
  updateLabel(d3.mouse(svg[0][0])[0]);

  // this code disables y-axis zoom in a kludge-y way
  if (d3.event.sourceEvent.type === 'mousemove') {
    translateY = d3.event.translate[1];
    lastY = translateY;
  } else {
    translateY = lastY;
    zoom.translate([d3.event.translate[0], translateY]);
  }

  bandSelectors.forEach(selector => {
    selector.attr('x', d => x(d.originalStart));
    selector.attr('y', d => y(d.y + translateY));
    selector.attr('width', d => x(d.originalEnd) - x(d.originalStart));
  });

  labelSelectors.forEach(selector => {
    selector.attr('x', labelX);
    selector.attr('y', d => y(d.y + 5 + translateY + (d.dy / 2)));
    selector.style('opacity', labelOpacity);
    selector.style('text-anchor',
      d => x(d.originalStart) < 0 ? 'start' : 'middle',
      'important');
  });

  timelineLabelSelectors.forEach(
    (selector, i) => selector.attr('y', y(18 + offsets[i] + translateY)));
});

var svg = d3.select('svg').call(zoom);

var offsets = [];

types.forEach(function (type) {
  data[type] = data[type].map(d => {
    if (d.end === 'present') {
      d.end = new Date();
    }

    return d;
  });

  data[type] = data[type].filter(d => d.start && d.end);

  var bands = _(timeline(data[type])).sortBy('start').value();
  var offset = lastHeight;
  var lowest = _.maxBy(bands, 'y');

  offsets.push(offset);

  lastHeight += lowest.y + lowest.dy + 2;

  var g = svg.append('g')
    .attr('transform', `translate(0,${offset})`);

  var b = g.selectAll('rect')
    .data(bands)
    .enter()
    .append('rect')
    .attr('x', d => x(d.originalStart))
    .attr('y', d => y(d.y))
    .attr('height', d => d.dy)
    .attr('width', d => x(d.originalEnd) - x(d.originalStart))
    .style('fill', d => {
      if (scales[type]) {
        return scales[type].scale(d[scales[type].attribute]);
      }

      return colorScale(type);
    })
    .style('stroke', 'black')
    .style('stroke-width', 1);
  // .on('mouseover', (d, di) => {
  //   g.selectAll('text.label')
  //     .style('opacity', (p, pi) => pi === di ? 1 : 0);
  // })
  // .on('mouseout', () => d3.selectAll('text.label').style('opacity', 0));

  var l = g.selectAll('text.label')
    .data(bands)
    .enter()
    .append('text')
    .text(d => d.shortName || d.name)
    .attr('class', 'label')
    .attr('x', labelX)
    .attr('y', d => y(d.y) + 5 + (y(d.dy) / 2))
    .style('fill', () => textColors[type] || 'black')
    .style('pointer-events', 'none')
    .style('text-anchor', d => x(d.originalStart) < 0 ? 'start' : 'middle')
    .style('font-family', 'Avenir Next Condensed')
    .style('font-size', '12px')
    .style('opacity', labelOpacity);

  bandSelectors.push(b);
  labelSelectors.push(l);

  var t = svg.append('text')
    .text(type)
    .attr('y', y(18 + offset))
    .attr('x', 20)
    .style('font-family', 'Avenir');

  timelineLabelSelectors.push(t);
});

var axis = d3.svg.axis()
  .scale(x)
  .orient('top');

svg.append('rect')
  .attr('y', HEIGHT - 50)
  .attr('width', WIDTH)
  .attr('height', 50)
  .attr('fill', 'white')
  .attr('fill-opacity', 0.8);

var axisElement = svg.append('g')
  .attr('class', 'axis')
  .attr('transform', `translate(0, ${HEIGHT})`)
  .call(axis);

var line = svg.append('line')
  .attr('class', 'mouse-line')
  .attr('y1', y.range()[0])
  .attr('y2', y.range()[1])
  .attr('stroke', 'black');

var label = svg.append('text')
  .attr('class', 'mouse-label')
  .style('fill', 'black')
  .style('font-size', '14px')
  .style('font-family', 'Avenir');

function updateLabel(mouseX) {
  var time = x.invert(mouseX);
  var timeX = x(time);

  var domain = axis.scale().domain();

  var start = moment(domain[0]);
  var end = moment(domain[1]);

  var difference = end.diff(start, 'days', true);

  if (difference > 365) {
    label.text(moment(time).format('MMMM YYYY'));
  } else if (difference > 28) {
    label.text(moment(time).format('MMMM Do YYYY'));
  } else {
    label.text(moment(time).format('MMMM Do YYYY, h:mm:ss a'));
  }

  label
    .attr('x', timeX + 10)
    .attr('y', HEIGHT - 30);

  line
    .attr('x1', timeX)
    .attr('x2', timeX);
}

svg.on('mousemove', function () {
  updateLabel(d3.mouse(this)[0]);
});
