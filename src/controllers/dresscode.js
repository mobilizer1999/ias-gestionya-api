const { uuid } = require('uuidv4');
const debug = require('debug')('ias-gestion-api:dresscodeController');
const { Op } = require('sequelize');
const { models } = require('ias-utils');

const { dresscodeModel } = models;

const createDressCode = async (req, res, next) => {
  debug('inside create DressCodes');
  try {
    const params = req.body;
    if (!params) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }
    const existDressCode = await dresscodeModel.findOne({
      where: {
        name: params.name,
      },
    });
    if (existDressCode) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }
    const dresscode = await dresscodeModel.create(params);

    if (!dresscode) {
      return res.status(400).json({ message: 'BAD_REQUEST: Dress code saved unsuccessfull!', errorId: uuid() });
    }
    req.session = {
      data: {
        message: 'Dress code created successfully!',
        dresscode,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getDressCodes = async (req, res, next) => {
  debug('Inside Get DressCodes');
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data!', errorId: uuid() });
    }
    const dressCodeList = await dresscodeModel.findAll({
      where: {
        name: {
          [Op.like]: `%${name}%`,
        },
      },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });

    req.session = {
      data: {
        dressCodeList,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createDressCode,
  getDressCodes,
};
