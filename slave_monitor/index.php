<!DOCTYPE html>
<?php

$conf = parse_ini_file('../dashboard.ini', true);
$hostAbbrevRegex = $conf['slave_monitor']['host_abbreviation_regex'];

/** @var $master_url - The url of the master host, including the port (e.g., "cluster-master.box.com:43000") */
$masterUrl = $_GET['master'] ?: $conf['master_url'];

/** @var $debugMode - Set to "true" to start the dashboard with fake data -- useful for debugging dashboard changes */
$debugMode = $_GET['debug'] == 'true';


?>
<html>
<head>
    <link rel="stylesheet" href="clusterrunner_slave_monitor.css">
    <script type="text/javascript" src="lib/d3.min.js"></script>
    <!-- The file "bundle.js" is generated. See README.md for details. -->
    <script type="text/javascript" src="bundle.js"></script>
</head>

<body>

    <div class="clusterRunnerHeader">
        <div class="clusterRunnerTitle"><h2>ClusterRunner Slave Monitor</h2></div>
    </div>

    <div class="dashboard"></div>

    <script type="text/javascript">
        var masterUrl = '<?php echo $masterUrl; ?>';
        if (masterUrl.indexOf(':') < 0) {
            masterUrl += ':43000';  // append default port to master url if not present
        }

        var hostAbbrevRegex = '<?php echo $hostAbbrevRegex ?>' || null;

        DEBUG_MODE = <?php echo $debugMode ? 'true' : 'false'; ?>;
        Log.setLevel(Log.WARNING);
        if (DEBUG_MODE) {
        //    Log.setLevel(Log.DEBUG);
            FakeData.beginAutoRepeatingProgression();
        }

        monitor = new ClusterRunnerSlaveMonitor('.dashboard', masterUrl, hostAbbrevRegex);
        monitor.startMonitor();
    </script>

</body>
</html>
