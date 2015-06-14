
var D3Event = require('./D3Event.js');
var D3EventProvider = require('./D3EventProvider.js');
var D3TimeInstant = require('./D3TimeInstant.js');
var D3Timespan = require('./D3Timespan.js');


function D3Timeline(container)
{
    this._container = container;  // a d3 selection to put the timeline into

    this._tableRowHeight = 23;
    this._barHeightPercentage = 0.8;
    this._tableMargins = {top: 30, right: 30, bottom: 30, left: 30};
    this._axisBottomMargin = 20;

    this._labelColumnWidth = null;
    this._width = null;
    this._height = null;
    this._xScale = null;
    this._yScale = null;

    this._fixedStartTime = null;
    this._fixedEndTime = null;

    this._eventProvider = new D3EventProvider();
}
var cls = D3Timeline.prototype;

cls.addEvent = function(event)
{
    this._eventProvider.addEvent(event);
};

cls.addEvents = function(events)
{
    for (var i = 0, len = events.length; i < len; i++) {
        this.addEvent(events[i]);
    }
};

/**
 * This is mostly just a convenience
 * @param {Array} timespansData An array of gcharts-timeline formatted timespans
 */
cls.setTimespans = function(timespansData)
{
    // break timespans into pairs of events
    for (var i = 0, len = timespansData.length; i < len; i++) {
        // timespan data is array of form [row name, span name, start time, end time, <optional user class>].
        var data = timespansData[i];
        var rowName = data[0];
        var spanName = data[1];
        var startTime = data[2];
        var endTime = data[3];
        var userClass = data[4];

        var startEvent = new D3Event({
            timestamp: startTime,
            type: D3Event.START,
            label: spanName,
            categoryName: rowName,
            userClass: userClass
        });

        var endEvent = new D3Event({
            timestamp: endTime,
            type: D3Event.END,
            label: spanName,
            categoryName: rowName,
            userClass: userClass
        });

        this._eventProvider.addMatchedEventPair(startEvent, endEvent);
    }
};

cls.setTimelineBounds = function(startTime, endTime) {
    this._fixedStartTime = startTime;
    this._fixedEndTime = endTime;
};

cls._parseTimelineData = function(timelineItems)
{
    // todo: should this be combining new data with old?
    var timespans = [];
    var instants = [];
    for (var i = 0, len = timelineItems.length; i < len; i++) {
        var timelineItem = timelineItems[i];
        if (timelineItem instanceof D3Timespan) {
            timespans.push(timelineItem);
        }
        else if (timelineItem instanceof D3TimeInstant) {
            instants.push(timelineItem);
        }
        else {
            throw Error('Unexpected timeline item.');
        }
    }

    var maxInt = Math.pow(2, 53);
    var minInt = -Math.pow(2, 53);

    // find min and max times
    var minAndMaxTimestamps = timespans.reduce(
        function(minAndMaxTimestamps, timespan) {
            var spanStartTime = timespan.getStartTime();
            var spanEndTime = timespan.getEndTime();

            if (spanStartTime !== null)
                minAndMaxTimestamps[0] = Math.min(minAndMaxTimestamps[0], spanStartTime);

            if (spanEndTime !== null)
                minAndMaxTimestamps[1] = Math.max(minAndMaxTimestamps[1], spanEndTime);

            return minAndMaxTimestamps;
        },
        [maxInt, minInt]  // initial values for min and max
    );

    var minTimestamp = minAndMaxTimestamps[0];
    var maxTimestamp = minAndMaxTimestamps[1];
    var defaultDiff = 1000;
    if (minTimestamp == maxInt && maxTimestamp != minInt) {
        // minimum was unset, so set it
        minTimestamp = maxTimestamp - defaultDiff;
    } else if (minTimestamp != maxInt && maxTimestamp == minInt) {
        // maximum was unset, so set it
        maxTimestamp = minTimestamp + defaultDiff;
    }

    var rowNames = timespans.reduce(
        function(rowNames, timespan) {
            if (rowNames.indexOf(timespan.rowName) < 0)
                rowNames.push(timespan.rowName);
            return rowNames;
        },
        []  // initial value
    );
    rowNames.sort();

    var parsedTimelineData = {
        'minTime': minTimestamp,
        'maxTime': maxTimestamp,
        'timespans': timespans,
        'instants': instants,
        'rowNames': rowNames
    };

    return parsedTimelineData;
};

