const express = require('express');
const passportService = require('../services/passport');
const paginateService = require('../services/paginate');
const sortParserService = require('../services/sortparser');
const queryParserService = require('../services/queryparser');
const mongoose = require('../services/mongoose');
const event = require('../models/event');
const InvalidQueryError = require('../errors').InvalidQueryError;
const InvalidQueryIdError = require('../errors').InvalidQueryIdError;
const merge = require('merge');

module.exports = function(connection, game) {
    game = game || null;
    const Event = event.createEventModel(connection);
    const router = new express.Router();

    function filterUserEvents(evts, user){
        return evts.filter(function(event){
            if(user.can("readData", game)) // If they can read all data in this game, let them
                return true;

            // If data was not logged under any specific group, disallow.
            if(!event.userPayload ||
                !event.userPayload.selectedGroups ||
                event.userPayload.selectedGroups.length === 0)
                return false;

            // ... otherwise, check if they can read any specific group under which the data was logged
            return event.userPayload.selectedGroups.some(function(group){
                return user.can("readData", game, group);
            });
        });
    }

    router
        .get('/', passportService.authenticate(), function (req, res, next) {
            var query = queryParserService.fromQueryOrBody("query", req);

            var skip = parseInt(req.query.skip) || 0;
            var limit = parseInt(req.query.limit) || 0;
            var sort = req.query.sort ? sortParserService.parse(req.query.sort) : {time: "asc"};

            var events;
            Event.find(query).sort(sort).limit(limit).skip(skip).exec()
                .then(function (evts) {
                    events = filterUserEvents(evts, req.user);
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
            if(!req.params.eventId)
                return next(new InvalidQueryError("Invalid eventId"));

            var eventId = String(req.params.eventId);
            Event.findById(eventId)
                .then(function (event) {
                    res.json({
                        event: event
                    });
                })
                .catch(next);
        })


        .post('/query', passportService.authenticate(), function (req, res, next) {
            var query = queryParserService.fromQueryOrBody("query", req);
            // TODO: When the dashboard grows, put the request to some message queue (RabbitMQ / Amazon SQS)
            // and return the message/job id. Handle the query from the queue using some worker server.
            var queryId = new Buffer(JSON.stringify(query)).toString('base64'); // For now, simply encode the query into the base64 id
            return res.json({
                queryId: queryId
            });
        })

        .get('/query/result', passportService.authenticate(), function (req, res, next) {
            var queryId = req.query.queryId || req.body.queryId;
            if(!queryId)
                return next(new InvalidQueryIdError("Invalid queryId"));

            // TODO: When the dashboard grows, use the real query id to find if the job/query was done by the worker
            var queryJson = new Buffer(String(queryId), 'base64').toString('utf8'); // For now, let's just decode the query from the queryId
            try {
                var query = JSON.parse(queryJson);
            } catch(e){
                return next(new InvalidQueryIdError("Invalid queryId"));
            }

            // Calculates the sum of the given values
            if((query.type === 'sum' || query.type === 'avg') && !!query.key) {
                Event.find(query.query).exec()
                    .then(function (evts) {
                        var events = filterUserEvents(evts, req.user);
                        var sum = events.reduce(function (sum, event) {
                            return sum + event.getValue(query.key);
                        }, 0);

                        if (query.type === 'sum')
                            res.json({sum: sum});
                        else if (query.type === 'avg')
                            res.json({avg: sum / events.length});
                    })
                    .catch(next);
            } else if(query.type === 'count') {
                Event.find(query.query).exec()
                    .then(function (evts) {
                        var events = filterUserEvents(evts, req.user);
                        res.json({count: events.length});
                    })
                    .catch(next);
            } else {
                return next(new InvalidQueryError('Invalid query'));
            }

        });


    return router;
};