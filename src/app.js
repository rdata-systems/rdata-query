const http = require('http');
const config = require('./config');
const api = require('./api');
const express = require('./services/express');
const mongoose = require('./services/mongoose');

module.exports = {
    getApi: function(connection){
        return api(connection)
    },
    getApp: function(connection){
        return express('/api/v1', this.getApi(connection))
    },
    getServer: function(connection){
        return http.createServer(this.getApp(connection))
    },
    run: function() {
        var self = this;
        // Simple function to start the server
        setImmediate(function () {
            var connection = mongoose.createConnection(config.mongo.uri);
            var server = self.getServer(connection);
            server.listen(config.port, config.ip, function () {
                console.log('Express server listening on http://%s:%d, in %s mode', config.ip, config.port, config.env);
            });
        });
    }
};