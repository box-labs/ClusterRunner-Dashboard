import * as d3 from 'd3';
import Log from './Log';


function Network() {}
var cls = Network.prototype;

var _errorCallback = null;  // The error callback is class-level to all Network instances.
Network.setErrorCallback = function(callback)
{
    _errorCallback = callback;
};

cls.get = function(url, successCallback, alternateErrorCallback)
{
    var _this = this;
    d3.json(url).get(function(apiError, apiData) {
        if (apiError) {
            if (alternateErrorCallback) {
                return alternateErrorCallback(apiError);
            }
            return _this._executeErrorCallback(url, apiError);
        }
        else if (apiData) {
            return successCallback(apiData);
        }
    });
};

cls._executeErrorCallback = function(url, apiError)
{
    Log.error('Error during API call to ' + url);
    if (_errorCallback) {
        _errorCallback(url, apiError);
    }
};


module.exports = Network;
