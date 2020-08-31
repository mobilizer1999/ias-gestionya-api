/* eslint-disable consistent-return */
const jwt = require('jsonwebtoken');
const { uuid } = require('uuidv4');
// const Boom = require('boom'); //Migrar...
const appConstants = require('../constants/app');

module.exports = async (req, res, next) => {
  try {
    const token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
      await jwt.verify(token, appConstants.jwtSecret, async (err, decoded) => {
        if (err) {
          return res.status(400).json({ message: 'BAD_REQUEST: Invalid' });
        }
        if (!decoded) {
          return res.status(401).json({ message: 'UNAUTHORIZED: User not authorized.' });
        }
        req.body.decodedUser = decoded;
        return next();
      });
    } else {
      return res.status(401).json({ message: 'Invalid Token!', errorId: uuid() });
    }
  } catch (error) {
    return next(error);
  }
};
