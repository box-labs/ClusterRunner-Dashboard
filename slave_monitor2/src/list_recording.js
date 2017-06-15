
let UNSET = '__UNSET__';  // don't use a Symbol since we want recordings to be serializable for download.

function compareObjs(o1, o2) {
    if (o1 === o2) return true;
    if (typeof o1 !== typeof o2) return false;
    switch (typeof o1) {
        case 'object':
            let keys1 = Object.keys(o1);
            let keys2 = Object.keys(o2);
            if (keys1.length !== keys2.length) return false;
            for (let k of keys1) {
                if (!compareObjs(o1[k], o2[k])) return false;
            }
            break;
        default:
            if (o1 !== o2) return false;
    }
    return true;
}


export class ListRecording {

    constructor(fileName = null, keyBlacklist = [], diffKey = 'id') {
        this._recording = [];  // list of steps that make up the recording (see this.append())
        this._fileName = fileName;  // todo: load into recording if file exists
        this._keyBlacklist = keyBlacklist;  // ignore these keys when detecting diffs
        this._diffKey = diffKey;
        this.rewind();
    }

    rewind() {
        this._currentData = [];
        this._playbackIndex = -1;
    }

    /**
     * Play back recorded data. Return null when recording ending is hit.
     * @return {Array<Object>}
     */
    next() {
        if (this._playbackIndex > this._recording.length - 2) {
            return null;
        }
        let nextDiff = this._recording[++this._playbackIndex];
        this._currentData = this._applyDiff(this._currentData, nextDiff);
        return this._currentData;
    }

    /**
     * Record a data step. Data is converted to a diff format for efficient storage.
     * @param {Array<Object>} newData
     */
    append(newData) {
        let newDiff = this._generateDiff(this._currentData, newData);
        this._recording.push(newDiff);
        this._currentData = newData;
    }

    /**
     * Download the recording as a json file.
     *
     */
    download() {
        // taken from https://stackoverflow.com/a/18197341
        let element = document.createElement('a');
        let content = JSON.stringify(this._recording, null, 2);
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
        element.setAttribute('download', this._fileName);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    /**
     * @param {Array<Object>} data
     * @param {Array<Object>} diff
     * @returns {Array<Object>}
     */
    _applyDiff(data, diff) {
        let diffByKey = {};
        for (let diffDatum of diff) {
            if (!this._diffKey in diffDatum) throw Error(`diffKey "${this._diffKey}" is not in object: ${diffDatum}`);
            diffByKey[diffDatum[this._diffKey]] = diffDatum;
        }

        let newData = [];
        for (let datum of data) {
            datum = Object.assign({}, datum);  // copy
            if (!this._diffKey in datum) throw Error(`diffKey "${this._diffKey}" is not in object: ${datum}`);
            let datumId = datum[this._diffKey];
            if (datumId in diffByKey) {
                let diffDatum = diffByKey[datumId];
                delete diffByKey[datumId];
                if (UNSET in diffDatum && diffDatum[UNSET]) {
                    continue;  // diff says to delete this element; don't add to newData
                }
                for (let [key, newVal] of Object.entries(diffDatum)) {
                    if (key !== UNSET) {
                        if (newVal === UNSET && datum.hasOwnProperty(key)) {
                            delete datum[key];
                        }
                        else {
                            datum[key] = newVal;
                        }
                    }
                }
                newData.push(datum);
            }
            else {
                newData.push(datum);  // no diff so just pass through
            }
        }
        for (let [newKey, newVal] of Object.entries(diffByKey)) {
            // this is a new data element not part of old data
            newData.push(newVal);
        }
        return newData;
    }


    /*
     *  r = new ListRecording();
     *  r.append([{"id": 1, "name": "joey", "lastname": "hoops", "color": "green"}, {"id": 2, "name": "slammer"}, {"id": 3, "name": "shooter"}]);
     *  r.append([{"id": 1, "name": "johnny", "lastname": "hoops"}, {"id": 3, "name": "shooter"}]);
     *
     *  diff == [
     *    [{"id": 1, "name": "joey", "lastname": "hoops", "color": "green"}, {"id": 2, "name": "brandon"}],
     *    [{"id": 1, "name": "johnny", "color": UNSET}, {"id": 2, UNSET: true}]
     *  ]
     *
     * @param {Array<Object>} fromData
     * @param {Array<Object>} toData
     * @returns {Array<Object>}
     */
    _generateDiff(fromData, toData) {
        let fromDataByKey = {};
        for (let fromDatum of fromData) {
            if (!this._diffKey in fromDatum) throw Error(`diffKey "${this._diffKey}" is not in object: ${fromDatum}`);
            fromDataByKey[fromDatum[this._diffKey]] = Object.assign({}, fromDatum);  // copy
        }

        let diff = [];
        for (let toDatum of toData) {
            let toDatumId = toDatum[this._diffKey];
            if (toDatumId in fromDataByKey) {  // datum update - only store different/unset keys
                let fromDatum = fromDataByKey[toDatumId];
                delete fromDataByKey[toDatumId];

                let datumDiff = {};
                for (let [key, newVal] of Object.entries(toDatum)) {
                    if (key in fromDatum && !this._keyBlacklist.includes(key)) {
                        if (!compareObjs(fromDatum[key], newVal)) {
                            datumDiff[key] = newVal;  // key update
                        }
                        delete fromDatum[key];  // this key has been accounted for
                    }
                    else {
                        datumDiff[key] = newVal;  // key create
                    }
                }
                for (let remainingKey of Object.keys(fromDatum)) {
                    datumDiff[remainingKey] = UNSET;  // key delete
                }
                // if any keys changed, then to diff.
                if (Object.keys(datumDiff).length > 0) {
                    datumDiff[this._diffKey] = toDatumId;
                    diff.push(datumDiff);
                }
            }
            else {  // datum create
                diff.push(toDatum);  // store all fields on create
            }
        }
        // any keys left in fromDataByKey were deleted in toData.
        for (let deletedId of Object.keys(fromDataByKey)) {
            diff.push({[this._diffKey]: deletedId, [UNSET]: true});  // datum delete
        }
        return diff;
    }
}
