
var D3Event = require('./D3Event.js');
var D3TimeInstant = require('./D3TimeInstant.js');
var D3Timespan = require('./D3Timespan.js');


/**
 * For the purposes of this class, an "unmatched pair" means we have an event pair (a two-element array) where
 * one event of the pair is still not received (and is set to null).
 */
function D3EventProvider()
{
    this._newTimelineItems = [];
    this._incompleteTimespans = [];
}

var cls = D3EventProvider.prototype;

/**
 * @param {D3Event} event
 */
cls.addEvent = function(event)
{
    // if singular, append to singular events
    if (event.type == D3Event.SINGULAR) {
        this._newTimelineItems.push(new D3TimeInstant(event));
        return;
    }

    // iterate through _incompleteTimespans searching for matching event.
    // if no match found append a new incomplete timespan and add item to _newTimelineItems.
    // todo: would it be ridiculous to make a dict of {matchId: timespan} so we can match these faster?
    var foundMatch = false;
    for (var i = 0, len = this._incompleteTimespans.length; i < len; i++) {
        if (this._incompleteTimespans[i].addIfMatching(event)) {
            foundMatch = true;
            break;
        }
    }

    if (foundMatch) {
        // timespan is complete! remove it from the list.
        this._incompleteTimespans.splice(i, 1);
    }
    else {
        // no matches found for event. start a new timespan.
        var newTimespan = new D3Timespan(event);
        this._incompleteTimespans.push(newTimespan);
        this._newTimelineItems.push(newTimespan);
    }
};

/**
 * @param {D3Event} startEvent
 * @param {D3Event} endEvent
 */
cls.addMatchedEventPair = function(startEvent, endEvent)
{
    this._newTimelineItems.push(new D3Timespan(startEvent, endEvent));
};

/**
 * Return all the collected new timeline items, then reset the list of new items.
 * Items in the list can be either a D3Timespan or a D3TimeInstant.
 */
cls.getNewTimelineItems = function()
{
    var newTimelineItems = this._newTimelineItems;
    this._newTimelineItems = [];
    return newTimelineItems;
};


module.exports = D3EventProvider;
