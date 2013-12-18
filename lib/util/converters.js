var xml2js = require('xml2js');
var js2xmlparser = require('js2xmlparser');
var _ = require('lodash');
_.str = require('underscore.string');

var removeXmlMeta = function(data) {
    _.each(data, function(value, key, list) {
        // value modifications
        if (!_.isString(value)) removeXmlMeta(value);

        // key modifications
        if (!_.isNumber(key)) {
            if (_.str.startsWith(key, 'xmlns') ||
                _.str.endsWith(key, 'schemaLocation') ||
                _.str.endsWith(key, 'targetNamespace')) {
                delete list[key];
                return;
            }

            var localName = exports.xmlLocalName(key);

            if (localName !== key) {
                list[localName] = list[key];
                delete list[key];
            }
        }
    });
};

exports.xmlLocalName = function(qName) {
    return qName.split(':').slice(-1)[0];
};

exports.xml2js = function(xmlData, options, callback) {
    var parser = new xml2js.Parser({ attrkey: '',
                                     charkey: 'value',
                                     trim: true,
                                     normalize: true,
                                     normalizeTags: false,
                                     explicitRoot: false,
                                     explicitArray: false,
                                     mergeAttrs: true,
                                     async: true });

    parser.parseString(xmlData, function(err, jsData) {
        if (!options.preserveMeta && !err) {
            removeXmlMeta(jsData);
        }

        callback(err, jsData);
    });
};

exports.js2xml = function(jsData, callback) {
    if (_.isArray(jsData)) jsData = { item: jsData }

    try {
        callback(null, js2xmlparser('body', jsData));
    } catch (err) {
        callback(err);
    }
};
