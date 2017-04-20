const Router = require('express').Router;
const events = require('./events');
const contexts = require('./contexts');

const router = new Router();
router.use('/events', events);
router.use('/contexts', contexts);

module.exports = router;