cls.draw = function()
{
    var timelineItems = this._eventProvider.getNewTimelineItems();
    this._parsedTimelineData = this._parseTimelineData(timelineItems);

    var containerWidth = parseInt(this._container.style('width'));
    var containerHeight = parseInt(this._container.style('height'));

    // make sure container is not static positioning so we can absolute-position child elements
    if (this._container.style('position') == 'static') {
        this._container.style('position', 'relative');
    }

    // add divs -- these enable scrolling the table while keeping the time axis fixed
    var mainTableDiv = this._container.append('div').attr('class', 'mainTableDiv');
    var timeAxisDiv = this._container.append('div').attr('class', 'timeAxisDiv');

    var parentSvg = mainTableDiv.append('svg');
    var backSvg = parentSvg.append('g').attr('class', 'timelineBackGroup');
    var frontSvg = parentSvg.append('g').attr('class', 'timelineFrontGroup');

    this._labelColumnWidth = this._detectLabelColumnWidthAndAddLabels(backSvg);
    this._tableMargins.left += this._labelColumnWidth;

    this._width = containerWidth - this._tableMargins.left - this._tableMargins.right;

    var xScaleStart = this._fixedStartTime || this._parsedTimelineData.minTime;
    var xScaleEnd = this._fixedEndTime || this._parsedTimelineData.maxTime;
    this._xScale = d3.time.scale()
        .domain([xScaleStart, xScaleEnd])
        .range([0, this._width]);

    if (!this._fixedStartTime && !this._fixedEndTime)  // "nice" up the scale if endpoints weren't fixed
        this._xScale.nice();  // extend scale to nearest "whole" values (nearest second/30 seconds/minute/etc.)

    this._yScale = d3.scale.linear()
        .domain([0, 1])
        .range([0, this._tableRowHeight]);

    var xAxis = this._drawTimeAxis(timeAxisDiv);
    var timeAxisDivHeight = parseInt(timeAxisDiv.style('height'));
    mainTableDiv.style('bottom', timeAxisDivHeight + 'px');  // lock the table div to be directly above axis div

    // set the height of the table. force a minimum height if there are too few rows to fill the screen.
    this._height = Math.max(
        this._yScale(this._parsedTimelineData.rowNames.length),
        containerHeight - timeAxisDivHeight - this._tableMargins.top - this._tableMargins.bottom
    );

    parentSvg
        .attr('width', this._width + this._tableMargins.left + this._tableMargins.right)
        .attr('height', this._height + this._tableMargins.top + this._tableMargins.bottom);
    frontSvg.attr('transform', 'translate(' +
        this._tableMargins.left + ',' +
        this._tableMargins.top + ')');
    backSvg.attr('transform', 'translate(0, ' +
        this._tableMargins.top + ')');

    this._drawTableBackgroundAndGridLines(backSvg, xAxis);
    this._drawHorizontalGridLines(backSvg);  // should this be in _drawTableGridLines?

    var tableHoverLine = backSvg.append('line')
        .attr('y1', -this._tableMargins.top)
        .attr('y2', this._height + this._tableMargins.bottom);
    this._hoverLine(tableHoverLine);

    this._drawTimespans(frontSvg);
    this._positionRowLabels();
};

