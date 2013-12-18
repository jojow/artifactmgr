var path = require('path');
var fs = require('fs');
var _ = require('lodash');
_.str = require('underscore.string');
var spawn = require('child_process').spawn;

var timeoutSecs = 600;

var SandCastle = require('sandcastle').SandCastle;
var sandcastle = new SandCastle({ timeout: timeoutSecs * 1000 });

var api = {
    artifacts: require('../../core/artifacts'),
    instances: require('../../core/instances'),
    hosts: require('../../core/hosts'),
    access: require('../../access')
};

var prefix = require('./api').apiCallPrefix;

var sandcastleAPI = fs.readFileSync(path.join(__dirname, 'api.js')).toString();



var execFunctionByName = function(functionName, context, args) {
    var namespaces = functionName.split('.');
    var func = namespaces.pop();

    for(var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }

    return context[func].apply(this, args);
};



var apiListener = function(data) {
    data = data.toString();

    if (!_.str.startsWith(data, prefix)) return;

    var message = JSON.parse(data.substr(_.size(prefix), _.size(data)));

    message.args.push(function(err, data, context) {
        var reply = { corr: message.corr, err: err, data: data, context: context };

        sandcastle.sandbox.stdin.write(prefix + JSON.stringify(reply));
    });

    execFunctionByName(message.func, api, message.args);
};



exports.run = function(jsSource, input, context, callback) {
    if (!sandcastle.sandbox.stdout._apiListener) {
        sandcastle.sandbox.stdout._apiListener = apiListener;
        sandcastle.sandbox.stdout.on('data', apiListener);
    }

    var script = sandcastle.createScript('exports.main = function() {\
                                              var callback = _.once(function(err, output) {\
                                                  if (err) throw new Error(err);\
                                                  exit({ output: output, context: context });\
                                              });\
                                              ' + jsSource + '\
                                          }', { extraAPI: sandcastleAPI });

    script.on('exit', function(err, result) {
        if (err) return callback(err);

        callback(null, result.output, result.context);
    });

    script.on('timeout', function() {
        callback('Script timed out:\n' + jsSource);
    });

    script.run({ input: input, context: context });
};