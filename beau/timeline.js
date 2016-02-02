'use strict';

var d3 = require('d3');
var fs = require('fs');
var yaml = require('js-yaml');
var _ = require('lodash');

d3.layout.timeline = require('./vendor/d3.layout.timeline.js');

var types = [
  'Presidents', 'Year Decades', 'Years', 'Life Decades', 'Addresses',
  'People', 'Relationships', 'Computers', 'IM', 'Websites', 'Schools',
  'Jobs', 'Twitter bots', 'Trips'
];

// TODO: gradients for estimated times
// TODO: add vertical line that follows mouse
// TODO: add x axis
// TODO: add hiding of lanes
// TODO: add y panning

var colorScale = d3.scale.ordinal()
  .domain(types)
  .range(['#ccc', '#999']);

var WIDTH = 1220;

var timeline = d3.layout.timeline()
  .size([WIDTH, 200])
  .extent(['12/27/1981', '1/24/2017'])
  .padding(3)
  .maxBandHeight(24);

var data = {
  Addresses: yaml.safeLoad(fs.readFileSync('./timelines/addresses.yml', 'utf8')),
  // Areas: yaml.safeLoad(fs.readFileSync('./timelines/areas.yml', 'utf8')),
  Computers: yaml.safeLoad(fs.readFileSync('./timelines/computers.yml', 'utf8')),
  People: yaml.safeLoad(fs.readFileSync('./timelines/people.yml', 'utf8')),
  IM: yaml.safeLoad(fs.readFileSync('./timelines/im.yml', 'utf8')),
  Jobs: yaml.safeLoad(fs.readFileSync('./timelines/jobs.yml', 'utf8')),
  'Life Decades': yaml.safeLoad(fs.readFileSync('./timelines/life-decades.yml', 'utf8')),
  Presidents: yaml.safeLoad(fs.readFileSync('./timelines/presidents.yml', 'utf8')),
  Relationships: yaml.safeLoad(fs.readFileSync('./timelines/relationships.yml', 'utf8')),
  Trips: yaml.safeLoad(fs.readFileSync('./timelines/trips.yml', 'utf8')),
  'Twitter bots': yaml.safeLoad(fs.readFileSync('./timelines/twitter-bots.yml', 'utf8')),
  Schools: yaml.safeLoad(fs.readFileSync('./timelines/schools.yml', 'utf8')),
  Websites: yaml.safeLoad(fs.readFileSync('./timelines/websites.yml', 'utf8')),
  'Year Decades': yaml.safeLoad(fs.readFileSync('./timelines/year-decades.yml', 'utf8')),
  Years: yaml.safeLoad(fs.readFileSync('./timelines/years.yml', 'utf8'))
};

var textColors = {
  Presidents: 'white'
};

var scales = {
  Presidents: {
    attribute: 'name',
    scale: d3.scale.ordinal()
      .domain(_.map(data.Presidents, 'name'))
      .range(['#e91d0e', '#e91d0e', '#232066', '#e91d0e', '#232066'])
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

var lastHeight = 0;

var x = d3.scale.linear()
  .domain([0, WIDTH])
  .range([0, WIDTH]);

var labels = [];
var bandShapes = [];

function labelX(d) {
  if (x(d.start) < 0 && x(d.end) > 75 + this.getComputedTextLength()) {
    return 75;
  }

  return (x(d.start) + x(d.end)) / 2;
}

function labelOpacity(d) {
  return (x(d.end) - x(d.start)) > this.getComputedTextLength() ? 1 : 0;
}

d3.select('svg')
  .call(d3.behavior.zoom().x(x).scaleExtent([-1, 500]).on('zoom', () => {
    bandShapes.forEach(bandShape => {
      bandShape.attr('x', d => x(d.start));
      bandShape.attr('width', d => x(d.end) - x(d.start));
    });

    labels.forEach(label => {
      label.attr('x', labelX);
      label.style('opacity', labelOpacity);
      label.style('text-anchor', d => {
        if (x(d.start) < 0) {
          return 'start';
        }

        return 'middle';
      }, 'important');
    });
  }));

types.forEach(function (type) {
  data[type] = data[type].filter(d => {
    if (d.end === 'present') {
      d.end = new Date();
    }

    return d;
  });

  data[type] = data[type].filter(d => {
    return d.start && d.end;
  });

  var bands = timeline(data[type]);

  bands = _.sortBy(bands, 'start');

  // console.log(bands);

  var offset = lastHeight;
  var lowest = _.maxBy(bands, 'y');

  lastHeight += lowest.y + lowest.dy + 2;

  // console.log(type, lastHeight);

  // laneCounter += lanes;

  var g = d3.select('svg')
    .append('g')
      .attr('transform', `translate(100,${offset})`);

  var b = g.selectAll('rect')
    .data(bands)
    .enter()
      .append('rect')
      // .attr('rx', 2)
      .attr('x', d => x(d.start))
      .attr('y', d => d.y)
      .attr('height', d => d.dy)
      .attr('width', d => x(d.end) - x(d.start))
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
      .attr('y', d => d.y + 5 + (d.dy / 2))
      .style('fill', () => {
        return textColors[type] || 'black';
      })
      .style('pointer-events', 'none')
      .style('text-anchor', d => x(d.start) < 0 ? 'start' : 'middle')
      .style('font-family', 'Avenir Next Condensed')
      .style('font-size', '12px')
      .style('opacity', labelOpacity);

  bandShapes.push(b);
  labels.push(l);

  d3.select('svg')
    .append('text')
    .text(type)
    .attr('y', 18 + offset)
    .attr('x', 20)
    .style('font-family', 'Avenir');
});