cls._drawTimeAxis = function(container)
{
    // the axis is the only thing in this container, so we don't need this svg for anything else
    var svg = container.append('svg')
        .attr('width', this._width + this._tableMargins.left + this._tableMargins.right)
        .style('position', 'relative')
        .style('top', -1);  // need 1 pixel shift for firefox (or else main horizontal axis line is cut off)

    // add the hover line and text now so that they appear behind the axis (we'll set position later)
    var axisHoverLine = svg.append('line');
    var axisHoverLineLabel = svg.append('text');

    // draw actual axis and labels
    var xAxis = d3.svg.axis()
        .orient('bottom')
        .ticks(20)  // draw more ticks but still adjust dynamically -- targets approximately 20 ticks
        .scale(this._xScale);

    var axisGroup = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(' + this._tableMargins.left + ', 1)')  // matching 1 pixel shift for firefox
        .call(xAxis);

    // set the height of both the svg, the containing div, and the secret padding div
    var axisHeight = axisGroup.node().getBBox().height + this._axisBottomMargin;
    svg.attr('height', axisHeight);

    axisHoverLine.attr('y1', 0).attr('y2', axisHeight - 5);  // leave a little space at the bottom
    this._hoverLine(axisHoverLine, axisHoverLineLabel);  // the bottom part of the hoverline, including time label
    return xAxis;
};

cls._drawTableBackgroundAndGridLines = function(svg, xAxis)
{
    // grey background
    svg.append('rect')
        .attr('x', this._tableMargins.left)
        .attr('y', -this._tableMargins.top)
        .attr('width', this._width)
        .attr('height', this._height + this._tableMargins.top + this._tableMargins.bottom)
        .attr('class', 'tableBackground');

    // draw grid lines (extra labels are hidden via css)
    xAxis.innerTickSize(this._height + this._tableMargins.top + this._tableMargins.bottom);
    svg.append('g')
        .attr('transform', 'translate(' + this._tableMargins.left + ', ' + -this._tableMargins.top + ')')
        .attr('class', 'x axis gridlines')
        .call(xAxis);
};

