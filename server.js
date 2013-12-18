var express = require('express');
var run = require('./routes/run');
var http = require('http');
var path = require('path');

var requestParser = require('./middleware/requestParser');
var responseRenderer = require('./middleware/responseRenderer');

var app = express();

app.set('port', process.env.PORT || 8888);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());

app.use(app.router);
app.use(express.static(path.join(__dirname, 'static')));

if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.post('/runs',
         requestParser(),
         run.create,
         responseRenderer());

app.get('/runs/:runName',
        requestParser(),
        run.get,
        responseRenderer());

http.createServer(app).listen(app.get('port'), function() {
    console.log('HTTP server listening on port ' + app.get('port'));
});
