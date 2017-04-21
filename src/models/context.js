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
    name: {
        type: String
    },
    status: {
        type: String,
        enum: Object.keys(ContextStatus).map(function(key){ return ContextStatus[key] })  // Values
    },
    parentContextId: {
        type: ObjectId
    },
    children: {
        type: [ObjectId]
    },
    contextDataVersion: {
        type: Number
    },
    gameVersion: {
        type: Number
    },
    timeStarted: {
        type: Number
    },
    timeEnded: {
        type: Date
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

module.exports = {
    contextSchema: contextSchema,
    ContextStatus: ContextStatus,
    createContextModel: function createContextModel(connection){
        return connection.model('Context', contextSchema, 'contexts');
    }
};
