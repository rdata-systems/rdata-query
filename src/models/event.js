'use strict';

const config = require('../config');
const mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

const eventSchema = new Schema({
    userId: {
        type: String
    },
    time: {
        type: Number
    },
    name: {
        type: String
    },
    contextId: {
        type: ObjectId
    },
    eventDataVersion: {
        type: Number
    },
    gameVersion: {
        type: Number
    },
    data: {
        type: Object
    }
});

module.exports = {
    eventSchema: eventSchema,
    createEventModel: function createEventModel(connection){
        return connection.model('Event', eventSchema, 'events');
    }
};