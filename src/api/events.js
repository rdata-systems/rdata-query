const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const sortParserService = require('../services/sortparser');
const mongoose = require('../services/mongoose');
const event = require('../models/event');
const InvalidQueryError = require('../errors').InvalidQueryError;
const merge = require('merge');

module.exports = function(connection) {
    const Event = event.createEventModel(connection);
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

            var events;
            Event.find(query).sort(sort).limit(limit).skip(skip).exec()
                .then(function (evts) {
                    events = evts;
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