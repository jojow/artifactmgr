var builders = {
    ScriptArtifact: scriptArtifactBuilder
};

var type = converters.xmlLocalName(input.ArtifactTemplate.type);

if (!builders[type]) return callback('Artifact type ' + type + ' not supported!');
else var builder = builders[type];

var ns = 'opentosca';



// host
var hostProps;

if (input.ArtifactContext.Node)
    hostProps = input.ArtifactContext.Node.HostProperties;

else if (input.ArtifactContext.Relationship &&
         input.ArtifactContext.Relationship.OperationBoundTo === 'source' &&
         input.ArtifactContext.SourceNode)
    hostProps = input.ArtifactContext.SourceNode.HostProperties;

else if (input.ArtifactContext.Relationship &&
         input.ArtifactContext.Relationship.OperationBoundTo === 'target' &&
         input.ArtifactContext.TargetNode)
    hostProps = input.ArtifactContext.TargetNode.HostProperties;

var host;

if (hostProps && _.size(hostProps) > 0) {
    hostProps = flatten(hostProps);

    host = { id: {
               namespace: ns,
               hostAddress: hostProps.Address
             },
             config: {
               platform: 'unix',
               access: 'ssh',
               ssh: {
                 user: hostProps.SSHUser,
                 privateKey: hostProps.SSHPrivateKey
               }
             }
           };
} else {
    host = { id: {
               namespace: ns,
               hostAddress: 'localhost'
             },
             config: {
               platform: 'unix',
               access: 'local'
             }
           };
}

// build artifact
var artifact = builder(input.ArtifactTemplate, input.ArtifactContext);

// artifact instance
var instance = { id: host.id, links: { artifact: {} } };



async.waterfall([
    async.apply(clartigr.artifacts.create, artifact, true),
    function(returnedArtifact, callback) {
        artifact.id = instance.links.artifact.id = returnedArtifact.id;

        clartigr.hosts.get(host.id, function(err, returnedHost) {
            if (returnedHost) return callback(err, returnedHost);

            clartigr.hosts.create(host, function(err, returnedHost) {
                callback(err, returnedHost);
            });
        });
    },
    function(returnedHost, callback) {
        clartigr.instances.create(instance, true, function(err, returnedInstance) {
            callback(err, returnedInstance);
        });
    },
    function(returnedInstance, callback) {
        instance.id = returnedInstance.id;

        clartigr.instances.runs.create({ id: instance.id }, null, false, function(err, returnedRun) {
            callback(err, returnedRun);
        });
    },
    function(returnedRun, callback) {
        output.runId = returnedRun.id;

        context.resStatus = 201;
        context.resHeaders = {
                                  // basepath = /api/v1
                                  Location: context.absBasepath + '/' +
                                            ns + '/hosts/' +
                                            host.id.hostAddress + '/artifact-instances/' +
                                            instance.id.instanceName + '/runs/' +
                                            returnedRun.id.runName
                               };

        callback();
    }
], callback);