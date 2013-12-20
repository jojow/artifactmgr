var spawn = require('child_process').spawn;
var async = require('async');
var fs = require('fs-extra');
var _ = require('lodash');
var path = require('path');
var shortid = require('shortid');
var debug = require('debug')('artifactmgr:access:ssh');

var artifactFileStore = require('../../store').artifactFileStore;

var localTempDir = '/tmp/artifactmgr-local';

var sshOptions = function(host, tty) {
    var options = [ '-i', host.config.ssh.privateKeyPath,
                    '-p', host.config.ssh.port || '22',
                    '-o', 'LogLevel=quiet',
                    '-o', 'StrictHostKeyChecking=no',
                    '-o', 'ConnectTimeout=10',
                    '-o', 'BatchMode=yes',
                    '-o', 'UserKnownHostsFile=/dev/null',
                    host.config.ssh.user + '@' + host.id.hostAddress ];

    // force pseudo tty because some sudo configurations require that
    if (tty) options = [ '-t', '-t', '-t' ].concat(options); 

    return options;
};

var debugStdout = function(procName, childProc) {
    childProc.stdout.setEncoding('utf8');

    childProc.stdout.on('data', function(data) {
        debug('child process stdout (' + procName + ')', data);
    });
};

var debugStderr = function(procName, childProc) {
    childProc.stderr.setEncoding('utf8');

    childProc.stderr.on('data', function(data) {
        debug('child process stderr (' + procName + ')', data);
    });
};



exports.init = function(host, callback) {
    if (!fs.existsSync(localTempDir))
        fs.mkdirsSync(localTempDir);

    host.config.ssh.privateKeyPath =
        path.join(localTempDir, 'ssh-key-' + host.id.hostAddress + '-' + shortid.generate());

    fs.writeFileSync(host.config.ssh.privateKeyPath,
                     host.config.ssh.privateKey,
                     { mode: 384 }); // 384 decimal = 600 octal

    async.each([ 'baseDir', 'tempDir' ], function(dirId, callback) {
        var dir = host.commands[dirId]();

        var mkdirSudoCmd = host.commands.mkdirSudoCmd({ dir: dir,
                                                        mode: 777,
                                                        user: host.config.sudo.user,
                                                        password: host.config.sudo.password });

        var sshMkdir = spawn('ssh', sshOptions(host, true).concat([ mkdirSudoCmd ]));

        debugStdout('ssh mkdir', sshMkdir);
        debugStderr('ssh mkdir', sshMkdir);

        sshMkdir.on('close', function(code) {
            if (code !== 0) callback('ssh child process (mkdir) exited with code ' + code);
            else callback();
        });
    }, callback);
};

exports.cleanup = function(host, callback) {
    if (fs.existsSync(host.config.ssh.privateKeyPath))
        fs.unlinkSync(host.config.ssh.privateKeyPath);

    callback();
};

exports.readFile = function(host, filePath, options, callback) {
    callback = _.once(callback);

    var content = '';

    var fileToStdoutCmd = host.commands.fileToStdoutCmd({ filePath: filePath });

    var sshReadFile = spawn('ssh', sshOptions(host).concat([ fileToStdoutCmd ]));

    sshReadFile.stdout.setEncoding(options.encoding);

    sshReadFile.stdout.on('data', function(chunk) {
        content += chunk;
    });

    debugStderr('ssh mkdir', sshReadFile);

    sshReadFile.stdin.on('finish', function(err) {
        if (err) debug('error on stdin finish', err);
    }).on('error', function(err) {
        callback(err);
    });

    sshReadFile.on('close', function(code) {
        if (code !== 0) callback('ssh child process (read file) exited with code ' + code);
        else callback(null, content);
    });
};

