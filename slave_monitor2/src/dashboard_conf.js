export let dashboard_conf = {

    // The url of the cluster master -- set value in this conf file to avoid needing to specify in query params
    master_url: 'localhost:43000',

    debug: false,

    slave_monitor: {
        // Regex used for abbreviating the labels on slave hosts -- the regex is applied to the full host name and the first
        // matching group is extracted and used. The default is to extract the last numerical sequence before the port number.
        host_abbreviation_regex: '4300(\\\\d)$',

        repo_name_regex: '/([^/]+)/?$'
    }
};
