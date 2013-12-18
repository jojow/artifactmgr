var fs = require('fs');
var _ = require('lodash');
var path = require('path');

var transformers = require('../commons/transformers');
var artifacts = require('../lib/core/artifacts');
var instances = require('../lib/core/instances');

var runs = {};



var openToscaOpRunner = JSON.parse(_.template(fs.readFileSync(path.join(__dirname, '../commons/op-runner/openToscaOpRunner.json'), {enconding: 'utf8'}))({
    helper: new Buffer(
        fs.readFileSync(path.join(__dirname, '../commons/op-runner/files/helper.js'), {enconding: 'utf8'})).toString('base64'),
    scriptArtifactBuilder: new Buffer(
        fs.readFileSync(path.join(__dirname, '../commons/op-runner/files/scriptArtifactBuilder.js'), {enconding: 'utf8'})).toString('base64'),
    main: new Buffer(
        fs.readFileSync(path.join(__dirname, '../commons/op-runner/files/main.js'), {enconding: 'utf8'})).toString('base64')
}));

openToscaOpRunner.id = {
    namespace: 'opentosca',
    artifactName: 'op-runner',
    artifactVersion: 'v1'
};

var openToscaOpRunnerInstance = {
    id: {
        namespace: 'local',
        hostAddress: 'localhost',
        instanceName: 'op-runner'
    },
    links: {
        artifact: {
            id: openToscaOpRunner.id
        }
    }
}

artifacts.create(openToscaOpRunner, true, function(err) {
    if (err) return console.error(err);

    instances.create(openToscaOpRunnerInstance, true, function(err) {
        if (err) return console.error(err);
    })
});



exports.create = function(req, res, next) {
    transformers.run('PlainConfigInput', req.body, {}, req.context, function(err, output, updatedContext) {
        if (err) return next(err);

        req.body = output;
        req.body.id = openToscaOpRunnerInstance.id;
        req.context = updatedContext;

        instances.runs.create(req.body, req.context, true, function(err, localRunObj, context) {
            if (err) return next(err);

            runs[localRunObj.results.runId.runName] = localRunObj.results.runId;

            req.response = '';

            res.location('http://' + req.headers.host + req.path + '/' + localRunObj.results.runId.runName + '?resTransformer=OpenToscaOpRunnerOutput');
            res.status(201);

            next();
        });
    });
};

exports.get = function(req, res, next) {
    if (!runs[req.params.runName]) return next('run does not exist: ' + req.params.runName);

    var id = runs[req.params.runName];

    instances.runs.get(id, function(err, runObj) {
        if (err) return next(err);

        if (!runObj) return next('run does not exist: ' + req.params.runName);

        transformers.run('OpenToscaOpRunnerOutput', runObj, {}, req.context, function(err, output, updatedContext) {
            if (err) return next(err);

            req.response = output;
            req.context = updatedContext;

            next();
        });
    });
};