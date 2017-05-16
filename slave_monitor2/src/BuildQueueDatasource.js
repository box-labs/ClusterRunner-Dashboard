
var conf = require('./conf.js');
var FakeData = require('./FakeData.js');
var Log = require('./Log.js');
var Network = require('./Network.js');


function BuildQueueDatasource(masterUrl)
{
    this._apiUrl = 'http://' + masterUrl + '/v1/queue';
    this._network = new Network();

    this.data = {};  // This will be an auto-updating map from queued build id to build info.
}
var cls = BuildQueueDatasource.prototype;

cls.start = function()
{
    var _this = this;
    function updateData() {
        _this._network.get(_this._apiUrl, function(apiData) {
            Log.info('BuildQueueDatasource.updateData()');
            var newData = apiData['queue'];
            if (DEBUG_MODE) newData = FakeData.getFakeBuildQueue();

            // Remove all elements from the current data object
            var existingKeys = Object.keys(_this.data);
            for (var k = 0; k < existingKeys.length; k++) {
                delete _this.data[existingKeys[k]];
            }

            // Add all elements in newData to the existing data object
            for (var i = 0; i < newData.length; i++) {
                var build = newData[i];
                _this.data[build['id']] = build;
            }

            d3.timer(updateData, conf.updateFrequencyMs);
        });
        return true;  // return true so d3.timer does not repeat this call again immediately
    }
    updateData();
};


module.exports = BuildQueueDatasource;
