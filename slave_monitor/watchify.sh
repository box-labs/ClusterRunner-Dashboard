#!/bin/bash

BASEDIR=$(dirname $0)
watchify $BASEDIR/js/main.js -v -d -o $BASEDIR/bundle.js