cls._drawTimespans = function(svg)
{
    var _this = this;
    var height = this._yScale(this._barHeightPercentage);
    var timespansTooltip = this._generateTooltip(svg);

    // timespan bar containers
    var timespans = svg.selectAll('.timespan').data(this._parsedTimelineData.timespans)
        .enter().append('g')
        .attr('class', function(d) {return 'timespan ' + d.userClass})  // add custom user classes to timespans
        .attr('transform', function(d) {  // position the timespan group at the correct spot
            var dx = _this._xScale(new Date(d.getStartTime(_this._xScale)));
            var dy = _this._yScale(_this._parsedTimelineData.rowNames.indexOf(d.rowName));
            return 'translate(' + dx + ', ' + dy + ')';
        })
        .attr('clip-path', function(d, i) {
            return 'url(#clip' + i + ')';  // this id is a clipPath created below
        });

    function spanWidth(d) {
        // if no startTime (or endTime) for timespan, set to the left (or right) side of the graph
        return _this._xScale(new Date(d.getEndTime(_this._xScale))) -
               _this._xScale(new Date(d.getStartTime(_this._xScale)));
    }

    function spanWidthClip(d) {
        var scale = _this._xScale;
        var overlapsEdge = d.extendsLeft(scale) || d.extendsRight(scale);  // extends off left or right
        var spanWidth = scale(new Date(d.getEndTime(scale))) - scale(new Date(d.getStartTime(scale)));
        spanWidth += overlapsEdge ? height : 0;
        // todo: there is a bug here where spanWidth can be negative -- not sure what it is
//        if (spanWidth < 0) {
//            console.log(spanWidth);
//        }
        return spanWidth;
    }

    function extendsOffEdge(d) {
        return d.extendsLeft(_this._xScale) || d.extendsRight(_this._xScale);
    }

    // timespan bars
    timespans
        .filter(function(d) {return !extendsOffEdge(d)})
        .append('rect')
        .attr('x', 0)
        .attr('y', this._yScale((1 - this._barHeightPercentage) / 2))
        .attr('width', spanWidth)
        .attr('height', height);

    // if timespan extends off edge of graph, add a little triangle arrowhead
    timespans
        .filter(extendsOffEdge)
        .append('polygon').attr('points', function(d) {
            if (d.extendsLeft(_this._xScale)) {
                var width = spanWidth(d);
                return '' +
                    '0,' + _this._yScale(1 - (1 - _this._barHeightPercentage) / 2) + ' ' +
                    -_this._yScale(1) / 3 + ',' + _this._yScale(1) / 2 + ' ' +
                    '0,' + _this._yScale((1 - _this._barHeightPercentage) / 2) + ' ' +
                    (width) + ',' + _this._yScale((1 - _this._barHeightPercentage) / 2) + ' ' +
                    (width) + ',' + _this._yScale(1 - (1 - _this._barHeightPercentage) / 2);
            }
            else {
                var width = spanWidth(d);
                return '' +
                    (width) + ',' + _this._yScale(1 - (1 - _this._barHeightPercentage) / 2) + ' ' +
                    (width + _this._yScale(1) / 3) + ',' + _this._yScale(1) / 2 + ' ' +
                    (width) + ',' + _this._yScale((1 - _this._barHeightPercentage) / 2) + ' ' +
                    '0,' + _this._yScale((1 - _this._barHeightPercentage) / 2) + ' ' +
                    '0,' + _this._yScale(1 - (1 - _this._barHeightPercentage) / 2);
            }
        });

    timespans
        .on('mouseover', function(d) {
            d3.select(this).classed('timespanHover', true);  // add hover class so we can change styles
            if (timespansTooltip) timespansTooltip.show(d);
        })
        .on('mouseout', function(d) {
            d3.select(this).classed('timespanHover', false);  // remove hover class so we can change styles
            if (timespansTooltip) timespansTooltip.hide(d);
        });

    // clipping for timespan bars -- this is subtle, but helps emphasize the gaps between spans (also cuts off text)
    timespans.append('clipPath')
        .attr('id', function(d, i) { return 'clip' + i; })
        .append('rect')  // attrs for this rect should be the same as the rect above (except related to arrowhead)
        .attr('x', function(d) {
            return (d.extendsLeft(_this._xScale)) ? -height : 0;
        })
        .attr('y', this._yScale((1 - this._barHeightPercentage) / 2))
        .attr('width', spanWidthClip)
        .attr('height', height);

    // timespan bar labels
    timespans.append('text')
        .text(function(d) { return d.spanName; })
        .attr('x', 5)
        .attr('y', this._yScale(0.5))  // center text vertically
        .attr('dy', '0.3em')  // helps center the text vertically (account for baseline)
        .attr('class', function(d) {
            if (this.getBBox().width + 8 > spanWidth(d)) {
                return 'spanTextOverflowing';
            }
            return 'spanText';
        })
        .style('pointer-events', 'none');  // don't let the label obscure mouseover event for underlying rect
};

/**
 * @param {d3.selection} svg
 * @return {d3.tip}
 * @private
 */
cls._generateTooltip = function(svg)
{
    var _this = this;
    var timespansTooltip = null;
    // only display tooltip if d3.tip plugin has been loaded (https://github.com/Caged/d3-tip)
    if (d3.tip) {
        function tooltipShouldBeOnLeft(d) {
            var timespanRightCoord = _this._xScale(d.getEndTime(_this._xScale));
            var tooltipWidth = parseInt(d3.select('.d3-tip').style('width'));  // todo: this is the previous width
            var tooltipFlipMargin = 20;  // minimum breathing room for the tooltip before it switches sides
            var shouldBeOnLeft = timespanRightCoord + tooltipWidth + tooltipFlipMargin > _this._width;
            return shouldBeOnLeft;
        }

        timespansTooltip = d3.tip()
            .attr('class', 'd3-tip')
            .direction(function(d) {
                // if the tooltip will be too far right, show it on the left
                var direction = tooltipShouldBeOnLeft(d) ? 'w' : 'e';
                return direction;
            })
            .offset(function(d) {
                var offset = tooltipShouldBeOnLeft(d) ? [0, -10] : [0, 10];
                return offset;
            })
            .html(function(d) {
                var timespanName = d.spanName;
                var timeFormat = d3.time.format('%I:%M:%S.%L');
                var startTime = (d.getStartTime() !== null) ? timeFormat(new Date(d.getStartTime())) : '?';
                var endTime = (d.getEndTime() !== null) ? timeFormat(new Date(d.getEndTime())) : '?';
                var duration = (d.getStartTime() !== null && d.getEndTime() !== null) ?
                    ((d.getEndTime() - d.getStartTime()) / 1000).toFixed(3) + 's':
                    '?';

                return '<span class="tipTitle">' + timespanName + '</span><br/><pre>' +
                    'Start:    ' + startTime + '<br/>' +
                    'End:      ' + endTime + '<br/>' +
                    'Duration: ' + duration + '</pre>';
            });
        svg.call(timespansTooltip);
    }
    return timespansTooltip;
};

