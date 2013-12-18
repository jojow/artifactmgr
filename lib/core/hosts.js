var async = require('async');
var _ = require('lodash');
var debug = require('debug')('artifactmgr:core:hosts');

var defaultCommands = require('../util/commands').defaults;
var store = require('../../store').hostStore;



var normalizeHostAddress = function(id) {
    if (id.namespace === 'local' && (id.hostAddress === '127.0.0.1' || id.hostAddress === '::1'))
        id.hostAddress = 'localhost';

    if (id.hostAddress) id.hostAddress = id.hostAddress.toLowerCase();

    return id;
};



exports.normalizeHostAddress = normalizeHostAddress;

exports.create = function(host, callback) {
    normalizeHostAddress(host.id);

    host.metadata = host.metadata || {};

    if (host.config) {
        host.config.sudo = host.config.sudo || {};

        if (!host.config.commands)
            host.config.commands = {};

        host.config.commands = _.merge(defaultCommands, host.config.commands);
    }

    host.status = 'online';

    var actions = {};

    actions.status = async.apply(store.setStatus, host.id, host.status);

    if (host.metadata) actions.metadata =
        async.apply(store.setMetadata, host.id, host.metadata);
    else actions.metadata =
        async.apply(store.getMetadata, host.id);

    if (host.config) actions.config =
        async.apply(store.setConfig, host.id, host.config);
    else actions.config =
        async.apply(store.getConfig, host.id);

    actions.links = function(callback) {
        store.getLinks(host.id, function(err, links) {
            if (!links) {
                store.setLinks(host.id, {}, function(err) {
                    callback(err, {});
                })
            } else callback(null, links);
        });
    };

    async.parallel(actions, function(err, results) {
        callback(err, { id: host.id,
                        status: host.status,
                        config: host.config || results.config,
                        metadata: host.metadata || results.metadata,
                        links: results.links });
    });
};

exports.get = function(id, callback) {
    normalizeHostAddress(id);

    async.parallel({
        status: async.apply(store.getStatus, id),
        config: async.apply(store.getConfig, id),
        metadata: async.apply(store.getMetadata, id),
        links: async.apply(store.getLinks, id)
    },
    function(err, host) {
        if (err) {
            callback(err);
        } else if (!host.status) {
            callback({ code: 404, context: { id: id }, message: 'There is no host ' + id.hostAddress });
        } else {
            host.id = id;

            callback(null, host);
        }
    });
};
