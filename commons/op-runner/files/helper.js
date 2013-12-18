var first = function(obj) {
    for (var key in obj)
        if (key !== 'nodeTypeName')
            return key;
};

var flatten = function(props) {
    if ((_.size(props) === 1 && !_.isString(props[first(props)])) ||
        (_.size(props) === 2 && props.nodeTypeName)) {
        return props[first(props)];
    } else {
        return props;
    }
};

var processInputParameters = function(artifact, context, specificProcessing) {
    if (!context.Operation || !context.Operation.InputParameter) return;

    // Operation input parameters
    if (context.Operation.InputParameter) {
        var inputParams = context.Operation.InputParameter;

        if (!_.isArray(inputParams)) inputParams = [ inputParams ];

        _.each(inputParams, function(param) {
            //TODO: check param.type
            artifact.spec.input[param.name] = { type: param.type };

            if (param.value) artifact.spec.input[param.name].default = param.value;

            //specificProcessing(artifact.spec.input[param.name], param.type, param.name, param.value);
            specificProcessing(param.name, param.type, param.value);
        });
    }
};

var processOutputParameters = function(artifact, context, specificProcessing) {
    if (!context.Operation || !context.Operation.OutputParameter) return;

    // Operation output parameters
    if (context.Operation.OutputParameter) {
        var outputParams = context.Operation.OutputParameter;

        if (!_.isArray(outputParams)) outputParams = [ outputParams ];

        _.each(outputParams, function(param) {
            //TODO: check param.type
            artifact.spec.output[param.name] = { type: param.type };

            //specificProcessing(artifact.spec.output[param.name], param.type, param.name);
            specificProcessing(param.name, param.type);
        });
    }
};

var processProperties = function(artifact, context, specificProcessing) {
    // generic processing
    var defaultProcessing = function(props, prefix) {
        props = flatten(props);

        prefix = prefix || '';

        _.each(props, function(value, name) {
            artifact.spec.input[prefix + name] = { type: 'string', default: value };

            specificProcessing(name, 'string', value);
        });
    };

    // NodeTemplate properties
    if (context.Node)
        defaultProcessing(context.Node.NodeProperties);

    // RelationshipTemplate properties
    if (context.Relationship)
        defaultProcessing(context.Relationship.RelationshipProperties);

    // source NodeTemplate properties
    if (context.SourceNode && context.SourceNode.NodeProperties) {
        defaultProcessing(context.SourceNode.NodeProperties, 'Source_');

        if (context.SourceNode.HostProperties) {
            artifact.spec.input['Source_PublicIP'] = { type: 'string', default: context.SourceNode.HostProperties.Address };
            specificProcessing('Source_PublicIP', 'string', context.SourceNode.HostProperties.Address);
        }
    }

    // target NodeTemplate properties
    if (context.TargetNode && context.TargetNode.NodeProperties) {
        defaultProcessing(context.SourceNode.NodeProperties, 'Target_');

        if (context.TargetNode.HostProperties) {
            artifact.spec.input['Target_PublicIP'] = { type: 'string', default: context.TargetNode.HostProperties.Address };
            specificProcessing('Target_PublicIP', 'string', context.TargetNode.HostProperties.Address);
        }
    }
};
