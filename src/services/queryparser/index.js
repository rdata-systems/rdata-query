'use strict';

const InvalidQueryError = require('../../errors').InvalidQueryError;

/**
 * Provides a high-level function for taking argument from query or body
 */
function QueryParserService() {
    var self = this;

    this.fromQueryOrBody = function fromQueryOrBody(req, key){
        if (req.query && req.query[key]) {
            try {
                return JSON.parse(req.query[key]);
            } catch (e) {
                return next(new InvalidQueryError("query is not a valid json"));
            }
        } else if(req.body && req.body[key]) {
            return req.body[key];
        } else {
            return null;
        }
    }
}

module.exports = new QueryParserService();