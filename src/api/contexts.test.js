const express = require('../services/express');
const setup = require('../../test/setup');
const config = require('../config');
const request = require('supertest');
const routes = require('./contexts');
const mongoose = require('../services/mongoose');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const merge = require('merge');
const querystring = require('querystring');
const url = require('url');
const contextModel = require('../models/context');
const ContextStatus = contextModel.ContextStatus;

var app;
var Context;

const game = 'test';

var testUser = {
    id: 1234567,
    roles: [{role: 'readWrite'}, {role: 'readData', game: game, group: 123456 }]
};

var testUserNoRole = {
    id: 1234567,
    roles: [{role: 'readWrite'}, {role: 'readData', game: game, group: 999999 }]
};

var contextModels;

beforeEach(function(done) {
    app = express({path: '/', router: routes(mongoose.connection, game)});
    Context = contextModel.createContextModel(mongoose.connection);

    var fruits = ["apple", "banana", "pear", "peach", "grape", "orange", "pineapple"]; // I am hungry, ok?!
    var contexts = [];
    for(var i=0; i<10; i++) {
        var now = Date.now();
        var ctx = {
            timeStarted: now,
            timeEnded: now + 3 * 60 * 1000, // 3 minutes
            timeInterrupted: null,
            name: Math.random() > 0.5 ? 'TestContext' : 'MyContext',
            status: ContextStatus.started,
            parentContextId: null,
            children: [],
            contextDataVersion: 1,
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
        contexts.push(ctx);
    }
    Context.create(contexts, function (err, ctxs) {
        if (err) return done(err);
        contextModels = ctxs;
        done();
    });
});

afterEach(function(done){
    Context.remove({}, done);
});

describe('/contexts', function(){
    describe('GET /:contextId', function() {
        it('responds with 401 Unauthorized when there is no access token', function(done){
            var context = contextModels[0];
            request(app)
                .get('/'+context._id)
                .expect(401, done);
        });

        it('responds with 200 OK and returns one context', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var context = contextModels[0];
            request(app)
                .get('/'+context._id)
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.context);
                    assert.deepEqual(res.body.context.data, context.data, "context data doesn't match");
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

        it('/ - responds with 200 OK and returns the list of contexts', function(done){
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.contexts.length, contextModels.length);
                    done();
                });
        });

        it('/ - responds with 200 OK and returns the list of empty contexts (no correct role)', function(done) {
            var accessToken = jwt.sign({user: testUserNoRole}, config.jwtSecret);
            request(app)
                .get('/')
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.contexts.length, 0);
                    done();
                });
        });

        it('?sort=data.someNumber - responds with 200 OK and returns the list of sorted contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: "data.someNumber" })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.contexts.length, contextModels.length);
                    for(var i=0; i<contextModels.length; i++) // Contexts are sorted by time by default
                        assert.equal(res.body.contexts[i].data.someNumber, contextModels[i].data.someNumber, "context data.someNumber doesn't match");
                    done();
                });
        });

        it('?sort=+data.someNumber - responds with 200 OK and returns the list of sorted contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: "+data.someNumber" })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.contexts.length, contextModels.length);
                    for(var i=0; i<contextModels.length; i++) // contexts are sorted by time by default
                        assert.equal(res.body.contexts[i].data.someNumber, contextModels[i].data.someNumber, "context data.someNumber doesn't match");
                    done();
                });
        });

        it('?sort={"data.someNumber": -1} - responds with 200 OK and returns the list of sorted contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: JSON.stringify({"data.someNumber": -1}) })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.contexts.length, contextModels.length);
                    for(var i=0; i<contextModels.length; i++) // contexts are sorted by time by default
                        assert.equal(res.body.contexts[i].data.someNumber, contextModels[contextModels.length - 1 - i].data.someNumber, "context data.someNumber doesn't match");
                    done();
                });
        });

        it('?sort={"data.fruit": 1} - responds with 200 OK and returns the list of sorted contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ sort: JSON.stringify({"data.fruit": "asc"}) })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert(res.body.contexts.length, contextModels.length);
                    var previousFruit = null;
                    for(var i=0; i<res.body.contexts.length; i++) { // contexts are sorted by time by default
                        if(previousFruit !== null)
                            assert(res.body.contexts[i].data.fruit >= previousFruit, "context list is not sorted");
                        previousFruit = res.body.contexts[i].data.fruit;
                    }
                    done();
                });
        });

        it('?name=Testcontext - responds with 200 OK and returns the list of filtered contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ query: JSON.stringify({ name: "Testcontext" }) })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    for(var i=0; i<res.body.contexts.length; i++) // contexts are sorted by time by default
                        assert.equal(res.body.contexts[i].name, "Testcontext", "context name is not Testcontext after filtering");
                    done();
                });
        });

        it('?limit=5 - responds with 200 OK and returns the list of contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ limit: 5 })
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.contexts.length, 5, "length of res.body.contexts is incorrect");
                    done();
                });
        });

        it('?skip=5 - responds with 200 OK and returns the list of contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({ skip: 5})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.contexts.length, 5, "length of res.body.contexts is incorrect");
                    done();
                });
        });

        it('?limit=2&skip=2&sort=+data.someNumber&query={ "data.someNumber": { "$gte": 5 } } - responds with 200 OK and returns the list of contexts', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            request(app)
                .get('/')
                .query({limit:2, skip:2, sort: "+data.someNumber", query: JSON.stringify({"data.someNumber": { "$gte": 5 }})})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.contexts.length, 2, "length of res.body.contexts is incorrect");
                    assert.equal(res.body.contexts[0].data.someNumber, 7, "first context has incorrect data.someNumber");
                    assert.equal(res.body.contexts[1].data.someNumber, 8, "second context has incorrect data.someNumber");
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
                    assert.equal(res.body.meta.total, contextModels.length);
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
            var queryJson = JSON.stringify({type:"sum", key: "duration", query:{"data.someNumber": { "$gte": 5 }}});
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
            var queryJson = JSON.stringify({type:"sum", key: "duration", query:{"data.someNumber": { "$gte": 5 }}});
            var queryId = new Buffer(queryJson).toString('base64');
            request(app)
                .get('/query/result')
                .query({queryId: queryId})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.sum, 5 * 3 * 60 * 1000, "sum is invalid"); // 5 contexts, each 3 mins long
                    done();
                });
        });
    });

    describe('GET /query/result', function(){
        it('/query/result - query = {type:"avg", key: "duration", query:{"data.someNumber": { "$gte": 5 }}} - responds with 200 OK and returns valid sum of context durations', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var queryJson = JSON.stringify({type:"avg", key: "duration", query:{"data.someNumber": { "$gte": 5 }}});
            var queryId = new Buffer(queryJson).toString('base64');
            request(app)
                .get('/query/result')
                .query({queryId: queryId})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.avg, 3 * 60 * 1000, "sum is invalid"); // 5 contexts, each 3 mins long = 3
                    done();
                });
        });
    });

    describe('GET /query/result', function(){
        it('/query/result - query = {type:"count", query:{"data.someNumber": { "$gte": 5 }}} - responds with 200 OK and returns valid count of contexts - 5', function(done) {
            var accessToken = jwt.sign({user: testUser}, config.jwtSecret);
            var queryJson = JSON.stringify({type:"count", query:{"data.someNumber": { "$gte": 5 }}});
            var queryId = new Buffer(queryJson).toString('base64');
            request(app)
                .get('/query/result')
                .query({queryId: queryId})
                .set('Authorization', "Bearer " + accessToken)
                .expect(200)
                .end(function(err, res){
                    if (err) return done(err);
                    assert.equal(res.body.count, 5, "count is invalid"); // 5 contexts
                    done();
                });
        });
    });
});