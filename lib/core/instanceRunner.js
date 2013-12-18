var spawn = require('child_process').spawn;
var async = require('async');
var fs = require('fs');
var _ = require('lodash');
_.str = require('underscore.string');
var path = require('path');
var jsSandbox = require('../sandbox/js');
var debug = require('debug')('artifactmgr:core:instances');

var insertDefaults = require('./instanceHelper').insertDefaults;
var hostStore =  require('../../store').hostStore;
var instanceStore =  require('../../store').instanceStore;
var enrichHost = require('../access/hostEnricher').enrich;

var runtime = {
    'sandbox-js': function(impl, input, context, callback) {
        if (!impl.exec) impl.exec = '';
        else if (_.isArray(impl.exec)) impl.exec = impl.exec.join('\n');

        var execInSandbox = function(err, jsSource) {
            if (err) return callback(err);

            jsSource = '(function() {\
                            var exit = null;\
                            \
                            var output = context.results;\
                            \
                            var _updateOptions = function(options) {\
                                if (!options) options = {};\
                                if (!options.encoding) options.encoding = "utf8";\
                                \
                                return options;\
                            };\
                            \
                            var _env = {};\
                            \
                            var host = enrichHost(context.host);\
                            var dir = context.dir;\
                            \
                            var setEnvSync = function(name, value) {\
                                _env[name] = value;\
                            };\
                            var setEnv = function(name, value, callback) {\
                                callback(null, setEnvSync(name, value));\
                            };\
                            var getEnvSync = function(name) {\
                                return _env[name];\
                            };\
                            var getEnv = function(name, callback) {\
                                callback(null, getEnvSync(name));\
                            };\
                            \
                            var writeFile = function(filePath, content, options, callback) {\
                                host.writeFile(path.resolve(dir, filePath), content, _updateOptions(options), callback);\
                            };\
                            var readFile = function(filePath, options, callback) {\
                                host.readFile(path.resolve(dir, filePath), _updateOptions(options), callback);\
                            };\
                            var fileWriteStream = function(filePath, options) {\
                                host.fileWriteStream(path.resolve(dir, filePath), _updateOptions(options));\
                            };\
                            var fileReadStream = function(filePath, options) {\
                                host.fileReadStream(path.resolve(dir, filePath), _updateOptions(options));\
                            };\
                            var exec = function(command, stdin, options, callback) {\
                                options = _updateOptions(options);\
                                \
                                if (options.cwd)\
                                    dir = path.resolve(dir, options.cwd);\
                                \
                                if (options.env)\
                                    _env = _.merge(_env, options.env);\
                                \
                                if (options.sudo)\
                                    command = host.commands.execSudoCmd({ dir: dir,\
                                                                          env: _env,\
                                                                          stdin: stdin,\
                                                                          command: command,\
                                                                          user: host.config.sudo.user,\
                                                                          password: host.config.sudo.password });\
                                else\
                                    command = host.commands.execCmd({ dir: dir,\
                                                                      env: _env,\
                                                                      stdin: stdin,\
                                                                      command: command });\
                                \
                                host.exec(command, stdin, options, callback);\
                            };'
                            + jsSource +
                       ';})();';

            jsSandbox.run(jsSource, input, context, callback);
        };

        if (impl.include) {
            if (!_.isArray(impl.include))
                impl.include = [ impl.include ];

            var includes = '';

            async.eachLimit(impl.include, 1, function(filePath, callback) {
                context.host.readFile(path.join(context.dir, filePath), null, function(err, content) {
                    if (err) return callback(err);

                    includes = includes + content + ';\n\n';

                    callback();
                });
            }, function(err) {
                impl.exec = includes + impl.exec;

                execInSandbox(err, impl.exec);
            });
        } else {
            execInSandbox(null, impl.exec);
        }
    }
};

var executeImpl = function(impl, input, context, callback) {
    runtime[impl.runtime](impl, input, context, callback);
};

var executeDep = function(host, run, dep, callback) {
    if (!dep.impl) return callback();

    var impl = dep.impl;
    var input = dep.config;
    var context = { host: host, dir: dep.config.dir, run: run, results: {} };

    executeImpl(impl, input, context, function(err, output, updatedContext) {
        if (err) return callback(err);

        var results = output || updatedContext.results;

        callback(null, results, updatedContext);
    });
};



exports.run = function(run, runContext, callback) {
    var host = { id: {
        namespace: run.id.namespace,
        hostAddress: run.id.hostAddress
    } };

    var instance = { id: {
        namespace: run.id.namespace,
        hostAddress: run.id.hostAddress,
        instanceName: run.id.instanceName
    } };

    async.waterfall([
        async.apply(async.parallel, {
            hostConfig: async.apply(hostStore.getConfig, host.id),
            config: async.apply(instanceStore.getConfig, instance.id),
            links: async.apply(instanceStore.getLinks, instance.id)
        }),
        function(data, cbParallel) {
            if (!data.hostConfig)
                return callback('Host does not exist: ' + JSON.stringify(host));

            if (!data.config)
                return callback('Instance does not exist: ' + JSON.stringify(instance));

            run.config = _.merge(data.config, run.config);

            run.links = data.links;
            run.links.instance = instance;
            run.links.instance.children = run.links.artifact.children;
            run.links.instance.spec = run.links.artifact.spec;
            run.links.instance.impl = run.links.artifact.impl;
            run.links.dependencies = run.links.dependencies || [];

            host.config = data.hostConfig;
            enrichHost(host);
            host.init(function(err) {
                if (err) {
                    host.cleanup(function(cleanupErr) {
                        if (cleanupErr) debug('host cleanup error', cleanupErr);
                    });

                    return cbParallel(err);
                }

                // resolve configs
                _(run.links.dependencies).reverse().forEach(function(dep) {
                    var parentConfig;
                    var spec;

                    if (dep.parent === 'instance') {
                        parentConfig = run.config;
                        spec = run.links.instance.spec;
                    } else {
                        parentConfig = run.links.dependencies[dep.parent].config;
                        spec = run.links.dependencies[dep.parent].spec;
                    }

                    dep.config = insertDefaults(dep.config, spec);
                }).reverse();

                // execute
                async.eachLimit(run.links.dependencies.concat([ _.merge( { config: run.config }, run.links.instance) ]), 1,
                function(dep, cbIterator) {
                    executeDep(host, run, dep, function(err, results, execContext) {
                        if (err) return cbIterator(err);

                        if (execContext.resStatus) runContext.resStatus = execContext.resStatus;
                        if (execContext.resHeaders) runContext.resHeaders = execContext.resHeaders;

                        if (!dep.parent) run.results = results;
                        else dep.results = results;

                        cbIterator();
                    });
                },
                function(err) {
                    host.cleanup(function(cleanupErr) {
                        if (err) return cbParallel(err);
                        else if (cleanupErr) return cbParallel(cleanupErr);

                        _(run.links.dependencies).forEach(function(dep) {
                            delete dep.spec;
                            delete dep.impl;
                            delete dep.results;
                        });

                        if (_.size(run.links.dependencies) === 0) delete run.links.dependencies;

                        delete run.links.artifact;
                        delete run.links.instance.spec;
                        delete run.links.instance.impl;

                        cbParallel(null, run, runContext);
                    });
                });
            });
        }
    ], callback);
};