exports.writeFile = function(host, filePath, content, options, callback) {
    callback = _.once(callback);

    var dir = path.dirname(filePath);

    var mkdirSudoCmd = host.commands.mkdirSudoCmd({ dir: dir,
                                                    mode: 777,
                                                    user: host.config.sudo.user,
                                                    password: host.config.sudo.password });

    var stdinToFileCmd = host.commands.stdinToFileCmd({ filePath: filePath });

    var sshMkdir = spawn('ssh', sshOptions(host, true).concat([ mkdirSudoCmd ]));

    debugStdout('ssh mkdir', sshMkdir);
    debugStderr('ssh mkdir', sshMkdir);

    sshMkdir.on('close', function(code) {
        if (code !== 0) return callback('ssh child process (mkdir) exited with code ' + code);

        var sshWriteFile = spawn('ssh', sshOptions(host).concat([ stdinToFileCmd ]));

        debugStdout('ssh write file', sshWriteFile);
        debugStderr('ssh write file', sshWriteFile);

        sshWriteFile.stdin.on('finish', function(err) {
            if (err) debug('error on stdin finish', err);
        }).on('error', function(err) {
            callback(err);
        });

        sshWriteFile.stdin.write(content);
        sshWriteFile.stdin.end();

        sshWriteFile.on('close', function(code) {
            if (code !== 0) callback('ssh child process (write file) exited with code ' + code);
            else callback();
        });
    });
};

exports.storeArtifactFiles = function(host, baseDir, files, replace, callback) {
    async.each(files, function(file, cbEach) {
        cbEach = _.once(cbEach);

        var targetDir = path.join(baseDir, path.dirname(file.id.filePath));
        var targetFile = path.join(targetDir, path.basename(file.id.filePath));

        var mkdirSudoCmd = host.commands.mkdirSudoCmd({ dir: targetDir,
                                                        mode: 777,
                                                        user: host.config.sudo.user,
                                                        password: host.config.sudo.password });

        var stdinToFileCmd = host.commands.stdinToFileCmd({ filePath: targetFile });

        var sshMkdir = spawn('ssh', sshOptions(host, true).concat([ mkdirSudoCmd ]));

        debugStdout('ssh mkdir', sshMkdir);
        debugStderr('ssh mkdir', sshMkdir);

        sshMkdir.on('close', function (code) {
            if (code !== 0) return cbEach('ssh child process (mkdir) exited with code ' + code);

            var sshStoreFile = spawn('ssh', sshOptions(host).concat([ stdinToFileCmd ]));

            debugStdout('ssh store file', sshStoreFile);
            debugStderr('ssh store file', sshStoreFile);

            artifactFileStore.contentReadStream(file.id, function(fileStream) {
                fileStream.pipe(sshStoreFile.stdin).on('finish', function(err) {
                    if (err) debug('error on stdin finish', err);
                }).on('error', function(err) {
                    cbEach(err);
                });
            });

            sshStoreFile.on('close', function(code) {
                if (code !== 0) cbEach('ssh child process (store file) exited with code ' + code);
                else cbEach();
            });
        });
    }, callback);
};

exports.exec = function(host, command, stdin, options, callback) {
    debug('command to be executed on ' + host.id.hostAddress, command);

    callback = _.once(callback);

    var stdout = '';
    var stderr = '';

    var sshExecCmd = spawn('ssh', sshOptions(host, true).concat([ command ]));

    sshExecCmd.stdout.setEncoding(options.encoding);
    sshExecCmd.stderr.setEncoding(options.encoding);

    sshExecCmd.stdout.on('data', function(chunk) {
        stdout += chunk;
    });

    sshExecCmd.stderr.on('data', function(chunk) {
        stderr += chunk;
    });

    sshExecCmd.stdin.on('finish', function(err) {
        if (err) debug('error on stdin finish', err);
    }).on('error', function(err) {
        callback(err);
    });

    if(stdin) {
        sshExecCmd.stdin.write(stdin);
        sshExecCmd.stdin.end();
    }

    sshExecCmd.on('close', function(code) {
        if (code !== 0) callback('ssh child process (exec) exited with code ' + code, stdout, stderr);
        else callback(null, stdout, stderr);
    });
};
