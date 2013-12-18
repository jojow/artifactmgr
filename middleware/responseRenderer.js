var _ = require('lodash');
var js2xml = require('../lib/util/converters').js2xml;

module.exports = function() {
    return function(req, res, next) {
        var type = req.accepts('json', 'xml', 'text/xml');

        // if response is emtpy
        if (!req.response) return res.end();

        if (type === 'json') {
            res.jsonp(req.response);
        } else if (type === 'xml' || type === 'text/xml') {
            js2xml(req.response, function(err, xmlData) {
                res.setHeader('Content-Type', 'application/xml');
                res.setHeader('Content-Length', _.size(xmlData));

                res.end(xmlData);
            });
        } else {
            res.json(req.response);
        }
    };
};
