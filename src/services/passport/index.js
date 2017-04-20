'use strict';

const passport = require('passport');
const config = require('../../config');
const AuthorizationError = require('../../errors').AuthorizationError;

var passportJWT = require("passport-jwt");

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

function PassportService() {
    var self = this;

    var accessTokenJwtStrategyOptions = {
        secretOrKey: config.jwtSecret,
        jwtFromRequest: ExtractJwt.fromExtractors([
            ExtractJwt.fromUrlQueryParameter('accessToken'),
            ExtractJwt.fromBodyField('accessToken'),
            ExtractJwt.fromAuthHeaderWithScheme('Bearer')
    ])
    };

    // Access token strategy validates the access token and returns the user serialized in the payload
    var accessTokenStrategy = new JwtStrategy(accessTokenJwtStrategyOptions, function(jwtPayload, next){
        var user = jwtPayload.user;
        next(null, user);
    });

    passport.use('accessToken', accessTokenStrategy);

    this.userHasRole = function userHasRole(user, roleCondition){
        if(!user.roles || !Array.isArray(user.roles)) return false;

        for(var role in user.roles){ // Loop over user roles
            var roleFound = true;
            for(var key in roleCondition){ // Loop over possible options of the role
                var value = roleCondition[key];
                if(!role[key] || role[value] !== key)
                {
                    roleFound = false;
                    break;
                }
            }
            if(roleFound) return true;
        }
        return false;
    };

    this.requireRole = function requireRole(roleCondition){
        return function(req, res, next){
            if(!roleCondition) return next(new Error("No roleCondition specified"));

            if(req.user && self.userHasRole(req.user, roleCondition)){
                return next();
            } else {
                return next(new AuthorizationError("Unauthorized"));
            }
        };
    };

    this.authenticate = function authenticate() {
        return passport.authenticate('accessToken', { session: false, failWithError: true })
    };

}

module.exports = new PassportService();