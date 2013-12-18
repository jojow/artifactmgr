var _ = require('lodash');

var unixPreCmd = 'cd <%= dir %> ; <% _.forEach(env, function(value, name) { print("export " + name + "=\'" + value + "\' ; "); }); %>';
var unixSudo = '<% if (password) { %> echo <%= password %> | <% } %> sudo <% if (user) { %> -u <%= user %> <% } %> -S sh -c ';
var unixCmd = '<% if (stdin) { %> echo \'<%= stdin %>\' | <% } %> <%= command %>';
var unixMkdir = 'mkdir -p <%= dir %> <% if (mode) { %> ; chmod <%= mode %> <%= dir %> <% } %>';
var unixChmod = 'chmod -R <%= mode %> <%= target %>';
var unixChown = 'chown -R <%= owner %> <%= target %>';

exports.defaults = {
    tempDir: '/tmp/artifactmgr/temp',
    baseDir: '/tmp/artifactmgr',
    mkdirCmd: unixMkdir,
    mkdirSudoCmd: unixSudo + '"' + unixMkdir + '"',
    chmodCmd: unixChmod,
    chmodSudoCmd: unixSudo + '"' + unixChmod + '"',
    chownCmd: unixChown,
    chownSudoCmd: unixSudo + '"' + unixChown + '"',
    stdinToFileCmd: 'cat - > <%= filePath %>',
    fileToStdoutCmd: 'cat <%= filePath %>',
    execCmd: unixPreCmd + unixCmd,
    execSudoCmd: unixSudo + '"' + unixPreCmd + unixCmd + '"'
};