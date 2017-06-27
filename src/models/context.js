'use strict';

const config = require('../config');
const mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

const ContextStatus = {
    started: 'started',
    ended: 'ended',
    interrupted: 'interrupted'
};

const contextSchema = new Schema({
    userId: {
        type: String
    },
    userPayload: {
        type: Object
    },
    name: {
        type: String
    },
    status: {
        type: String,
        enum: Object.keys(ContextStatus).map(function(key){ return ContextStatus[key] })  // Values
    },
    parentContextId: {
        type: this
    },
    children: {
        type: [this]
    },
    contextDataVersion: {
        type: Number
    },
    gameVersion: {
        type: Number
    },
    dataCollectionServerVersion: {
        type: Number
    },
    timeStarted: {
        type: Number
    },
    timeEnded: {
        type: Number
    },
    timeInterrupted: {
        type: Number
    },
    timeRestored: {
        type: Number
    },
    data: {
        type: Object
    }
});

contextSchema.virtual('duration').get(function () {
    var endTime;

    // 1. If context was never ended, interrupted, or restored, it's still going (normal state). Use current time.
    if(!this.timeEnded && !this.timeInterrupted && !this.timeRestored)
        endTime = Date.now();

    // 2. If context was ended and it was never interrupted, context is properly ended.
    else if(this.timeEnded && !this.timeInterrupted)
        endTime = this.timeEnded;

    // 3. If context was interrupted but never restored or ended, context is currently interrupted
    else if(this.timeInterrupted && !this.timeEnded &&  !this.timeRestored)
        endTime = this.timeInterrupted;

    // 4. If context was interrupted but THEN restored after it and was never ended, context is still active
    else if(this.timeInterrupted && !this.timeEnded && this.timeRestored && this.timeRestored > this.timeInterrupted)
        endTime = Date.now();

    // 5. If context was interrupted but then restored and then interrupted again, and was never restored after that, context is interrupted
    else if(this.timeInterrupted && this.timeRestored && !this.timeEnded && this.timeRestored <= this.timeInterrupted)
        endTime = this.timeInterrupted;

    // 6. If context was interrupted and never restored but ended, it means context was probably ended by ending the root context. Context was ended while being in the interrupted state
    else if(this.timeInterrupted && !this.timeRestored && this.timeEnded)
        endTime = this.timeInterrupted;

    // 7. If context was interrupted and restored and ended, but it was interrupted AGAIN after restoring, and then was ended, context was ended while being in the interrupted state
    else if(this.timeInterrupted && this.timeRestored && this.timeEnded && this.timeRestored <= this.timeInterrupted)
        endTime = this.timeInterrupted;

    // 8. If context was interrupted and restored and ended, context was ended while being in the normal state
    else if(this.timeInterrupted && this.timeRestored && this.timeEnded && this.timeRestored > this.timeInterrupted)
        endTime = this.timeEnded;

    else
        endTime = Date.now();

    return endTime - this.timeStarted;
});

contextSchema.methods.getValue = function(key, cb) { // Returns value for the dotted notation key ("data.info.etc")
    var parts = key.split('.');
    var obj = this;
    while(parts.length){
        var part = parts.shift();
        if(!obj[part])
            return undefined;
        obj = obj[part];
    }
    return obj;
};

module.exports = {
    contextSchema: contextSchema,
    ContextStatus: ContextStatus,
    createContextModel: function createContextModel(connection){
        return connection.model('Context', contextSchema, 'contexts');
    }
};
