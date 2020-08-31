/* eslint-disable security/detect-non-literal-fs-filename, consistent-return */
const { uuid } = require('uuidv4');
const debug = require('debug')('ias-gestion-api:eventsController');
const { Op } = require('sequelize');
const _ = require('lodash');
const sequelize = require('sequelize');
const moment = require('moment');
const AWS = require('aws-sdk');
const fs = require('fs');
const { models } = require('ias-utils');

const {
  eventsModel, placesModel, ticketMasterModel, bookingModel,
} = models;

const { S3FS } = require('../constants/app');

const S3FS_CONFIG = {
  bucketName: S3FS.BUCKETNAME,
  dirName: 'event',
  region: S3FS.REGION,
  accessKeyId: S3FS.ACCESSKEYID,
  secretAccessKey: S3FS.SECRETACCESSKEY,
};

AWS.config.update({
  accessKeyId: S3FS_CONFIG.accessKeyId,
  secretAccessKey: S3FS_CONFIG.secretAccessKey,
  region: S3FS_CONFIG.region,
});

const s3 = new AWS.S3();

const aFiles = [
  'landingPicture',
  'eventPicture0',
  'eventPicture1',
  'eventPicture2',
  'eventPicture3',
  'eventPicture4',
  'eventPicture5',
  'eventPicture6',
  'eventPicture7',
  'eventPicture8',
  'eventPicture9',
];
const getImageNameFromUrl = (imageName) => {
  if (!imageName) {
    return;
  }
  const sArray = imageName.split('/');
  let fileteredName;
  if (sArray.length > 1) {
    fileteredName = sArray[sArray.length - 1];
  }
  return fileteredName || imageName;
};

async function ticketsCounts(event) {
  const ticketsDetails = {};
  const eventTickets = {};
  const allTicketsDetails = await ticketMasterModel.findAll({
    where: {
      eventId: event.id,
    },
    group: ['type'],
    raw: true,
    attributes: ['type', 'eventId'],
  });

  await Promise.all(
    allTicketsDetails.map(async (oneTicket) => {
      const totalTickets = await ticketMasterModel.findOne({
        where: {
          eventId: oneTicket.eventId,
          type: oneTicket.type,
        },
        attributes: [
          'eventId',
          'type',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalTicket'],
        ],
        raw: true,
      });
      ticketsDetails.id = oneTicket.eventId;
      if (totalTickets.type === 'TICKET') {
        ticketsDetails.ticketsCount = totalTickets.totalTicket;
      }
      if (totalTickets.type === 'PROMO') {
        ticketsDetails.promoCount = totalTickets.totalTicket;
      }
      if (totalTickets.type === 'LIST') {
        ticketsDetails.listCount = totalTickets.totalTicket;
      }
      if (totalTickets.type === 'TABLE') {
        ticketsDetails.tableCount = totalTickets.totalTicket;
      }
    }),
  );

  const soldTicketsDetails = await bookingModel.findAll({
    where: {
      eventId: event.id,
    },
    group: ['ticketType'],
    raw: true,
    attributes: ['ticketType', 'eventId'],
  });

  await Promise.all(
    soldTicketsDetails.map(async (oneTicket) => {
      const soldTickets = await bookingModel.findOne({
        where: {
          eventId: oneTicket.eventId,
          ticketType: oneTicket.ticketType,
        },
        attributes: [
          'eventId',
          'ticketType',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'soldTicket'],
        ],
        raw: true,
      });
      ticketsDetails.id = oneTicket.eventId;
      if (soldTickets.ticketType === 'TICKET') {
        ticketsDetails.ticketsSold = soldTickets.soldTicket;
      }
      if (soldTickets.ticketType === 'PROMO') {
        ticketsDetails.promoSold = soldTickets.soldTicket;
      }
      if (soldTickets.ticketType === 'LIST') {
        ticketsDetails.listSold = soldTickets.soldTicket;
      }
      if (soldTickets.ticketType === 'TABLE') {
        ticketsDetails.tableSold = soldTickets.soldTicket;
      }
    }),
  );

  eventTickets.TICKET = {
    sold: ticketsDetails.ticketsSold || 0,
    total: ticketsDetails.ticketsCount || 0,
  };
  eventTickets.PROMO = {
    sold: ticketsDetails.promoSold || 0,
    total: ticketsDetails.promoCount || 0,
  };
  eventTickets.LIST = {
    sold: ticketsDetails.listSold || 0,
    total: ticketsDetails.listCount || 0,
  };
  eventTickets.TABLE = {
    sold: ticketsDetails.tableSold || 0,
    total: ticketsDetails.tableCount || 0,
  };
  return eventTickets;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    callback(array[parseInt(index, 10)], index, array);
  }
}

