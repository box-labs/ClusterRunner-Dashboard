import * as d3 from 'd3';


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
};

cls.drag = function(simulation) {

    function dragstarted(d) {
        // console.log('dragstarted');
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
        // console.log('dragged');
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
        // console.log('dragended');
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
};

var notImplemented = function(methodName) {throw new Error('Method "' + methodName + '" not implemented.')};
cls.init = function(){notImplemented('init')};
cls.update = function(){notImplemented('update')};
cls.tick = function(){notImplemented('tick')};


export default Visualizer;
