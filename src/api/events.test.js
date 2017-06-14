const express = require('../services/express');
const setup = require('../../test/setup');
const config = require('../config');
const request = require('supertest');
const routes = require('./events');
const mongoose = require('../services/mongoose');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const merge = require('merge');
const querystring = require('querystring');
const url = require('url');
const eventModel = require('../models/event');

var app;
var Event;

const game = 'test';

var testUser = {
    id: 1234567,
    roles: [{role: 'readWrite'}, {role: 'readData', game: game, group: 123456 }]
};

var testUserNoRole = {
    id: 1234567,
    roles: [{role: 'readWrite'}, {role: 'readData', game: game, group: 999999 }]
};

var eventModels;

beforeEach(function(done) {
    app = express('/', routes(mongoose.connection, game));
    Event = eventModel.createEventModel(mongoose.connection);

    var fruits = ["apple", "banana", "pear", "peach", "grape", "orange", "pineapple"]; // I am hungry, ok?!
    var events = [];
    for(var i=0; i<10; i++) {
        var evt = {
            time: Date.now(),
            name: Math.random() > 0.5 ? 'TestEvent' : 'MyEvent',
            contextId: null,
            eventDataVersion: 1,
            gameVersion: 1,
            userId: '09080706050403020100',
            userPayload: {
                groups: [111111, 22222, 123456],
                selectedGroups: [123456]
            },
            data: {
                someNumber: i,
                fruit: fruits[Math.floor(Math.random()*fruits.length)]
            }
        };
        events.push(evt);
    }
    Event.create(events, function (err, evts) {
        if (err) return done(err);
        eventModels = evts;
        done();
    });
});

afterEach(function(done){
    Event.remove({}, done);
});

