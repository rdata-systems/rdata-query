const Router = require('express').Router;
const events = require('./events');
const contexts = require('./contexts');


module.exports = function(connection) {
    const router = new Router();
    router.use('/events', events(connection));
    router.use('/contexts', contexts(connection));

    return router;
};