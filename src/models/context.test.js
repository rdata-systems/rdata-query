const setup = require('../../test/setup');
const mongoose = require('../services/mongoose');
const assert = require('assert');
const url = require('url');
const contextModel = require('../models/context');

var Context;

beforeEach(function(done) {
    Context = contextModel.createContextModel(mongoose.connection);
    done();
});

afterEach(function(done){
    Context.remove({}, done);
});

describe('Context', function(){
    describe('duration', function(){
        it('calculates correct duration of active context', function(done) {
            var context = new Context({name: "TestContext", timeStarted: Date.now()});
            setTimeout(function(){
                assert(context.duration >= 10, "context duration is not greater than 10 milliseconds");
                done();
            }, 10);
        });

        it('calculates correct duration of ended context', function() {
            var started = Date.now();
            var ended = started + 60 * 1000; // 1 min
            var context = new Context({name: "TestContext", timeStarted: started, timeEnded: ended });
            assert.equal(context.duration, ended - started, "context duration is invalid");
        });

        it('calculates correct duration of interrupted context', function() {
            var started = Date.now();
            var interrupted = started + 60 * 1000; // 1 min
            var context = new Context({name: "TestContext", timeStarted: started, timeInterrupted: interrupted });
            assert.equal(context.duration, interrupted - started, "context duration is invalid");
        });

        it('calculates correct duration of interrupted and then restored context', function() {
            var started = Date.now() - 1000 * 60 * 10; // 10 minutes ago
            var interrupted = started + 60 * 1000; // in 1 min after start
            var restored = started + 2 * 60 * 1000; // in 2 minutes after start
            var context = new Context({name: "TestContext", timeStarted: started, timeInterrupted: interrupted, timeRestored: restored});
            assert(context.duration >= 1000 * 60 * 10, "context duration must be more than 10 minutes");
        });

        it('calculates correct duration of the context that was interrupted and then restored and then interrupted again', function() {
            var started = Date.now();
            var restored = started + 2 * 60 * 1000; // in 2 minutes after start
            var interrupted = started + 3 * 60 * 1000; // in 3 min after start
            var context = new Context({name: "TestContext", timeStarted: started, timeInterrupted: interrupted, timeRestored: restored});
            assert.equal(context.duration, interrupted - started, "context duration must be exactly " +  (interrupted - started) + " ms");
        });

        it('calculates correct duration of the context that was interrupted, and then ended without being restored', function() {
            var started = Date.now();
            var interrupted = started + 3 * 60 * 1000; // in 3 min after start
            var ended = started + 5 * 60 * 1000; // in 5 min after start
            var context = new Context({name: "TestContext", timeStarted: started, timeInterrupted: interrupted, timeEnded: ended });
            assert.equal(context.duration, interrupted - started, "context duration must be exactly " +  (interrupted - started) + " ms");
        });

        it('calculates correct duration of the context that was interrupted, restored, then interrupted again and then ended', function() {
            var started = Date.now();
            var restored = started + 2 * 60 * 1000; // in 4 min after start
            var interrupted = started + 3 * 60 * 1000; // in 3 min after start
            var ended = started + 5 * 60 * 1000; // in 5 min after start
            var context = new Context({name: "TestContext", timeStarted: started, timeRestored: restored, timeInterrupted: interrupted, timeEnded: ended });
            assert.equal(context.duration, interrupted - started, "context duration must be exactly " +  (interrupted - started) + " ms");
        });
    });
});