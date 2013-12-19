var xml2js = require('../lib/util/converters').xml2js;
var getRawBody = require('raw-body');
var express = require('express');

var reqBodyLimitMb = 1;

var defaultParser = new express.bodyParser();

var xmlParser = function(req, res, next) {
    getRawBody(req, {
        length: req.headers['content-length'],
        limit: reqBodyLimitMb * 1024 * 1024,
        encoding: 'utf8'
    }, function (err, str) {
        var opts = {};

        if (req.query.preserveMetaData) opts.perserveMeta = true;

        xml2js(str, opts, function(err, jsData) {
            if (err) return next(err);

            req.body = jsData;
            next();
        });
    });
};

module.exports = function() {
    return function(req, res, next) {
        req.context = {};

        if (req.is('xml') || req.is('text/xml') || req.is('application/xml')) xmlParser(req, res, next);
        else defaultParser(req, res, next);
    };
};