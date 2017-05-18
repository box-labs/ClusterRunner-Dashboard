
function Log() {}

Log.DEBUG = 0;
Log.INFO = 10;
Log.WARNING = 20;
Log.ERROR = 30;
var _currentLogLevel = Log.WARNING;

var logLevelStyles = {};
logLevelStyles[Log.DEBUG] = 'color:green';
logLevelStyles[Log.INFO] = 'color:blue';
logLevelStyles[Log.WARNING] = 'color:orange; font-weight:bold';
logLevelStyles[Log.ERROR] = 'color:red; font-weight:bold';

Log.setLevel = function(level)
{
    _currentLogLevel = level
};

function padRight(str, l, c) {return str + Array(l - str.length + 1).join(c || " ")}

function logAtLevel(level, levelName)
{
    return function(message) {
        if (level >= _currentLogLevel) {
            var dateString = padRight('' + (Date.now() / 1000), 14, '0')
            console.log('%c' + levelName + '   ' + dateString + '      ' + message, logLevelStyles[level]);
        }
    }
}

Log.debug =     logAtLevel(Log.DEBUG, 'DEBUG  ');
Log.info =       logAtLevel(Log.INFO, 'INFO   ');
Log.warning = logAtLevel(Log.WARNING, 'WARNING');
Log.error =     logAtLevel(Log.ERROR, 'ERROR  ');
Log.raw = function(message) {console.log(message)};

export {Log};
