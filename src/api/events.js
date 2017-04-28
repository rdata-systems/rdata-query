const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const sortParserService = require('../services/sortparser');
const queryParserService = require('../services/queryparser');
const mongoose = require('../services/mongoose');
const event = require('../models/event');
const InvalidQueryError = require('../errors').InvalidQueryError;
const merge = require('merge');

module.exports = function(connection, game) {
    game = game || null;
    const Event = event.createEventModel(connection);
    const router = new express.Router();
    router
        .get('/', passportService.authenticate(), function (req, res, next) {
            var query = queryParserService.fromQueryOrBody(req, "query");

            var skip = parseInt(req.query.skip) || 0;
            var limit = parseInt(req.query.limit) || 0;
            var sort = req.query.sort ? sortParserService.parse(req.query.sort) : {time: "asc"};

            var events;
            Event.find(query).sort(sort).limit(limit).skip(skip).exec()
                .then(function (evts) {
                    events = evts.filter(function(event){
                        if(req.user.can("readData", game)) // If they can read all data in this game, let them
                            return true;

                        // If data was not logged under any specific group, disallow.
                        if(!event.userPayload ||
                           !event.userPayload.selectedGroups ||
                            event.userPayload.selectedGroups.length === 0)
                            return false;

                        // ... otherwise, check if they can read any specific group under which the data was logged
                        return event.userPayload.selectedGroups.some(function(group){
                            return req.user.can("readData", game, group);
                        });
                    });
                    return Event.count(query).exec();
                })
                .then(function (totalCount) {
                    res.json({
                        events: events,
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

        .get('/:eventId', passportService.authenticate(), function (req, res, next) {
            Event.findById(req.params.eventId)
                .then(function (event) {
                    res.json({
                        event: event
                    });
                })
                .catch(next);
        });

    return router;
};