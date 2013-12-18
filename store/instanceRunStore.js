var _ = require('lodash');

var db = {};

var get = function(id, field) {
    if (!db[stringify(id)]) return null;

    return _.cloneDeep(db[stringify(id)][field]);
};

var set = function(id, field, value) {
    if (!db[stringify(id)]) db[stringify(id)] = { id: id };

    db[stringify(id)][field] = value;
};

var stringify = function(id) {
    if (id.runName) return id.namespace + ':' + id.hostAddress + ':' + id.instanceName + ':' + id.runName;
    else if (id.instanceName) return id.namespace + ':' + id.hostAddress + ':' + id.instanceName;
    else if (id.hostAddress) return id.namespace + ':' + id.hostAddress;
    else if (id.namespace) return id.namespace;
    else return '';
};

exports.setStatus = function(id, status, callback) {
    set(id, 'status', status);

    callback();
};

exports.getStatus = function(id, callback) {
    callback(null, get(id, 'status'));
};

exports.setMetadata = function(id, metadata, callback) {
    set(id, 'metadata', metadata);

    callback();
};

exports.getMetadata = function(id, callback) {
    callback(null, get(id, 'metadata'));
};

exports.setLinks = function(id, links, callback) {
    set(id, 'links', links);

    callback();
};

exports.getLinks = function(id, callback) {
    callback(null, get(id, 'links'));
};

exports.setConfig = function(id, config, callback) {
    set(id, 'config', config);

    callback();
};

exports.getConfig = function(id, callback) {
    callback(null, get(id, 'config'));
};

exports.setResults = function(id, results, callback) {
    set(id, 'results', results);

    callback();
};

exports.getResults = function(id, callback) {
    callback(null, get(id, 'results'));
};

exports.getRuns = function(id, callback) {
    callback(null, _.map(db, function(entry) { return entry; }));
};