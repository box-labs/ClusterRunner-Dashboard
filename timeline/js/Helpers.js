
var Helpers = {

    defaultParam: function(actual_value, default_value) {
        actual_value = typeof actual_value !== 'undefined' ? actual_value : default_value;
        return actual_value;
    },

    pad: function(num, size) {
        var s = num + '';
        while (s.length < size) s = '0' + s;
        return s;
    }
};


module.exports = Helpers;
