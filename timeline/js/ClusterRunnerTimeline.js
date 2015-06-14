
var Helpers = require('./Helpers.js');
var D3Event = require('./D3Event.js');
var D3Timeline = require('./D3Timeline.js');


function ClusterRunnerTimeline(containerSelector, rainbowLevel, masterUrl, eventFilter)
{
    this._masterUrl = masterUrl;
    this._rainbowLevel = Helpers.defaultParam(rainbowLevel, 0);  // the amount of rainbowization!
    this._classesByKey = {};
    this._slaveData = {};
    this._eventFilter = eventFilter;

    var container = d3.select(containerSelector);
    this._timeline = new D3Timeline(container);
}
var cls = ClusterRunnerTimeline.prototype;


cls.showTimeline = function(jsonData)
{
    this._displayMetadata(jsonData);
    this._drawChart(jsonData['timeline']);
};

cls.startTimeline = function(span, startTime, endTime)
{
    // todo: support specifying time string, e.g. "6:00"

    if (span && startTime && endTime) {
        throw Error('You can only specify up to two of "span", "startTime", "endTime".')
    }

    if (!endTime && !startTime) {
        endTime = new Date().getTime() / 1000;
    }

    var numSpanSeconds = this._parseSpanIntoSeconds(span);
    numSpanSeconds = numSpanSeconds || 30 * 60;  // default to thirty minutes

    endTime = endTime || startTime + numSpanSeconds;
    startTime = startTime || endTime - numSpanSeconds;

    if (!this._eventFilter) {
        // only specify the timeline span if no event filter has been added
        // todo: this is not perfect -- the specified timespan still needs to include the events you're interested in
        this._timeline.setTimelineBounds(startTime * 1000, endTime * 1000);
    }

    var eventApiUrl = 'http://' + this._masterUrl + '/v1/eventlog?since_timestamp=' + startTime;
//        var eventApiUrl = 'http://jharrington.inside-box.net:1337/www/clusterrunner_timeline/eventlog_test_comp.json';

    var _this = this;
    d3.json(eventApiUrl).get(function(apiError, apiData) {
        if (apiError) {
            console.log(apiError);
            d3.select('.dashboard').html(
                'Error occurred getting url: ' + eventApiUrl + '. Check JS console for details.');
            throw Error('Error occurred in get request.');
        }
        _this._handleInitialEventData(apiData);
    });
};

/**
 * @param {string} span
 * @return {?number}
 * @private
 */
cls._parseSpanIntoSeconds = function(span) {
    var spanRegex = /(\d+)([smhd]).*/;
    var matches = span.match(spanRegex);
    if (matches) {
        var secondMultipliers = {
            's': 1,
            'm': 60,
            'h': 3600,
            'd': 86400
        };
        var numSpanSeconds = parseInt(matches[1]) * secondMultipliers[matches[2]];
        return numSpanSeconds;
    }
    return null;
};

cls._handleInitialEventData = function(eventData)
{
    // get the slave urls for each slave id before converting the events
    var slaveDataApiUrl = 'http://' + this._masterUrl + '/v1/slave';
    var _this = this;
    d3.json(slaveDataApiUrl).get(function(apiError, slaveData) {
        // map from slave id to slave data
        var i, len;
        for (i = 0; i < slaveData['slaves'].length; i++) {
            var slave = slaveData['slaves'][i];
            _this._slaveData[slave['id']] = slave;
        }

        // convert clusterrunner API events into timeline events. (not all crEvents will become d3Events)
        // todo: should we manually pair the first set for performance? or improve the d3timeline pairing?
        var crEvents = eventData['events'];
        console.log('Got ' + crEvents.length + ' events.');
        var numEventsFilteredOut = 0;

        for (i = 0, len = crEvents.length; i < len; i++) {
            numEventsFilteredOut += _this._addEventToTimeline(crEvents[i]) ? 0 : 1;
        }
        console.log('Filtered out ' + numEventsFilteredOut + ' events.');
        _this._timeline.draw();
    });
};

/**
 * @param {Object} crEvent
 * @return {boolean}
 * @private
 */
