var output = { status: input.status };

if (input.results) _(input.results).forEach(function(value, name) {
    if (!output.output) output.output = { param: [] };

    var type = 'unknown';

    if (_.isNumber(value)) type = 'number';
    else if (_.isString(value)) type = 'string';
    else if (name === 'error') type = 'error';

    output.output.param.push({
        name: name,
        type: type,
        value: value
    });
});

callback(null, output);