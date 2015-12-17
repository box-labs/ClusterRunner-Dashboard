
var conf = require('./conf.js');
var FakeData = require('./FakeData.js');
var Log = require('./Log.js');
var Network = require('./Network.js');


function SlavesListDatasource(masterUrl)
{
    this._slaveApiUrl = 'http://' + masterUrl + '/v1/slave';
    this._network = new Network();

    this.data = {};  // This will be an auto-updating map from slave id to slave info.
}
var cls = SlavesListDatasource.prototype;

//cls.start = function()
//{
//    var _this = this;
//    function updateSlaveData() {
//        Log.debug('Updating slave data.');
//        _this._network.get(_this._slaveApiUrl, function(apiData) {
//            // Update elements of the slaveData object with new data
//            var newSlaveData = apiData['slaves'];
//
//            if (DEBUG_MODE) {
//                newSlaveData = FakeData.getNextFakeData(true);
////                    newSlaveData = getNextFakeData(false);
//            }
//
//            for (var i = 0; i < newSlaveData.length; i++) {
//                var slave = newSlaveData[i];
//                _this.data[slave['id']] = slave;
//            }
//
//            var newSlaveDataIds = newSlaveData.map(function(newSlaveDatum) {
//                return newSlaveDatum['id'].toString();  // convert number to string -- object keys are strings
//            });
//            var slaveIdsToRemove = Object.keys(_this.data).filter(function(id) {
//                return newSlaveDataIds.indexOf(id) == -1;
//            });
//            for (var j = 0; j < slaveIdsToRemove.length; j++) {
//                delete _this.data[slaveIdsToRemove[j]];
//            }
//            setTimeout(updateSlaveData, conf.updateFrequencyMs);
//        });
//    }
//    updateSlaveData();
//};

cls.start = function()
{
    var _this = this;
    function updateData() {
        _this._network.get(_this._slaveApiUrl, function(apiData) {
            Log.info('SlavesListDatasource.updateData()');

            var newData = apiData['slaves'];
            if (DEBUG_MODE) newData = FakeData.getFakeSlavesList();

            // Remove all elements from the current data object
//            var existingKeys = Object.keys(_this.data);
//            for (var k = 0; k < existingKeys.length; k++) {
//                delete _this.data[existingKeys[k]];
//            }
            _this.data = {};

            // Add all elements in newData to the existing data object
            for (var i = 0; i < newData.length; i++) {
                var slave = newData[i];
                // If the slave has been deliberately put into shutdown mode, and is no longer online, then do not render that slave.
                if (!slave['is_alive'] && slave['is_in_shutdown_mode']) {
                    continue;
                }
                _this.data[slave['id']] = slave;
            }

            d3.timer(updateData, conf.updateFrequencyMs);
        });
        return true;  // return true so d3.timer does not repeat this call again immediately
    }
    updateData();
};


module.exports = SlavesListDatasource;
