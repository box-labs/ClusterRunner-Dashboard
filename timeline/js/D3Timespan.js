
var D3Event = require('./D3Event.js');


/**
 * @param {D3Event} eventA
 * @param {D3Event=} opt_eventB
 */
function D3Timespan(eventA, opt_eventB)
{
    if (!eventA) throw Error('D3Timespan requires an event.');  // eventA is required

    /** @type {D3Event} */
    this._startEvent = null;
    /** @type {D3Event} */
    this._endEvent = null;

    if (eventA.type == D3Event.START) {
        this._startEvent = eventA;
    } else {
        this._endEvent = eventA;
    }

    // eventB is optional
    if (opt_eventB) {
        var isValidMatch = this.addIfMatching(opt_eventB);
        if (!isValidMatch) throw Error('Invalid events supplied to D3Timespan constructor.');
    }

    this._setProperties();
}
var cls = D3Timespan.prototype;

/**
 * @param {D3Event} potentialMatchingEvent
 * @return {boolean} True if the event was a matching event and was added. False otherwise.
 */
cls.addIfMatching = function(potentialMatchingEvent)
{
    // if already matched, raise an error
    if (this._startEvent && this._endEvent) throw Error('Tried to match an already matched timespan.');

    var eventToMatch = this._startEvent || this._endEvent;
    if (eventToMatch.matches(potentialMatchingEvent)) {
        if (!this._startEvent) {
            this._startEvent = potentialMatchingEvent;
        } else {
            this._endEvent = potentialMatchingEvent;
        }
        this._setProperties();
        return true;
    }

    return false;
};

cls._setProperties = function()
{
    // do some initial consistency checking just for debugging purposes
    if (this._startEvent && this._endEvent) {
        if (this._startEvent.label != this._endEvent.label)
            console.log('Mismatched labels on timespan events!');
        if (this._startEvent.categoryName != this._endEvent.categoryName)
            console.log('Mismatched category names on timespan events!');
        if (this._startEvent.userClass != this._endEvent.userClass)
            console.log('Mismatched user class on timespan events!');
        if (this._startEvent.timestamp > this._endEvent.timestamp)
            console.log('Timespan start timestamp is after end timestamp!');
    }

    var event = this._startEvent || this._endEvent;  // fall back to endEvent if startEvent not set
    this.rowName = event.categoryName;
    this.spanName = event.label;
    this.userClass = event.userClass;
    this._startTime = (this._startEvent) ? this._startEvent.timestamp : null;
    this._endTime = (this._endEvent) ? this._endEvent.timestamp : null;
};

/**
 * @param {object=} opt_scale A d3.time.scale that this timespan's startTime should be clamped to.
 * @return {number}
 */
cls.getStartTime = function(opt_scale) {
    if (opt_scale) {
        var minTime = opt_scale.domain()[0];
        return (this.extendsLeft(opt_scale)) ? minTime : this._startTime;
    }
    return this._startTime;
};

cls.extendsLeft = function(scale) {
    var minTime = scale.domain()[0];
    return this._startTime === null || this._startTime < minTime;
};

/**
 * @param {object=} opt_scale A d3.time.scale that this timespan's endTime should be clamped to.
 * @return {number}
 */
cls.getEndTime = function(opt_scale) {
    if (opt_scale) {
        var maxTime = opt_scale.domain()[1];
        return (this.extendsRight(opt_scale)) ? maxTime : this._endTime;
    }
    return this._endTime;
};

cls.extendsRight = function(scale) {
    var maxTime = scale.domain()[1];
    return this._endTime === null || this._endTime > maxTime;
};


module.exports = D3Timespan;
