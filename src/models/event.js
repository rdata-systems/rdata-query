'use strict';

const config = require('../config');
const mongoose = require('mongoose')
    , Schema = mongoose.Schema;

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
        type: String,
        ref: 'Context'
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