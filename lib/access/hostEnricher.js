var _ = require('lodash');

var funcNames = require('./funcNames');

exports.enrich = function(host, access, sandbox) {
    if (!sandbox) access = access || require('./');

    _(funcNames).forEach(function(funcName) {
        // some functions are not allowed in sandbox
        if (sandbox && (funcName === 'init' || funcName === 'cleanup' || funcName === 'storeArtifactFiles'))
            return;

        host[funcName] = function() {
            access.apply(host, [ host.config.access, funcName, host ].concat(_.toArray(arguments)));
        };
    });

    if (host.config.commands) {
        host.commands = {};

        _.each(host.config.commands, function(template, name) {
            host.commands[name] = _.template(template);
        });
    }

    return host;
};
