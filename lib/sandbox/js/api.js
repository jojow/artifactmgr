var _ = require('lodash');
_.str = require('underscore.string');
var shortid = require('shortid');
var moment = require('moment');
var request = require('request');
var debug = require('debug')('artifactmgr:sandbox');

var prefix = '[sandcastle] [apicall] ';

var apiCall = function(functionName) {
    return function() {
        if (!process.stdin._apiCallbacks) {
            process.stdin._apiCallbacks = {};

            process.stdin.on('data',  function(data) {
                data = data.toString();

                if (!_.str.startsWith(data, prefix)) return;

                var message = JSON.parse(data.substr(_.size(prefix), _.size(data)));

                if (!process.stdin._apiCallbacks[message.corr]) return;

                var args = [ message.err ];
                if (message.data) args.push(message.data);
                if (message.context) args.push(message.context);

                process.stdin._apiCallbacks[message.corr].apply(this, args);
                delete process.stdin._apiCallbacks[message.corr];
            });
        }

        var corr = moment().unix() + '-' + shortid.generate();
        var args = _.toArray(arguments);
        var callback = _.last(args);

        if (!_.isFunction(callback)) throw new Error(callback.toString() + ' is not a function.');

        process.stdin._apiCallbacks[corr] = callback;

        process.stdout.write(prefix + JSON.stringify({ corr: corr, func: functionName, args: _.initial(args) }));
    };
};

var api = {
    JSON: JSON,
    debug: debug,
    _: _,
    shortid: shortid,
    request: request,
    async: require('../../../lib/sandbox/js/async_fixed'),
    path: require('path'),
    converters: require('../../../lib/util/converters'),
    clartigr: {
        artifacts: {
            create: apiCall('artifacts.create'),
            update: apiCall('artifacts.update'),
            getAll: apiCall('artifacts.getAll'),
            get: apiCall('artifacts.get'),
            remove: apiCall('artifacts.remove'),
            removeAll: apiCall('artifacts.removeAll')
        },
        instances: {
            create: apiCall('instances.create'),
            update: apiCall('instances.update'),
            getAll: apiCall('instances.getAll'),
            get: apiCall('instances.get'),
            remove: apiCall('instances.remove'),
            removeAll: apiCall('instances.removeAll'),
            runs: {
                create: apiCall('instances.runs.create'),
                getAll: apiCall('instances.runs.getAll'),
                get: apiCall('instances.runs.get')
            }
        },
        hosts: {
            create: apiCall('hosts.create'),
            update: apiCall('hosts.update'),
            getAll: apiCall('hosts.getAll'),
            get: apiCall('hosts.get'),
            remove: apiCall('hosts.remove'),
            removeAll: apiCall('hosts.removeAll')
        },
        access: apiCall('access')
    }
};

var enrich = require('../../../lib/access/hostEnricher').enrich;

api.enrichHost = function(host) {
    return enrich(host, api.access, true);
};

exports.apiCallPrefix = prefix;

exports.api = api;
