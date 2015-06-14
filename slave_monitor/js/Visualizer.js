

function Visualizer()
{
    this._graphNodes = [];
    this._graphLinks = [];
}
var cls = Visualizer.prototype;

cls.getNodes = function()
{
    return this._graphNodes;
};

cls.getLinks = function()
{
    return this._graphLinks;
};

cls.areArraysSame = function(arr1, arr2)
{
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (var i = 0, l = arr1.length; i < l; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

var notImplemented = function(methodName) {throw new Error('Method "' + methodName + '" not implemented.')};
cls.init = function(){notImplemented('init')};
cls.update = function(){notImplemented('update')};
cls.tick = function(){notImplemented('tick')};


module.exports = Visualizer;
