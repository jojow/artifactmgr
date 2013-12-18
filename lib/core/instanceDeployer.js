var spawn = require('child_process').spawn;
var async = require('async');
var fs = require('fs-extra');
var _ = require('lodash');
var path = require('path');
var debug = require('debug')('artifactmgr:core:instances');

var insertDefaults = require('./instanceHelper').insertDefaults;
var artifactStore = require('../../store').artifactStore;
var artifactFileStore = require('../../store').artifactFileStore;
var hostStore = require('../../store').hostStore;
var enrichHost = require('../access/hostEnricher').enrich;



var deployDependencies = function(host, parentIndex, parentConfig, mainDir, artifactDeps, callback) {
    async.eachLimit(artifactDeps, 1, function(artifactDep, cbEach) {
        if (artifactDep._deployed) return cbEach();

        artifactDep.parent = parentIndex;

        if (parentIndex === 'instance') parentIndex = -1;

        artifactDep.config.dir = path.resolve(mainDir, '..', artifactDep.id.namespace + '-' +
                                                             artifactDep.id.artifactName + '-' +
                                                             artifactDep.id.artifactVersion);

        async.waterfall([
            async.apply(async.parallel, {
                spec: async.apply(artifactStore.getSpec, artifactDep.id),
                impl: async.apply(artifactStore.getImpl, artifactDep.id),
                links: async.apply(artifactStore.getLinks, artifactDep.id),
                files: async.apply(artifactFileStore.getFiles, artifactDep.id)
            }),
            function (data, cbWaterfall) {            
                async.parallel([
                    async.apply(host.storeArtifactFiles, artifactDep.config.dir, data.files, false),
                    function(cbParallel) {
                        if (data.links.dependencies)
                            artifactDep.children = _.range(_.size(artifactDeps) - 1, _.size(artifactDeps) + _.size(data.links.dependencies) - 1);

                        artifactDep.spec = data.spec;
                        artifactDep.impl = data.impl;
                        artifactDep._deployed = true;
                        
                        if (data.links.dependencies) {                            
                            artifactDeps = _.union(artifactDeps, data.links.dependencies.reverse());
                        
                            deployDependencies(host, ++parentIndex, artifactDep.config, mainDir, artifactDeps, cbParallel);
                        } else cbParallel();
                    }
                ], cbWaterfall);
            }
        ], function (err, results) {
            cbEach(err)
        });
    }, function(err) {
        callback(err, artifactDeps);
    });
};

var deployArtifact = function(host, instance, artifactDeps, callback) {
    if (!artifactDeps) return callback(null, instance);

    deployDependencies(host, 'instance', instance.config, instance.config.dir, artifactDeps, function(err, deps) {
        if (err) return callback(err);

        instance.links.dependencies = deps.reverse();

        var size = _.size(instance.links.dependencies);

        _.each(instance.links.dependencies, function(dep) {
            delete dep._deployed;

            if (dep.parent !== 'instance') dep.parent = size - 1 - dep.parent;
            
            if (dep.children) _.map(dep.children, function(index) {
                return size - index - 1;
            });
        });

        callback(err, instance);
    });
};



exports.deploy = function(instance, callback) {
    var host = { id: {
        namespace: instance.id.namespace,
        hostAddress: instance.id.hostAddress
    } };

    async.waterfall([
        async.apply(async.parallel, {
            hostConfig: async.apply(hostStore.getConfig, host.id),
            status: async.apply(artifactStore.getStatus, instance.links.artifact.id),
            spec: async.apply(artifactStore.getSpec, instance.links.artifact.id),
            impl: async.apply(artifactStore.getImpl, instance.links.artifact.id),
            links: async.apply(artifactStore.getLinks, instance.links.artifact.id)
        }),
        function(data, cbParallel) {
            if (!data.hostConfig)
                return callback('Host does not exist: ' + JSON.stringify(host));

            if (!data.status || data.status === 'empty')
                return callback('Artifact does not exist: ' + JSON.stringify(instance.links.artifact));

            host.config = data.hostConfig;
            enrichHost(host);
            host.init(function(err) {
                if (err) {
                    host.cleanup(function(cleanupErr) {
                        if (cleanupErr) debug('host cleanup error', cleanupErr);
                    });

                    return cbParallel(err);
                }

                instance.links.artifact.spec = data.spec;
                instance.links.artifact.impl = data.impl;
                
                instance.config = insertDefaults(instance.config, data.spec);

                if (!instance.config.dir)
                    instance.config.dir = path.join(host.commands.baseDir(),
                                                    'instance-' + instance.id.namespace + '-' + instance.id.instanceName,
                                                    'main');

                async.parallel({
                    updatedInstance: async.apply(deployArtifact, host, instance, data.links.dependencies),
                    _storeFiles: async.apply(host.storeArtifactFiles, instance.config.dir, data.links.files, false)
                },
                function(err, results) {
                    host.cleanup(function(cleanupErr) {
                        if (err) return cbParallel(err);
                        else if (cleanupErr) return cbParallel(cleanupErr);

                        if (data.links.dependencies && _.size(data.links.dependencies) > 0) {
                            var sizeArtifactDeps = _.size(data.links.dependencies);
                            var sizeInstanceDeps = _.size(results.updatedInstance.links.dependencies);

                            results.updatedInstance.links.artifact.children =
                                _.range(sizeInstanceDeps - sizeArtifactDeps, sizeInstanceDeps);
                        }

                        cbParallel(null, results.updatedInstance);
                    });
                });
            });
        }
    ], callback);
};
