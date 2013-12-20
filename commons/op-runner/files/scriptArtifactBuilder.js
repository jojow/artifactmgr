var scriptArtifactBuilder = function(template, context) {
    var artifact = { id: { namespace: 'opentosca' },
                     spec: { input: {}, output: {} },
                     impl: { runtime: 'sandbox-js', exec: '' },
                     links: { files: [] } };

    var env = {};
    var args = [];

    //
    // properties
    //
    processProperties(artifact, context, function(name, type, value) {
        env[name] = value;
    });

    //
    // input parameters
    //
    processInputParameters(artifact, context, function(name, type, value) {
        args.push(value);
    });

    //
    // command
    //
    var scriptFile = path.basename(template.Properties.ScriptArtifactProperties.PrimaryScript);
    var scriptDir = path.dirname(template.Properties.ScriptArtifactProperties.PrimaryScript);

    var cmd = 'cd ' + scriptDir + ' ; chmod a+x ' + scriptFile + ' ; ./' + scriptFile;

    //
    // output parameters
    //
    processOutputParameters(artifact, context, function(name, type, value) {
        // output parameters not supported by script artifacts
    });

    //
    // impl
    //
    var impl = [];

    _(env).forEach(function(value, name) {
        impl.push('setEnvSync("' + name + '", input["' + name + '"]);');
    });

    _(args).forEach(function(arg) {
        cmd += ' ' + arg;
    });

    impl.push('exec("' + cmd + '", null, { sudo: true, stderr2err: true, stdout2err: true }, function(err, stdout, stderr) {');
    impl.push('    output.stdout = stdout;');
    impl.push('    output.stderr = stderr;');
    impl.push('    callback(err);');
    impl.push('});');

    artifact.impl.exec = impl;

    //
    // files
    //
    var baseUrl = context.Files.url;
    var sep = '/';

    if (_.str.endsWith(baseUrl, '/')) sep = '';

    var refs = template.ArtifactReferences;
    if (!_.isArray(refs)) refs = [ refs ];

    _.each(refs, function(r) {
        var ref = r.ArtifactReference.reference;

        if (r.ArtifactReference.Include) {
            var files = r.ArtifactReference.Include;
            if (!_.isArray(files)) files = [ files ];

            _.each(files, function(f) {
                artifact.links.files.push({ id: { filePath: path.join(ref, f.pattern) },
                                            url: baseUrl + sep + path.join(ref, f.pattern) });
            });
        } else {
            artifact.links.files.push({ id: { filePath: path.normalize(ref) },
                                        url: baseUrl + sep + path.normalize(ref) });
        }
    });

    return artifact;
};
