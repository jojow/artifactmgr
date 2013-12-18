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
    if (id.artifactVersion) return id.namespace + ':' + id.artifactName + ':' + id.artifactVersion;
    else if (id.artifactName) return id.namespace + ':' + id.artifactName;
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

exports.setSpec = function(id, spec, callback) {
    set(id, 'spec', spec);

    callback();
};

exports.getSpec = function(id, callback) {
    callback(null, get(id, 'spec'));
};

exports.setImpl = function(id, impl, callback) {
    set(id, 'impl', impl);

    callback();
};

exports.getImpl = function(id, callback) {
    callback(null, get(id, 'impl'));
};

exports.getArtifacts = function(id, callback) {
    callback(null, _.map(db, function(entry) { return entry; }));
};