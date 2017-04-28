const Router = require('express').Router;
const events = require('./events');
const contexts = require('./contexts');


module.exports = function(connection, game) {
    const router = new Router();
    router.use('/events', events(connection, game));
    router.use('/contexts', contexts(connection, game));

    return router;
};