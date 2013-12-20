var async = require('async');
var _ = require('lodash');
var uuid = require('uuid');
var shortid = require('shortid');
var debug = require('debug')('artifactmgr:core:instances');

var normalizeHostAddress = require('./hosts').normalizeHostAddress;
var instanceStore = require('../../store').instanceStore;
var runStore = require('../../store').instanceRunStore;
var deployer = require('./instanceDeployer');
var runner = require('./instanceRunner');
var moment = require('moment');



var logErr = function(err) {
    if (err) console.error(err);
};

exports.create = function(instance, defer, callback) {
    callback = _.once(callback);

    normalizeHostAddress(instance.id);

    instance.id.instanceName =
        instance.id.instanceName ||
        'i-' + instance.links.artifact.id.artifactName + '-' + uuid.v4();

    instance.config = instance.config || {};
    instance.metadata = instance.metadata || {};
    instance.metadata.created = moment().format();

    instance.status = 'deploying';

    var actions = {};

    actions.status = async.apply(instanceStore.setStatus, instance.id, instance.status);

    if (instance.metadata) actions.metadata =
        async.apply(instanceStore.setMetadata, instance.id, instance.metadata);

    if (instance.config) actions.config =
        async.apply(instanceStore.setConfig, instance.id, instance.config);

    actions.links = function(callback) {
        instanceStore.getLinks(instance.id, function(err, links) {
            if (err) return callback(err);

            links = links || {};

            if (instance.links.artifact)
                links.artifact = instance.links.artifact;

            instanceStore.setLinks(instance.id, links, function(err) {
                callback(err, links);
            });
        });
    };

    debug('instance prepared for deployment', instance);

    async.parallel([
        async.apply(async.waterfall, [
            async.apply(deployer.deploy, instance),
            function (updatedInstance, cbWaterfall) {
                instance.config = updatedInstance.config;
                instance.links = updatedInstance.links;
                instance.status = 'deployed';
                instance.metadata.updated = moment().format();

                debug('instance deployed', instance);

                async.parallel([
                    async.apply(instanceStore.setMetadata, instance.id, instance.metadata),
                    async.apply(instanceStore.setConfig, instance.id, instance.config),
                    async.apply(instanceStore.setLinks, instance.id, instance.links),
                    async.apply(instanceStore.setStatus, instance.id, instance.status)
                ], cbWaterfall);
            }
        ]),
        function (cbParallel) {
            async.parallel(actions, function(err, results) {
                if (err) {            
                    instanceStore.setStatus(instance.id, 'error', logErr);
                    
                    return cbParallel(err);
                }

                instance.metadata = results.metadata || instance.metadata;
                instance.links = results.links;

                if (!defer) callback(null, { id: instance.id,
                                             status: instance.status,
                                             metadata: instance.metadata,
                                             config: results.config || instance.config,
                                             links: instance.links });

                cbParallel(err);
            });
        }
    ], function(err) {
        if (err) {
            instanceStore.setStatus(instance.id, 'error', logErr);

            callback(err);
        } else callback(null, { id: instance.id,
                                status: instance.status,
                                metadata: instance.metadata,
                                config: instance.config,
                                links: instance.links });
    });
};

exports.get = function(id, callback) {
    normalizeHostAddress(id);

    async.parallel({
        status: async.apply(instanceStore.getStatus, id),
        metadata: async.apply(instanceStore.getMetadata, id),
        config: async.apply(instanceStore.getConfig, id),
        links: async.apply(instanceStore.getLinks, id)
    }, function(err, instance) {
        if (err) {
            callback(err);
        } else if (!instance.status) {
            callback({ code: 404, id: id, message: 'There is no instance ' + id.instanceName });
        } else {
            instance.id = id;

            callback(null, instance);
        }
    });
};



exports.runs = {};

exports.runs.create = function(run, context, defer, callback) {
    callback = _.once(callback);

    normalizeHostAddress(run.id);

    run.id.runName = 'r-' + moment().unix() + '-' + shortid.generate();

    context = context || {};
    context.runId = run.id;

    run.metadata = run.metadata || {};
    run.metadata.started = moment().format();

    run.results = {};

    run.links = { instance: { id: {
        namespace: run.id.namespace,
        hostAddress: run.id.hostAddress,
        instanceName: run.id.instanceName
    } } };

    run.status = 'running';

    async.parallel([
        function(cbParallel) {
            runStore.setStatus(run.id, run.status, function(err) {
                if (err) return cbParallel(err);

                if (!defer) callback(null, { id: run.id,
                                             status: run.status,
                                             metadata: run.metadata,
                                             config: run.config,
                                             links: run.links }, context);

                cbParallel();
            });
        },
        function(cbParallel) {
            runner.run(run, context, function(err, updatedRun, updatedContext) {
                run = updatedRun;

                if (err) return cbParallel(err);

                debug('run completed', updatedRun);

                context = _.merge(context, updatedContext);

                run.status = 'completed';
                run.metadata.completed = moment().format();

                async.parallel([
                    async.apply(runStore.setStatus, run.id, run.status),
                    async.apply(runStore.setMetadata, run.id, run.metadata),
                    async.apply(runStore.setConfig, run.id, run.config),
                    async.apply(runStore.setResults, run.id, run.results),
                    async.apply(runStore.setLinks, run.id, run.links)
                ], cbParallel);
            });
        }
    ], function(err) {
        if (err) {
            runStore.setStatus(run.id, 'error', logErr);
            runStore.setResults(run.id, run.results, logErr);

            callback(err);
        } else {
            callback(null, { id: run.id,
                             status: run.status,
                             metadata: run.metadata,
                             config: run.config,
                             results: run.results,
                             links: run.links }, context);
        }
    });
};

exports.runs.get = function(id, callback) {
    normalizeHostAddress(id);

    async.parallel({
        status: async.apply(runStore.getStatus, id),
        metadata: async.apply(runStore.getMetadata, id),
        config: async.apply(runStore.getConfig, id),
        results: async.apply(runStore.getResults, id),
        links: async.apply(runStore.getLinks, id)
    }, function(err, run) {
        if (err) {
            callback(err);
        } else if (!run.status) {
            callback({ code: 404, id: id, message: 'There is no run ' + id.runName });
        } else {
            run.id = id;

            callback(null, run);
        }
    });
};
