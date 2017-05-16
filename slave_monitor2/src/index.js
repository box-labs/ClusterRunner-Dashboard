
import conf from './dashboard_conf';
import SlaveMonitor from './slave_monitor';
import Log from './Log';

console.log(conf);
console.log(SlaveMonitor);

// $conf = parse_ini_file('../dashboard.ini', true);
// if ($conf === false) {
//     $conf = parse_ini_file('../dashboard_defaults.ini', true);
// }
// $hostAbbrevRegex = $conf['slave_monitor']['host_abbreviation_regex'];
// $repoNameRegex = $conf['slave_monitor']['repo_name_regex'] ?: '(.*)';
// /** @var $master_url - The url of the master host, including the port (e.g., "cluster-master.box.com:43000") */
// $masterUrl = $_GET['master'] ?: $conf['master_url'];
// $apiProxyUrl = $_SERVER['HTTP_HOST'] . '/api.php';  // proxy requests through this host
// /** @var $debugMode - Set to "true" to start the dashboard with fake data -- useful for debugging dashboard changes */
// $debugMode = $_GET['debug'] == 'true';


let masterUrl = conf.master_url;
if (masterUrl.indexOf(':') < 0) {
    masterUrl += ':43000';  // append default port to master url if not present
}

let hostAbbrevRegex = conf.slave_monitor.host_abbreviation_regex || null;
let repoNameRegex = conf.slave_monitor.repo_name_regex || null;

let w = window;
w.DEBUG_MODE = conf.debug;
Log.setLevel(Log.WARNING);
// if (w.DEBUG_MODE) {
//     Log.setLevel(Log.DEBUG);
//     //FakeData.beginAutoRepeatingProgression();
//     FakeData.progressDataSequence();
//     FakeData.progressDataSequence();
//     FakeData.progressDataSequence();
// }

let monitor = new SlaveMonitor('.dashboard', masterUrl, hostAbbrevRegex, repoNameRegex);
monitor.startMonitor();
