const debug = require('debug')('ias-gestion-api:ambientController');
const { uuid } = require('uuidv4');
const { Op } = require('sequelize');
const { models } = require('ias-utils');

const { ambientModel } = models;

const createAmbient = async (req, res, next) => {
  debug('inside create Ambients');
  try {
    const params = req.body;
    if (!params) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid Data!', errorId: uuid() });
    }
    const existAmbients = await ambientModel.findOne({
      where: {
        name: params.name,
      },
    });
    if (existAmbients) {
      return res.status(400).json({ message: 'BAD_REQUEST: Ambien already exists', errorId: uuid() });
    }
    const ambient = await ambientModel.create(params);

    if (!ambient) {
      return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR', errorId: uuid() });
    }
    req.session = {
      data: {
        message: 'Ambient created successfully!',
        ambient,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getAmbients = async (req, res, next) => {
  debug('Inside Get Ambients');
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid Data!', errorId: uuid() });
    }
    const ambientsList = await ambientModel.findAll({
      where: {
        name: {
          [Op.like]: `%${name}%`,
        },
      },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });

    req.session = {
      data: {
        ambientsList,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createAmbient,
  getAmbients,
};
