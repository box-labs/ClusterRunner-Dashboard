ClusterRunner Dashboard
=======================

These are a few visualizations for monitoring the status and health of a ClusterRunner cluster. Read more about
ClusterRunner at [clusterrunner.com](clusterrunner.com) and in the [ClusterRunner repo](https://github.com/box/ClusterRunner).

Dashboards are loaded via `index.php` in their respective directories. 


Slave Monitor
-------------
This is a visualization of the current status of your cluster. It shows builds as they are queued and which slaves
are working on each build.

To build the javascript run:
```bash
npm install -g watchify  # only needed first time only
slave_monitor/watchify.sh
```
Watchify will run in the background and rebuild the single javascript file `bundle.js` whenever you make edits.

The url of the ClusterRunner master is specified using the `master` query paramter. Alternatively, you may also specify
the master's url in the [`dashboard.ini`](dashboard.ini) conf file.

The main code entry point from index.php is 
[ClusterRunnerSlaveMonitor.js](slave_monitor/js/ClusterRunnerSlaveMonitor.js).


Timeline
--------
This is a visualization of build execution over time. The timeline dashboard by default shows the start and end time
for subjobs of every build during the last thirty minutes, but both the overall time window and the displayed builds
can be adjusted using query parameters. See the code at the top of [timeline/index.php](timeline/index.php) for query 
parameter documentation.

To build the javascript run:
```bash
npm install -g watchify  # only needed first time only
timeline/watchify.sh
```
Watchify will run in the background and rebuild the single javascript file `bundle.js` whenever you make edits.

The url of the ClusterRunner master is specified using the `master` query paramter. Alternatively, you may also specify
the master's url in the [`dashboard.ini`](dashboard.ini) conf file. Again, more query params are defined in
[timeline/index.php](timeline/index.php) for adjusting the displayed time window.

There are several classes here. A [ClusterRunnerTimeline](timeline/js/ClusterRunnerTimeline.js) object instantiates a
[D3Timeline](timeline/js/D3Timeline.js) object. I'd like to keep all ClusterRunner-specific logic in the 
ClusterRunnerTimeline object and try to build D3Timeline as a generic event-based timeline drawing library.


---

### Copyright and License

Copyright 2015 Joseph Harrington. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
