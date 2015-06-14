#!/bin/bash

BASEDIR=$(dirname $0)
watchify ${BASEDIR}/js/clusterrunner_timeline_main.js -v -d -o ${BASEDIR}/clusterrunner_timeline.js
