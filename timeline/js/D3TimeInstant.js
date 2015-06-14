
var D3Event = require('./D3Event.js');


/**
 * @param {D3Event} event
 */
function D3TimeInstant(event)
{
    this._event = event;
    if (event.type != D3Event.SINGULAR)
        throw Error('Created TimeInstant item with a non-singular event.');
}


module.exports = D3TimeInstant;