cls._addEventToTimeline = function(crEvent)
{
    // filter events based on eventFilter
    for (var propertyName in this._eventFilter) {
        if (this._eventFilter.hasOwnProperty(propertyName) && crEvent.hasOwnProperty(propertyName)) {
            var acceptedValues = this._eventFilter[propertyName];
            var actualValue = crEvent[propertyName];
            if (acceptedValues.indexOf(actualValue) == -1) {
                // value for this event is not an accepted value, so do not add any events to timeline.
                return false;
            }
        }
    }

    var eventsToAdd = [];
    var tag = crEvent['__tag__'];
    if (tag == 'MASTER_TRIGGERED_SUBJOB' || tag == 'MASTER_RECEIVED_RESULT') {

        var timestamp = crEvent['__timestamp__'] * 1000;
        var label = 'Build ' + crEvent['build_id'] + ', Subjob ' + crEvent['subjob_id'];
        var categoryName = this._getSlaveName(crEvent['slave_id'], crEvent['executor_id']);
        var userClass = this._getClassForKey(crEvent['build_id']);

        // subjob start events come from MASTER_TRIGGERED_SUBJOB events
        if (tag == 'MASTER_TRIGGERED_SUBJOB') {
            eventsToAdd.push(new D3Event({
                type: D3Event.START,
                timestamp: timestamp,
                label: label,
                categoryName: categoryName,
                userClass: userClass
            }));
        }

        // subjob end events come from MASTER_RECEIVED_RESULT events
        else if (tag == 'MASTER_RECEIVED_RESULT') {
            eventsToAdd.push(new D3Event({
                type: D3Event.END,
                timestamp: timestamp,
                label: label,  // todo: should we skip label on end events?
                categoryName: categoryName,
                userClass: userClass
            }));
        }

    } else if (tag == 'BUILD_SETUP_START' || tag == 'BUILD_SETUP_FINISH') {

        var numExecutors = this._slaveData[crEvent['slave_id']]['num_executors'];
        var timestamp = crEvent['__timestamp__'] * 1000;
        var label = 'Setup Build ' + crEvent['build_id'];
        var userClass = this._getClassForKey(crEvent['build_id']);

        for (var executorNum = 0; executorNum < numExecutors; executorNum++) {
            // draw the same setup bar for each executor
            // todo: Should the timeline have a way of drawing bars for multiple rows?
            // todo: (e.g., specify multiple categories)

            // use a matchId since the labels for the setup spans will not be unique
            var matchId = 'setup:' + crEvent['build_id'] + ':' + crEvent['slave_id'] + ':' + executorNum;
            var categoryName = this._getSlaveName(crEvent['slave_id'], executorNum);

            if (tag == 'BUILD_SETUP_START') {
                eventsToAdd.push(new D3Event({
                    type: D3Event.START,
                    timestamp: timestamp,
                    label: label,
                    matchId: matchId,
                    categoryName: categoryName,
                    userClass: userClass
                }));
            }

            else if (tag == 'BUILD_SETUP_FINISH') {
                eventsToAdd.push(new D3Event({
                    type: D3Event.END,
                    timestamp: timestamp,
                    label: label,
                    matchId: matchId,
                    categoryName: categoryName,
                    userClass: userClass
                }));
            }
        }
    } else if (tag == 'BUILD_PREPARE_START' || tag == 'BUILD_PREPARE_FINISH') {

        var timestamp = crEvent['__timestamp__'] * 1000;
        var label = 'Prepare Build ' + crEvent['build_id'];
        var userClass = this._getClassForKey(crEvent['build_id']);
        var categoryName = ' master';  // start with a space so it sorts on top

        if (tag == 'BUILD_PREPARE_START') {
            eventsToAdd.push(new D3Event({
                type: D3Event.START,
                timestamp: timestamp,
                label: label,
                categoryName: categoryName,
                userClass: userClass
            }));
        }

        else if (tag == 'BUILD_PREPARE_FINISH') {
            eventsToAdd.push(new D3Event({
                type: D3Event.END,
                timestamp: timestamp,
                label: label,
                categoryName: categoryName,
                userClass: userClass
            }));
        }
    }

    for (var i = 0; i < eventsToAdd.length; i++) {
        this._timeline.addEvent(eventsToAdd[i]);
    }
    return true;  // event was added
};

cls._getSlaveName = function(slaveId, executorId)
{
    var slave = this._slaveData[slaveId];
    return slave['url'] + ':' + Helpers.pad(executorId, 2);
};

cls._drawChart = function(timespans)
{
    this._addColorClasses(timespans);
    var container = document.getElementsByClassName('dashboard')[0];

    this._timeline.setTimespans(timespans);
    this._timeline.draw(container);
};

