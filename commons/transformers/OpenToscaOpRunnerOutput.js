var output = { status: input.status };

if (input.results) _(input.results).forEach(function(value, name) {
    if (!output.output) output.output = { param: [] };

    output.output.param.push({
        name: name,
        type: 'string',
        value: value
    });
});

callback(null, output);