describe('/events', function(){
    describe('GET /:eventId', function() {
        it('responds with 401 Unauthorized when there is no access token', function(done){
            var event = eventModels[0];
            request(app)
                .get('/'+event._id)
                .expect(401, done);
        });

        it('responds with 200 OK and returns one event', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var event = eventModels[0];
            request(app)
                .get('/'+event._id)
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.event);
                    assert.deepEqual(res.body.event.data, event.data, "event data doesn't match");
                    done();
                });
        });
    });

    describe('GET /', function(){
        it('responds with 401 Unauthorized when there is no access token', function(done){
            request(app)
                .get('/')
                .expect(401, done);
        });

        it('/ - responds with 200 OK and returns the list of events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.events.length, eventModels.length);
                    done();
                });
        });

        it('/ - responds with 200 OK and returns the list of empty events (no correct role)', function(done) {
            var accessToken = jwt.sign({user: testUserNoRole}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.events.length, 0);
                    done();
                });
        });

        it('?sort=data.someNumber - responds with 200 OK and returns the list of sorted events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: "data.someNumber" })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.events.length, eventModels.length);
                    for(var i=0; i<eventModels.length; i++) // Events are sorted by time by default
                        assert.equal(res.body.events[i].data.someNumber, eventModels[i].data.someNumber, "event data.someNumber doesn't match");
                    done();
                });
        });

        it('?sort=+data.someNumber - responds with 200 OK and returns the list of sorted events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: "+data.someNumber" })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.events.length, eventModels.length);
                    for(var i=0; i<eventModels.length; i++) // Events are sorted by time by default
                        assert.equal(res.body.events[i].data.someNumber, eventModels[i].data.someNumber, "event data.someNumber doesn't match");
                    done();
                });
        });

        it('?sort={"data.someNumber": -1} - responds with 200 OK and returns the list of sorted events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: JSON.stringify({"data.someNumber": -1}) })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.events.length, eventModels.length);
                    for(var i=0; i<eventModels.length; i++) // Events are sorted by time by default
                        assert.equal(res.body.events[i].data.someNumber, eventModels[eventModels.length - 1 - i].data.someNumber, "event data.someNumber doesn't match");
                    done();
                });
        });

        it('?sort={"data.fruit": 1} - responds with 200 OK and returns the list of sorted events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: JSON.stringify({"data.fruit": "asc"}) })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.events.length, eventModels.length);
                    var previousFruit = null;
                    for(var i=0; i<res.body.events.length; i++) { // Events are sorted by time by default
                        if(previousFruit !== null)
                            assert(res.body.events[i].data.fruit >= previousFruit, "event list is not sorted");
                        previousFruit = res.body.events[i].data.fruit;
                    }
                    done();
                });
        });

        it('?name=TestEvent - responds with 200 OK and returns the list of filtered events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ query: JSON.stringify({ name: "TestEvent" }) })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    for(var i=0; i<res.body.events.length; i++) // Events are sorted by time by default
                        assert.equal(res.body.events[i].name, "TestEvent", "event name is not TestEvent after filtering");
                    done();
                });
        });

        it('?limit=5 - responds with 200 OK and returns the list of events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ limit: 5 })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.events.length, 5, "length of res.body.events is incorrect");
                    done();
                });
        });

        it('?skip=5 - responds with 200 OK and returns the list of events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ skip: 5})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.events.length, 5, "length of res.body.events is incorrect");
                    done();
                });
        });

        it('?limit=2&skip=2&sort=+data.someNumber&&query={ "data.someNumber": { "$gte": 5 } } - responds with 200 OK and returns the list of events', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({limit:2, skip:2, sort: "+data.someNumber", query: JSON.stringify({"data.someNumber": { "$gte": 5 }})})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.events.length, 2, "length of res.body.events is incorrect");
                    assert.equal(res.body.events[0].data.someNumber, 7, "first event has incorrect data.someNumber");
                    assert.equal(res.body.events[1].data.someNumber, 8, "second event has incorrect data.someNumber");
                    done();
                });
        });

        it('/?limit=5 - responds with 200 OK and returns valid meta object with total count', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.meta.total, eventModels.length);
                    done();
                });
        });

        it('/ - responds with 200 OK and returns valid links object (no links)', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.links.pages.prev, undefined);
                    assert.equal(res.body.links.pages.next, undefined);
                    assert.equal(res.body.links.pages.last, undefined);
                    done();
                });
        });

        it('/?limit=2&skip=4 - responds with 200 OK and returns valid links object', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({limit:2, skip:4})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(parseInt(querystring.parse(url.parse(res.body.links.pages.prev).query).skip), 2);
                    assert.equal(parseInt(querystring.parse(url.parse(res.body.links.pages.next).query).skip), 6);
                    assert.equal(parseInt(querystring.parse(url.parse(res.body.links.pages.last).query).skip), 8);
                    done();
                });
        });

        it('/?limit=2&skip=8 - responds with 200 OK and returns valid links object (no last page)', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({limit:2, skip:8})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(parseInt(querystring.parse(url.parse(res.body.links.pages.prev).query).skip), 6);
                    assert.equal(res.body.links.pages.next, undefined);
                    assert.equal(parseInt(querystring.parse(url.parse(res.body.links.pages.last).query).skip), 8);
                    done();
                });
        });
    });

    describe('POST /query', function(){
        it('/query?query={type:"sum", key: "duration", query:{"data.someNumber": { "$gte": 5 }}} - responds with 200 OK and returns valid query id', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var queryJson = JSON.stringify({type:"sum", key: "data.someNumber", query:{"data.someNumber": { "$gte": 5 }}});
            request(app)
                .post('/query')
                .query({query: queryJson})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.queryId, new Buffer(queryJson).toString('base64'), "query id is incorrect");
                    done();
                });
        });
    });

    describe('GET /query/result', function(){
        it('/query/result - query = {type:"sum", key: "duration", query:{"data.someNumber": { "$gte": 5 }}} - responds with 200 OK and returns valid sum of context durations', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var queryJson = JSON.stringify({type:"sum", key: "data.someNumber", query:{"data.someNumber": { "$gte": 5 }}});
            var queryId = new Buffer(queryJson).toString('base64');
            request(app)
                .get('/query/result')
                .query({queryId: queryId})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.sum, 35, "sum is invalid"); // 5 contexts, each 3 mins long
                    done();
                });
        });
    });

    describe('GET /query/result', function(){
        it('/query/result - query = {type:"avg", key: "duration", query:{"data.someNumber": { "$gte": 5 }}} - responds with 200 OK and returns valid sum of context durations', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var queryJson = JSON.stringify({type:"avg", key: "data.someNumber", query:{"data.someNumber": { "$gte": 5 }}});
            var queryId = new Buffer(queryJson).toString('base64');
            request(app)
                .get('/query/result')
                .query({queryId: queryId})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.avg, 7, "sum is invalid"); // 5 contexts, each 3 mins long = 3
                    done();
                });
        });
    });
});