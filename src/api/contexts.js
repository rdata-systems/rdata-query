const express = require('express');
const router = new express.Router();
const passportService = require('../services/passport/index');
const Context = require('../models/context').Context;
const ContextStatus = require('../models/context').ContextStatus;

module.exports = router;

router.get('/', passportService.authenticate(), function(req, res, next){
    Context.find(function(err, contexts){
        if(err) return next(err);
        res.json({
            contexts: contexts
        });
    });
});
