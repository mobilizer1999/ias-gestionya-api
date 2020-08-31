const debug = require('debug')('ias-gestion-api:artistController');
const { uuid } = require('uuidv4');
const { Op } = require('sequelize');
const { models } = require('ias-utils');

const { artistModel } = models;

const createArtist = async (req, res, next) => {
  debug('inside create artists');
  try {
    const params = req.body;
    if (!params) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid Data!', errorId: uuid() });
    }
    const existArtist = await artistModel.findOne({
      where: {
        name: params.name,
      },
    });
    if (existArtist) {
      return res.status(400).json({ message: 'BAD_REQUEST: Artist already exist!', errorId: uuid() });
    }
    const artist = await artistModel.create(params);

    if (!artist) {
      return res.status(400).json({ message: 'BAD_REQUEST: Artist saved unsuccessfull!', errorId: uuid() });
    }
    req.session = {
      data: {
        message: 'Artist created successfully!',
        artist,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getArtist = async (req, res, next) => {
  debug('Inside Get All Artist');
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid Data!', errorId: uuid() });
    }
    const artistsList = await artistModel.findAll({
      where: {
        name: {
          [Op.like]: `%${name}%`,
        },
      },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    });

    req.session = {
      data: {
        artistsList,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createArtist,
  getArtist,
};
