const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const sortParserService = require('../services/sortparser');
const mongoose = require('../services/mongoose');
const context = require('../models/context');
const InvalidQueryError = require('../errors').InvalidQueryError;
const merge = require('merge');

module.exports = function(connection) {
    const Context = context.createContextModel(connection);
    const router = new express.Router();
    router
        .get('/', passportService.authenticate(), function (req, res, next) {
            if (req.query.query) {
                try {
                    var query = JSON.parse(req.query.query);
                } catch (e) {
                    return next(new InvalidQueryError("query is not a valid json"));
                }
            } else {
                query = req.body || {};
            }

            var skip = parseInt(req.query.skip) || 0;
            var limit = parseInt(req.query.limit) || 0;
            var sort = req.query.sort ? sortParserService.parse(req.query.sort) : {time: "asc"};

            var contexts;
            Context.find(query).sort(sort).limit(limit).skip(skip).exec()
                .then(function (ctxs) {
                    contexts = ctxs;
                    return Context.count(query).exec();
                })
                .then(function (totalCount) {
                    res.json({
                        contexts: contexts,
                        meta: {
                            total: totalCount
                        },
                        links: {
                            pages: paginateService.getPageLinks(skip, limit, totalCount, req.url)
                        }
                    });
                })
                .catch(next);
        })

        .get('/:contextId', passportService.authenticate(), function (req, res, next) {
            Context.findById(req.params.contextId)
                .then(function (context) {
                    res.json({
                        context: context
                    });
                })
                .catch(next);
        });

    return router;
};