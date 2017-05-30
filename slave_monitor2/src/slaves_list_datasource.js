import * as d3 from 'd3';

import {conf} from './conf';
import * as FakeData from './fake_data';
import {Log} from './log';
import {Network} from './network';


class SlavesListDatasource {

    constructor(masterUrl) {
        this._slaveApiUrl = 'http://' + masterUrl + '/v1/slave';
        this._network = new Network();
        this.data = {};  // This will be an auto-updating map from slave id to slave info.
    }

    start() {
        this._updateData();

        let updateData = this._updateData.bind(this);  // d3.interval doesn't play nicely with unbound methods.
        d3.interval(updateData, conf.updateFrequencyMs);
    }

    _updateData() {
        let handleData = (apiData) => {
            // Log.info('SlavesListDatasource.handleData()');
            let newData = apiData['slaves'];
            this.data = {};
            // Add all elements in newData to the existing data object
            for (let i = 0; i < newData.length; i++) {
                let slave = newData[i];
                // If the slave has been deliberately put into shutdown mode, and is no longer online, then do not render that slave.
                if (!slave['is_alive'] && slave['is_in_shutdown_mode']) {
                    continue;
                }
                this.data[slave['id']] = slave;
            }
        };

        if (window.DEBUG_MODE) {
            handleData({slaves: FakeData.getFakeSlavesList()});
        }
        else {
            this._network.get(this._slaveApiUrl, handleData);
        }
    }
}

export {SlavesListDatasource};
