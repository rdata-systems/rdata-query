const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const sortParserService = require('../services/sortparser');
const queryParserService = require('../services/queryparser');
const mongoose = require('../services/mongoose');
const context = require('../models/context');
const InvalidQueryError = require('../errors').InvalidQueryError;
const merge = require('merge');

module.exports = function(connection, game) {
    game = game || null;
    const Context = context.createContextModel(connection);
    const router = new express.Router();
    router
        .get('/', passportService.authenticate(), function (req, res, next) {
            var query = queryParserService.fromQueryOrBody(req, "query");

            var skip = parseInt(req.query.skip) || 0;
            var limit = parseInt(req.query.limit) || 0;
            var sort = req.query.sort ? sortParserService.parse(req.query.sort) : {time: "asc"};

            var contexts;
            Context.find(query).sort(sort).limit(limit).skip(skip).exec()
                .then(function (ctxs) {
                    // Filter data by game and group if they are provided
                    contexts = ctxs.filter(function(context){
                        if(req.user.can("readData", game)) // If they can read all data in this game, let them
                            return true;

                        // If data was not logged under any specific group, disallow.
                        if(!context.userPayload ||
                           !context.userPayload.selectedGroups ||
                            context.userPayload.selectedGroups.length === 0)
                            return false;

                        // ... otherwise, check if they can read any specific group under which the data was logged
                        return context.userPayload.selectedGroups.some(function(group){
                            return req.user.can("readData", game, group);
                        });
                    });
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