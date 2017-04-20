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

const Event = mongoose.model('Event', eventSchema, 'events');
module.exports = {
    Event: Event
};