var async = require('async');
var fs = require('fs-extra');
var _ = require('lodash');
var shortid = require('shortid');
var moment = require('moment');
var path = require('path');
var childProc = require('child_process');
var debug = require('debug')('artifactmgr:access:local');

var artifactFileStore = require('../../store').artifactFileStore;

exports.init = function(host, callback) {
    _([ 'baseDir', 'tempDir' ]).forEach(function(dirId) {
        var dir = host.commands[dirId]();

        if (!fs.existsSync(dir)) fs.mkdirsSync(dir);
    });

    callback();
};

exports.readFile = function(host, filePath, options, callback) {
    fs.readFile(filePath, options, callback);
};

exports.writeFile = function(host, filePath, content, options, callback) {
    fs.writeFile(filePath, content, options, callback);
};

exports.fileWriteStream = function(host, filePath, options) {
    return fs.createWriteStream(filePath, options);
};

exports.fileReadStream = function(host, filePath, options) {
    return fs.createReadStream(filePath, options);
};

exports.storeArtifactFiles = function(host, baseDir, files, replace, callback) {
    if (fs.existsSync(baseDir) && !replace) return callback();

    async.each(files, function(file, callback) {
        var targetDir = path.join(baseDir, path.dirname(file.id.filePath));
        var targetFile = path.join(targetDir, path.basename(file.id.filePath));

        fs.mkdirsSync(targetDir);

        artifactFileStore.contentReadStream(file.id, function(fileStream) {
            fileStream.pipe(exports.fileWriteStream(host, targetFile)).on('finish', function(err) {
                callback(err);
            }).on('error', function(err) {
                callback(err);
            });
        });
    }, callback);
};

exports.exec = function(host, command, stdin, options, callback) {
    debug('command to be executed on ' + host.id.hostAddress, command);

    var child = childProc.exec(command, options, function(err, stdout, stderr) {
        if (err) callback(new Error(err));
        else callback(null, stdout, stderr);
    });

    if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
    }
};
