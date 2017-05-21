import * as d3 from 'd3';

import {conf} from './conf';
import {FakeData} from './fake_data';
import {Log} from './log';
import {Network} from './network';


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

        function handleData(apiData) {
            // Log.info('BuildQueueDatasource.handleData()');
            var newData = apiData['queue'];

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
        }

        if (window.DEBUG_MODE) {
            handleData({queue: FakeData.getFakeBuildQueue()});
        } else {
            _this._network.get(_this._apiUrl, handleData);
        }
    }
    updateData();
    d3.interval(updateData, conf.updateFrequencyMs);
};


module.exports = BuildQueueDatasource;
