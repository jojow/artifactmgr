var _ = require('lodash');

var funcNames = require('./funcNames');

var modules = {};

module.exports = function() {
    var args = _(arguments);
    var accessId = args.shift();
    var funcName = args.shift();
    args = args.value();

    if (!modules[accessId]) {
        modules[accessId] = require('./' + accessId);

        _(funcNames).forEach(function(funcName) {
            if (!modules[accessId][funcName])
                modules[accessId][funcName] = function() {
                    var callback = _(arguments).last();

                    if (_.isFunction(callback)) callback();
                };
        });
    }

    return modules[accessId][funcName].apply(this, args);
};
