var path = require('path');
var fs = require('fs-extra');
var _ = require('lodash');

var baseDir = '/tmp/artifactmgr-artifact-files';

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
    if (id.filePath) {
        id.filePath = path.normalize(id.filePath);

        return id.namespace + ':' + id.artifactName + ':' + id.artifactVersion + ':' + id.filePath;
    } else{
        return id.namespace + ':' + id.artifactName + ':' + id.artifactVersion;
    }
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

exports.getFiles = function(id, callback) {
    callback(null, _.map(db, function(entry) { return entry; }));
};

exports.setContent = function(id, content, callback) {
    var basePath = path.join(baseDir, stringify(id));

    fs.mkdirsSync(basePath);

    fs.writeFile(path.join(basePath, path.basename(id.filePath)), content, callback);
};

exports.getContent = function(id, callback) {
    var basePath = path.join(baseDir, stringify(id));

    fs.readFile(path.join(basePath, path.basename(id.filePath)), callback);
};

exports.contentWriteStream = function(id, callback) {
    var basePath = path.join(baseDir, stringify(id));

    fs.mkdirsSync(basePath);

    var writeStream = fs.createWriteStream(path.join(basePath, path.basename(id.filePath)));

    callback(writeStream);
};

exports.contentReadStream = function(id, callback) {
    var basePath = path.join(baseDir, stringify(id));

    var readStream = fs.createReadStream(path.join(basePath, path.basename(id.filePath)));

    callback(readStream);
};