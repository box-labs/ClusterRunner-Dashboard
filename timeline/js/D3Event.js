
var Helpers = require('./Helpers.js');

/**
 * @param {Object} properties
 */
function D3Event(properties)
{
    this.timestamp = properties['timestamp'];
    this.type = properties['type'];
    this.label = properties['label'];  // becomes the spanName for timespans
    this.matchId = Helpers.defaultParam(properties['matchId'], null);
    this.categoryName = Helpers.defaultParam(properties['categoryName'], null);  // becomes the row name for timespans
    this.userClass = Helpers.defaultParam(properties['userClass'], null);
}
var cls = D3Event.prototype;
D3Event.START = 'start';
D3Event.END = 'end';
D3Event.SINGULAR = 'singular';

/**
 * @param {D3Event} otherEvent
 * @return {boolean}
 */
cls.matches = function(otherEvent)
{
    // the only events that can match each other are one "start" event and one "end" event
    if (this.type == D3Event.SINGULAR || otherEvent.type == D3Event.SINGULAR || this.type == otherEvent.type) {
        return false;
    }

    // one event is a "start" and the other event is an "end"
    // events match if they have the same (non-null) matchId or label
    if (this.matchId || otherEvent.matchId) {
        return this.matchId == otherEvent.matchId;
    }
    return this.label == otherEvent.label;
};


module.exports = D3Event;
