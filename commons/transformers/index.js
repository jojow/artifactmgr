var fs = require('fs');
var path = require('path');

var jsSandbox = require('../../lib/sandbox/js');

var transformers = {
    PlainConfigInput: fs.readFileSync(path.join(__dirname, 'PlainConfigInput.js'), {enconding: 'utf8'}),
    OpenToscaOpRunnerOutput: fs.readFileSync(path.join(__dirname, 'OpenToscaOpRunnerOutput.js'), {enconding: 'utf8'})
};

exports.exists = function(id) {
    return id && transformers[id];
};

exports.run = function(id, input, options, context, callback) {
    if (!id || !transformers[id]) return callback('There is no transformer: ' + id);

    context.options = options;

    jsSandbox.run(transformers[id], input, context, function(err, output, updatedContext) {
        delete context.options;

        if (err) return callback(err, null, context);

        delete updatedContext.options;

        callback(null, output, updatedContext);
    });
};