cls._drawHorizontalGridLines = function(svg)
{
    var _this = this;

    // all but the last line appear over each row
    svg.selectAll('.horizontalGridLine')
        .data(this._parsedTimelineData.rowNames)
        .enter()
        .append('line')
        .attr('class', 'horizontalGridLine')
        .attr('x1', 0)
        .attr('x2', this._width + this._tableMargins.left)
        .attr('y1', function(d) { return _this._yScale(_this._parsedTimelineData.rowNames.indexOf(d)); })
        .attr('y2', function(d) { return _this._yScale(_this._parsedTimelineData.rowNames.indexOf(d)); });

    // the last line (there is one more line than there are rows)
    svg.append('line')
        .attr('class', 'horizontalGridLine')
        .attr('x1', 0)
        .attr('x2', this._width + this._tableMargins.left)
        .attr('y1', this._yScale(this._parsedTimelineData.rowNames.length))
        .attr('y2', this._yScale(this._parsedTimelineData.rowNames.length));
};

cls._hoverLine = function(hoverLine, hoverLineLabel)
{
    var _this = this;
    // the vertical line that follows the mouse (line height is set by calling code)
    hoverLine
        .attr('class', 'hoverline')
        .attr('x1', 2 * this._width)  // initial position (offscreen)
        .attr('x2', 2 * this._width);

    // the label for the vertical hover line
    if (hoverLineLabel) {
        hoverLineLabel
            .attr('class', 'hoverLineLabel')
            .attr('x', 2 * this._width)  // initial position (offscreen)
            .attr('y', hoverLine.attr('y2'));
    }

    // the mouse event to make the hover line actually follow the mouse
    function updateHoverLinePosition() {
        var mouseX = d3.mouse(this)[0];
        mouseX = Math.max(mouseX, _this._tableMargins.left);
        mouseX = Math.min(mouseX, _this._width + _this._tableMargins.left);
        var format = d3.time.format('%I:%M:%S.%L');
        hoverLine
            .attr('x1', mouseX)
            .attr('x2', mouseX);
        if (hoverLineLabel) {
            hoverLineLabel
                .attr('x', mouseX + 5)
                .text(format(_this._xScale.invert(mouseX - _this._tableMargins.left)));
        }
    }

    // don't replace an existing hoverline mousemove event
    // todo: this allows two mousemove events, but it would be cool if we could append multiple handlers in general
    var body = d3.select('body');
    var event = 'mousemove.hoverline1';
    if (body.on('mousemove.hoverline1')) {
        event = 'mousemove.hoverline2';
    }
    body.on(event, updateHoverLinePosition);
};

cls._detectLabelColumnWidthAndAddLabels = function(svg)
{
    // figure out how large the largest row label is
    var rowLabelGroup = svg.append('g').attr('class', 'rowLabels');
    rowLabelGroup.selectAll('.rowLabel')
        .data(this._parsedTimelineData.rowNames)
        .enter()
        .append('text')
        .attr('class', 'rowLabel')
        .text(function(d) { return d; });
    return rowLabelGroup.node().getBBox().width;
};

cls._positionRowLabels = function()
{
    var _this = this;
    d3.selectAll('.rowLabel')  // these elements were already added by _detectLabelColumnWidth
        .attr('x', 15)
        .attr('y', function(d) { return _this._yScale(0.5 + _this._parsedTimelineData.rowNames.indexOf(d)); })
        .attr('dy', '0.3em');
};


module.exports = D3Timeline;
