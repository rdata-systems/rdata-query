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
    if(this.timeEnded)
        return this.timeEnded - this.timeStarted; // Context has ended - calculate correct duration

    else if(this.timeInterrupted && (!this.timeRestored || this.timeRestored < this.timeInterrupted))
        return this.timeInterrupted - this.timeStarted; // Context was interrupted and there is no restore time OR it was restored before it was interrupted again later - use interrupted time to calculate length

    else
        return Date.now() - this.timeStarted; // Otherwise, assume context is active right now. This includes case when context was interrupted bug restored later
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
