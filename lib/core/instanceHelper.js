var _ = require('lodash');

exports.insertDefaults = function(config, spec) {
    if (!spec || !spec.input) return config;
    else if (!config) config = {};

    _.each(spec.input, function(val, key) {
        if (!_.has(config, key) && val.default) config[key] = val.default;
    });

    return config;
};
