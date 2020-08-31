// const debug = require('debug')('ias-gestion-api:appConfig');
const async = require('async');
// const httpStatus = require('http-status-code');

const url = (req) => `${req.protocol}://${req.get('host')}`;

exports.trimParams = (req, res, next) => {
  async.each(req.body, (value, key) => {
    if (value && typeof value === 'string') {
      // eslint-disable-next-line security/detect-object-injection
      req.body[key] = value.trim();
    }
  });
  async.each(req.query, (value, key) => {
    if (value && typeof value === 'string') {
      // eslint-disable-next-line security/detect-object-injection
      req.query[key] = value.trim();
    }
  });
  next();
};

exports.handleError = (err, req, res, next) => {
  if (!err) {
    return next();
  }
  const errorResponse = {
    error: { stack: err.message, ...(err.output && err.output.payload ? err.output.payload : err) },
  };
  const statusCode = err.output && err.output.statusCode ? err.output.statusCode : 500;
  return res.status(statusCode).send(errorResponse);
};

exports.handleSuccess = (req, res, next) => {
  if (req.session.data === undefined) {
    return next();
  }
  const resObject = req.session.data || [];
  req.session = null;
  return res.json(resObject);
};

exports.handle404 = (req, res, next) => {
  const api = /api/;
  if (api.test(req.path) === true) {
    res.status(404).send(`Invalid request ${url(req)}${req.url}`);
  }
  return next();
};
