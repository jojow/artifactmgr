var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var streamifier = require('streamifier');
var path = require('path');
var request = require('request');
var debug = require('debug')('artifactmgr:artifacts');

var artifactStore = require('../../store').artifactStore;
var fileStore = require('../../store').artifactFileStore;



var logErr = function(err) {
    if (err) console.error(err);
};

var update = function(artifact, defer, callback) {
    callback = _.once(callback);

    if (!artifact.status) {
        if (artifact.links && artifact.links.files) artifact.status = 'storing';
        else artifact.status = 'stored';
    }

    var actions = {};

    actions.status = async.apply(artifactStore.setStatus, artifact.id, artifact.status);

    if (artifact.spec) actions.spec =
        async.apply(artifactStore.setSpec, artifact.id, artifact.spec);

    if (artifact.impl) actions.impl =
        async.apply(artifactStore.setImpl, artifact.id, artifact.impl);

    if (artifact.metadata) actions.metadata =
        async.apply(artifactStore.setMetadata, artifact.id, artifact.metadata);

    actions.links = function(callback) {
        artifactStore.getLinks(artifact.id, function(err, links) {
            if (err) return callback(err);

            links = links || {};

            if (artifact.links && artifact.links.dependencies) {
                links.dependencies = _.map(artifact.links.dependencies, function(dep) {
                    return { id: dep.id, config: dep.config };
                });
            }

            if (artifact.links && artifact.links.files && links.files)
                delete links.files;

            artifactStore.setLinks(artifact.id, links, function(err) {
                callback(err, links);
            });
        });
    };

    async.parallel(actions, function(err, results) {
        debug('artifact updated');

        if (err) {
            artifactStore.setStatus(artifact.id, 'error', logErr);
    
            return callback(err);
        }

        if (artifact.links.files) {
            var files = _.map(artifact.links.files, function(file) {
                if (!file || !file.id) return callback('File ID missing: ' + file);

                file.id = _.merge(file.id, artifact.id);

                return file;
            });

            async.series({
                _create: async.apply(async.eachLimit, files, 1, exports.files.create),
                links: async.apply(artifactStore.getLinks, artifact.id)
            }, function(err, resultsSeries) {
                debug('artifact files updated');

                if (err) {
                    logErr(err);

                    artifact.status = 'error';
                } else {
                    artifact.status = 'stored';
                }

                artifactStore.setStatus(artifact.id, artifact.status, logErr);

                if (defer) callback(err, { id: artifact.id,
                                           status: artifact.status,
                                           metadata: artifact.metadata || results.metadata,
                                           spec: artifact.spec || results.spec,
                                           impl: artifact.impl || results.impl,
                                           links: resultsSeries.links });
            });
        }

        if (!defer || !artifact.links.files) callback(null, { id: artifact.id,
                                                              status: artifact.status,
                                                              metadata: artifact.metadata || results.metadata,
                                                              spec: artifact.spec || results.spec,
                                                              impl: artifact.impl || results.impl,
                                                              links: results.links });
    });
};



exports.create = function(artifact, defer, callback) {
    if (!artifact.links && !artifact.spec && !artifact.impl && !artifact.metadata) {
        artifact.status = 'empty';
    }

    artifact.spec = artifact.spec || {};
    artifact.impl = artifact.impl || {};
    artifact.metadata = artifact.metadata || {};

    if (!artifact.id.artifactName) {
        artifact.id.artifactName = 'a-' + uuid.v4();
        artifact.id.artifactVersion = '1-gen';
    }

    if (!artifact.id.artifactVersion) {
        artifactStore.getArtifacts(artifact.id, function(err, refs) {
            var versions = _.map(refs, function(ref) { return ref.id.artifactVersion; });

            var ver = 1;

            while (true) {
                if (!_.contains(versions, ver + '-gen')) {
                    artifact.id.artifactVersion = ver + '-gen';

                    update(artifact, defer, callback);

                    break;
                } else ver++;
            }
        });
    } else {
        update(artifact, defer, callback);
    }
};

/*
exports.get = function(id, callback) {
    async.parallel({
        status: async.apply(artifactStore.getStatus, id),
        metadata: async.apply(artifactStore.getMetadata, id),
        spec: async.apply(artifactStore.getSpec, id),
        impl: async.apply(artifactStore.getImpl, id),
        links: async.apply(artifactStore.getLinks, id)
    },
    function(err, artifact) {
        if (err) {
            callback(err);
        } else if (!artifact.status) {
            callback({ code: 404, context: { id: id }, message: 'There is no artifact ' + id.artifactName });
        } else {
            artifact.id = id;

            callback(null, artifact);
        }
    });
};
*/

var putFile = function(file, callback) {
    if (!file.id.filePath) return callback('Invalid file: file path missing.');
    
    file.id.filePath = path.normalize(file.id.filePath);

    async.series([
        function(callback) {
            if (file.url) {
                async.parallel([
                    async.apply(fileStore.setMetadata, file.id, { source: { url: file.url } }),
                    function(callback) {
                        fileStore.contentWriteStream(file.id, function(writeStream) {
                            request.get({
                                url: file.url,
                                headers: { 'Accept': 'application/octet-stream' }
                            }).pipe(writeStream).on('finish', function(err) {
                                if (!err) debug('file fetched', file.id.filePath);

                                callback(err);
                            }).on('error', function(err) {
                                callback(err);
                            });
                        });
                    }
                ], callback);
            } else if (file.base64) {
                fileStore.contentWriteStream(file.id, function(writeStream) {
                    var readStream = streamifier.createReadStream(new Buffer(file.base64, 'base64'));

                    readStream.pipe(writeStream).on('finish', function(err) {
                        if (!err) debug('file decoded', file.id.filePath);

                        callback(err);
                    }).on('error', function(err) {
                        callback(err);
                    });
                });
            } else {
                fileStore.setContent(file.id, file.text, callback);
            }
        },
        async.apply(fileStore.setStatus, file.id, file.status)
    ], callback);
};



exports.files = {};

exports.files.create = function(file, callback) {
    file.id.filePath = path.normalize(file.id.filePath);

    file.status = 'stored';

    file.links = { artifact: { id: {
                     namespace: file.id.namespace,
                     artifactName: file.id.artifactName,
                     artifactVersion: file.id.artifactVersion
                 } } };

    async.parallel([
        function(callback) {
            artifactStore.getLinks(file.id, function(err, links) {
                if (err) return callback(err);

                links.files = links.files || [];

                links.files.push({ id: file.id });

                async.parallel([
                    async.apply(artifactStore.setLinks, file.id, links),
                    async.apply(fileStore.setLinks, file.id, file.links)
                ], callback);
            });
        },
        async.apply(putFile, file)
    ], function(err) {
        debug('file updated', file.id.filePath);

        callback(err, { id: file.id,
                        status: file.status,
                        metadata: file.metadata,
                        links: file.links });
    });
};