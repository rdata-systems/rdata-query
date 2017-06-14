'use strict';

const config = require('../config');
const mongoose = require('mongoose')
    , Schema = mongoose.Schema;

const eventSchema = new Schema({
    userId: {
        type: String
    },
    userPayload: {
        type: Object
    },
    time: {
        type: Number
    },
    name: {
        type: String
    },
    contextId: {
        type: String,
        ref: 'Context'
    },
    eventDataVersion: {
        type: Number
    },
    gameVersion: {
        type: Number
    },
    dataCollectionServerVersion: {
        type: Number
    },
    data: {
        type: Object
    }
});

eventSchema.virtual('duration').get(function () {
    if(!this.timeEnded)
        return 0;
    else
        return this.timeEnded - this.timeStarted;
});

eventSchema.methods.getValue = function(key, cb) { // Returns value for the dotted notation key ("data.info.etc")
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
    eventSchema: eventSchema,
    createEventModel: function createEventModel(connection){
        return connection.model('Event', eventSchema, 'events');
    }
};