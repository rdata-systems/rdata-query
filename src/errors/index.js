'use strict';

const ClientError = function ClientError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};
require('util').inherits(ClientError, Error);

const InvalidQueryError = function InvalidQueryError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};
require('util').inherits(InvalidQueryError, ClientError);

const AuthorizationError = function UnauthorizedError(message, extra){
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};
require('util').inherits(AuthorizationError, ClientError);

const InvalidQueryIdError = function InvalidQueryIdError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
};
require('util').inherits(InvalidQueryIdError, ClientError);


module.exports.ClientError = ClientError;
module.exports.AuthorizationError = AuthorizationError;
module.exports.InvalidQueryError = InvalidQueryError;
module.exports.InvalidQueryIdError = InvalidQueryIdError;