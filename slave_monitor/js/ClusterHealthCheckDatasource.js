
var Log = require('./Log.js');
var Network = require('./Network.js');

// TODO: This work should actually be done by ClusterRunner but we're doing it here temporarily
function ClusterHealthCheckDatasource(slavesListDatasource)
{
    this._slavesListDatasource = slavesListDatasource;
    this._network = new Network();

    this._networkCallDelayMs = 1000;
    this._repeatDelayMs = 10000;

    this._slaveIdsToPing = [];
    this.data = {};  // This will be an auto-updating map from slave id to slave online status.
}
var cls = ClusterHealthCheckDatasource.prototype;

cls.start = function()
{
    var _this = this;
    function healthCheckNextUrl() {
        // if urls list length is empty, refill it from datasource
        if (_this._slaveIdsToPing.length === 0) {
            _this._slaveIdsToPing = Object.keys(_this._slavesListDatasource.data);

            // todo: remove any keys from data that aren't in datasource
        }

        // pop next slave id off list
        var slaveIdToPing = _this._slaveIdsToPing.pop();
        if (typeof slaveIdToPing === 'undefined') {
            // if no popped item, we got no slaves from the datasource so there's nothing to health check
            setTimeout(healthCheckNextUrl, _this._networkCallDelayMs);
            return;
        }

        // if this is the last slave id to ping, set timeout to repeatDelayMs
        var delayMs = (_this._slaveIdsToPing.length === 0 ? _this._repeatDelayMs : _this._networkCallDelayMs);

        // get the url, set the data thingy
        var healthCheckUrl = 'http://' + _this._slavesListDatasource.data[slaveIdToPing].url + '/v1/';
        Log.debug('Health checking ' + healthCheckUrl);
        _this._network.get(healthCheckUrl, function(apiData) {
            // returning any data means the slave is up
            _this.data[slaveIdToPing] = true;
            setTimeout(healthCheckNextUrl, delayMs);

        }, function(apiError) {
            // any api error means the slave is down
            _this.data[slaveIdToPing] = false;
            setTimeout(healthCheckNextUrl, delayMs);
        });
    }
    healthCheckNextUrl();
};


module.exports = ClusterHealthCheckDatasource;
