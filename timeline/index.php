<!DOCTYPE html>
<?php

$conf = parse_ini_file('../dashboard.ini', true);

/** @var $master_url - The url of the master host, including the port (e.g., "cluster-master.box.com:43000") */
$master_url = $_GET['master'] ?: $conf['master_url'];

/** @var $start_time - The unix timestamp of when the timeline should begin */
$start_time = $_GET['start_time'] ?: 'null';

/** @var $end_time - The unix timestamp of when the timeline should end */
$end_time = $_GET['end_time'] ?: 'null';

/** @var $span - A duration expression, relative to either start_time or end_time (e.g., "30m" or "1h")
 *               Note that only two of [start_time, end_time, span] can logically be specified. */
$span = $_GET['span'] ?: 'null';

/** @var $build_ids - A comma separated list of build ids to display (e.g., "1521,1522")
 *                    Note that currently you must set the time-based query parameters so that the build ids you are
 *                    trying to display are within the specified time window. */
$build_ids = $_GET['build_ids'] ? array_map('intval', explode(',', $_GET['build_ids'])) : null;  // e.g., "1521, 1522"

/** @var $rainbowize - Moar colors (not very useful...) */
$rainbowize = $_GET['rainbowize'] ?: 'null';

?>

<html>
<head>
    <link rel="stylesheet" href="d3_timeline.css">
    <link rel="stylesheet" href="clusterrunner_timeline.css">
    <script type="text/javascript" src="lib/d3.min.js"></script>
    <script type="text/javascript" src="lib/d3-tip.js"></script>
    <!-- The file "clusterrunner_timeline.js" is generated. See README.md for details. -->
    <script type="text/javascript" src="clusterrunner_timeline.js"></script>
</head>

<body>
<div class="clusterRunnerHeader"><div class="clusterRunnerTitle"><h2>ClusterRunner</h2></div></div>

<div class="dashboard"></div>

<script type="text/javascript">
    var masterUrl = '<?php echo $master_url ?>';
    if (masterUrl.indexOf(':') < 0) {
        masterUrl += ':43000';  // append default port to master url if not present
    }

    var startTime = <?php echo $start_time ?>;
    var endTime = <?php echo $end_time ?>;
    var span = '<?php echo $span ?>';
    var rainbowize = <?php echo $rainbowize ?>;
    var buildIds = JSON.parse('<?php echo json_encode($build_ids) ?>');

    var eventFilter = buildIds ? {'build_id': buildIds} : null;
    var timeline = new ClusterRunnerTimeline('.dashboard', rainbowize, masterUrl, eventFilter);
    timeline.startTimeline(span, startTime, endTime);
</script>
</body>
</html>