const createEvent = async (req, res, next) => {
  try {
    debug('inside createEvent');
    const params = req.body;
    const isValidParams = params.eventType === 'DRAFT'
      ? !params.eventName || !params.placeId
      : !params.eventName
          || !params.startDate
          || !params.endDate
          || !params.placeId
          || !params.eventInfo;

    if (isValidParams) {
      return res.status(400).json({
        message:
          'BAD_REQUEST: Missing required fields. EventName, startDate, endDate,placeId,eventInfo ',
        errorId: uuid(),
      });
    }
    if (params.eventArtists) {
      params.eventArtists = params.eventArtists.toString();
    }
    if (params.eventGenres) {
      params.eventGenres = params.eventGenres.toString();
    }
    if (params.eventAmbients) {
      params.eventAmbients = params.eventAmbients.toString();
    }
    if (params.dressCode) {
      params.dressCode = params.dressCode.toString();
    }
    params.userId = params.decodedUser.id;
    params.isDeleted = false;

    const existEvent = await eventsModel.findOne({
      where: {
        startDate: params.startDate,
        placeId: params.placeId,
      },
    });

    if (existEvent && params.eventType !== 'DRAFT') {
      return res
        .status(400)
        .json({ message: 'BAD_REQUEST: Event alrady exists', errorId: uuid() });
    }

    aFiles.forEach((name) => {
      params[`${name}`] = getImageNameFromUrl(params[`${name}`]);
    });

    if (req.files && req.files.length !== 0) {
      await asyncForEach(req.files, async (file) => {
        await s3
          .putObject({
            Bucket: S3FS_CONFIG.bucketName,
            Body: fs.readFileSync(file.path),
            Key: `${S3FS_CONFIG.dirName}/${file.filename}`,
          })
          .promise()
          .then(() => {
            fs.unlinkSync(file.path);
          })
          .catch(() => {});
      });
    }
    const userId = req.body.decodedUser.id;
    console.log(req.body.placeId);
    const event = await eventsModel.create({
      eventName: req.body.eventName,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      eventInfo: req.body.eventInfo,
      eventArtists: req.body.eventArtists,
      eventGenres: req.body.eventGenres,
      eventAmbients: req.body.eventAmbients,
      ageFrom: req.body.ageFrom,
      ageTo: req.body.ageTo,
      placeId: req.body.placeId,
      userId,
      dressCode: req.body.dressCode,
      eventType: req.body.eventType,
      landingPicture: req.body.landingPicture,
      eventPicture0: req.body.eventPicture0,
      eventPicture1: req.body.eventPicture1,
      eventPicture2: req.body.eventPicture2,
      eventPicture3: req.body.eventPicture3,
      eventPicture4: req.body.eventPicture4,
      eventPicture5: req.body.eventPicture5,
      eventPicture6: req.body.eventPicture6,
      eventPicture7: req.body.eventPicture7,
      eventPicture8: req.body.eventPicture8,
      eventPicture9: req.body.eventPicture9,
    });
    if (!event) {
      res.send(500).json({ message: 'INTERNAL_SERVER_ERROR', errorId: uuid() });
    }
    req.session = {
      data: {
        message: 'Event saved successfully!',
        eventId: event.id,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
let query;

const getEvents = async (req, res, next) => {
  try {
    debug('inside getEvent');
    const {
      placeId, eventType, eventId, startDate, endDate,
    } = req.query;
    const { decodedUser } = req.body;
    const date = new Date();
    query = {
      userId: {
        [Op.eq]: decodedUser.id,
      },
      placeId: {
        [Op.eq]: req.query.placeId,
      },
      eventType: {
        [Op.eq]: req.query.eventType,
      },
    };
    if (req.query.startDate) {
      query.startDate = { [Op.gt]: req.query.startDate };
      console.log(query.startDate);
    }
    if (req.query.endDate) {
      query.endDate = { [Op.lt]: req.query.endDate };
      console.log(query.endDate);
    }
    const filter = {
      where: query,
      attributes: {
        exclude: ['createdAt', 'updatedAt', 'userId'],
        include: [{
          model: placesModel,
          as: 'placeId',
          attributes: ['placeName', 'placeDescription', 'locationAddress', 'locationGenres', 'placeId'],
        }],
      },
    };
    const events = await eventsModel.findAll({
      where: query,
      attributes: { exclude: ['createdAt', 'updatedAt', 'isDeleted', 'userId', 'placeId'] },
    });
    req.session = {
      data: events,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    if (!req.body.eventId) {
      return res.send(400).json({ message: 'BAD_REQUEST: Invalid data' });
    }
    const params = req.body;
    const { eventId, eventName } = params;
    const existEvent = await eventsModel.findOne({
      where: {
        id: params.eventId,
      },
    });
    if (!existEvent) {
      return res.send(400).json({ message: 'BAD_REQUEST: Event not found' });
    }
    if (params.status === 'CANCELLED') {
      const bookedtickets = await bookingModel.findAll({
        where: {
          eventId,
          status: null,
        },
      });
      if (bookedtickets && bookedtickets.length) {
        return res.send(400).json({ message: 'BAD_REQUEST: Please refund all tickets before event cancelled!' });
      }
    }

    if (req.files && req.files.length !== 0) {
      await asyncForEach(req.files, async (file) => {
        await s3
          .putObject({
            Bucket: S3FS_CONFIG.bucketName,
            Body: fs.readFileSync(file.path),
            Key: `${S3FS_CONFIG.dirName}/${file.filename}`,
          })
          .promise()
          .then(() => {
            fs.unlinkSync(file.path);
          })
          .catch(() => {});
      });
    }

    aFiles.forEach((name) => {
      params[`${name}`] = getImageNameFromUrl(params[`${name}`]);
    });
    /*     delete params.decodedUser;
    if (req.body.eventArtist) {

    } */
    if (params.eventArtists) {
      params.eventArtists = params.eventArtists.toString();
    }
    if (params.eventGenres) {
      params.eventGenres = params.eventGenres.toString();
    }
    if (params.eventAmbients) {
      params.eventAmbients = params.eventAmbients.toString();
    }
    if (params.dressCode) {
      params.dressCode = params.dressCode.toString();
    }
    const updatedEvents = await existEvent.update({
      eventName: req.body.eventName,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      eventInfo: req.body.eventInfo,
      eventAmbients: req.body.eventAmbients,
      eventArtists: req.body.eventArtists,
      eventGenres: req.body.eventGenres,
      ageFrom: req.body.ageFrom,
      ageTo: req.body.ageTo,
      placeId: req.body.placeId,
      dressCode: req.body.dressCode,
      eventType: req.body.eventType,
      landingPicture: req.body.landingPicture,
      eventPicture0: req.body.eventPicture0,
      eventPicture1: req.body.eventPicture1,
      eventPicture2: req.body.eventPicture2,
      eventPicture3: req.body.eventPicture3,
      eventPicture4: req.body.eventPicture4,
      eventPicture5: req.body.eventPicture5,
      eventPicture6: req.body.eventPicture6,
      eventPicture7: req.body.eventPicture7,
      eventPicture8: req.body.eventPicture8,
      eventPicture9: req.body.eventPicture9,
    });
    if (!updatedEvents) {
      return res.send(400).json({
        message: 'BAD_REQUEST: Event updated unsuccessfull!',
        errorId: uuid(),
      });
    }

    req.session = {
      data: {
        message: 'Event updated successfully!',
        eventId,
        eventName,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res
        .send(400)
        .json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }
    const existEvent = await eventsModel.findOne({
      where: {
        id: eventId,
      },
    });

    if (!existEvent) {
      return res
        .send(400)
        .json({ message: 'BAD_REQUEST: Event not found', errorId: uuid() });
    }

    if (existEvent.eventType !== 'DRAFT' && existEvent.status !== 'CANCELLED') {
      return res.send(400).json({
        message: 'BAD_REQUEST: Event not allow to delete!',
        errorId: uuid(),
      });
    }

    const deletedEvents = await eventsModel.update(
      { isDeleted: true },
      { where: { id: eventId } },
    );
    if (!deletedEvents) {
      return res.send(400).json({
        message: 'BAD_REQUEST: Event deleted unsuccessfull! ',
        errorId: uuid(),
      });
    }
    req.session = {
      data: {
        message: 'Event deleted successfully!',
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
};