//    cls._calculateAverageSubtaskDuration = function(timelineData)
//    {
//        var subtask_durations = [];
//        for (var i = 0; i < timelineData.length; i++) {
//            var subtask = timelineData[i];
//            subtask_durations.push(subtask[3] - subtask[2]); // end - start
//        }
//        var subtask_duration_sum = subtask_durations.reduce(function(sum, x) {
//            return sum + x
//        });
//        return subtask_duration_sum / subtask_durations.length;
//    };

cls._addColorClasses = function(timelineData)
{
    var numColors = 12;  // should match number of colorXX classes in css
    var currentColor = 0;
    var timespanColors = {};
    for (var i = 0; i < timelineData.length; i++) {
        var thisSlaveIdentifier = timelineData[i][0];

        var colorKey = this._removePortFromSlaveName(thisSlaveIdentifier);  // default: each slave gets own color
        if (this._rainbowLevel == 1) {
            colorKey = thisSlaveIdentifier;                       // each row gets its own color
        } else if (this._rainbowLevel >= 2) {
            colorKey = thisSlaveIdentifier + timelineData[i][1];  // each timespan gets its own color
        }

        if (!(colorKey in timespanColors)) {
            timespanColors[colorKey] = 'color' + ('0' + currentColor).slice(-2);  // pad one digit numbers with a 0
            currentColor = (currentColor + 1) % numColors;
        }
        timelineData[i].push(timespanColors[colorKey]);
    }
};

cls._getClassForKey = function(classKey)
{
    // todo: this doesn't work with rainbowzzz -- we should make d3timeline.js do some simple coloring by default
    if (!this._classesByKey[classKey]) {
        var numColors = 12;  // should match number of colorXX classes in css
        var currentColor = Object.keys(this._classesByKey).length % numColors;
        this._classesByKey[classKey] = 'color' + Helpers.pad(currentColor, 2);
    }
    return this._classesByKey[classKey];
};

cls._removePortFromSlaveName = function(slaveIdentifier)
{
    // splits the executor number off of the slave identifier
    // e.g., input of "localhost:43001:4" would output "localhost:43001"
    var lastColonIndex = slaveIdentifier.lastIndexOf(':');
    return slaveIdentifier.substring(0, lastColonIndex);
};

cls._displayMetadata = function(jsonData)
{
    /**
     * Generate the HTML that goes in the little metadata info drop down.
     */
    var timelineData = jsonData['timeline'];

    var averageGapMs = jsonData['averageGapMs'];
    var averageSubtaskMs = jsonData['averageSubtaskMs'];// || this._calculateAverageSubtaskDuration(timelineData);
    var moduleUnderTest = jsonData['moduleUnderTest'];
    var numSlaves = jsonData['numSlaves'];
    var numExecutorsPerSlave = jsonData['numExecutorsPerSlave'];

    var metadataContent = [
        // format: [label, data, precision (for numbers), suffix (for numbers)]
        ['Module under test', moduleUnderTest],
        ['Number of slaves', numSlaves],
        ['Executors per slave', numExecutorsPerSlave],
        ['Average gap length', averageGapMs, 2, 'ms'],
        ['Average subtask duration', averageSubtaskMs / 1000, 2, 's'],
        ['Number of subtasks', timelineData.length]
    ];

    // find maximum label length of those items with defined data
    var maxDefinedLabelLength = metadataContent.reduce(function(maxDefinedLabelLength, contentItem) {
        var label = contentItem[0];
        var value = contentItem[1];
        var labelLength = (typeof value != 'undefined' && value != null) ? label.length : 0;
        return Math.max(maxDefinedLabelLength, labelLength);
    }, 0);

    var metaDataHtmlLines = metadataContent.map(function(contentItem) {
        var label = contentItem[0];
        var value = contentItem[1];
        var precision = contentItem[2] || 0;
        var suffix = contentItem[3] || '';

        // pad the label with spaces so that all labels match lengths (which makes the values align)
        var padAmount = maxDefinedLabelLength - label.length;
        var padding = (new Array(padAmount + 1)).join(' ');

        switch (typeof value) {
            case 'string':
                break;  // no-op -- no change to value

            case 'number':
                value = parseFloat(value).toFixed(precision);
                break;

            default:
                return '';  // no value, so omit this item
        }
        return label + ':  ' + padding + '<span class="bold">' + value + '</span>' + suffix + '<br/>';
    });

    var metaDataHtml = '<pre>' + metaDataHtmlLines.join('') + '</pre>';
    d3.select('.clusterRunnerMetadataContent').html(metaDataHtml);
};


module.exports = ClusterRunnerTimeline;
