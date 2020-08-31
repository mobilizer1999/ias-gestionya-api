const debug = require('debug')('ias-gestion-api:genersController');
const { uuid } = require('uuidv4');
const { Op } = require('sequelize');
const { models } = require('ias-utils');

const { genersModel } = models;

const createGeners = async (req, res, next) => {
  debug('inside createGeners');
  try {
    const params = req.body;
    if (!params) {
      return res.send(400).json({ message: 'BAD_REQUEST: Invalid data!', errorId: uuid() });
    }
    const existGeners = await genersModel.findOne({
      where: {
        name: params.name,
      },
    });
    if (existGeners) {
      return res.status(409).json({ message: 'CONFLICT: Geners already exist!', errorId: uuid() });
    }
    const geners = await genersModel.create(params);

    if (!geners) {
      return res.status(500).json({ message: 'INTERNAL_SERVER_ERRORS: Geners saved unsuccessfull!', errorId: uuid() });
    }
    req.session = {
      data: {
        message: 'Geners created successfully!',
        geners,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getGeners = async (req, res, next) => {
  debug('Inside Get All Geners');
  try {
    const { name } = req.body;
    if (!name) {
      return res.send(400).json({ message: 'BAD_REQUEST: Invalid data!', errorId: uuid() });
    }
    const genersList = await genersModel.findAll({
      where: {
        name: {
          [Op.like]: `%${name}%`,
        },
      },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });

    req.session = {
      data: {
        genersList,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createGeners,
  getGeners,
};
