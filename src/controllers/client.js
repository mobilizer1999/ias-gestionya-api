const { Op } = require('sequelize');
const sequelize = require('sequelize');
const _ = require('lodash');
const moment = require('moment');
const { models } = require('ias-utils');

const {
  eventsModel, clientModel, bookingModel, bookingTicketsModel,
} = models;
const { ticketState } = require('../constants/app');

const getClients = async (req, res, next) => {
  try {
    const {
      place, date,
    } = req.query;
    const { decodedUser } = req.body;
    let clientsIds = [];
    let clients = [];

    const query = {
      where: { userId: decodedUser.id },
      attributes: ['id'],
    };
    if (place) { query.where.placeId = place; }
    let start;
    let end;
    if (date) {
      start = moment(date).startOf('day');
      end = moment(date).endOf('day');
      query.where.startDate = { [Op.between]: [start, end] };
    }
    const eventList = await eventsModel.findAll(query);
    const eventIds = _.map(eventList, 'id');
    if (eventIds && eventIds.length) {
      const clientsList = await bookingModel.findAll({
        where: {
          [Op.or]: { eventId: eventIds },
        },
        attributes: ['clientId'],
        group: ['clientId'],
      });
      clientsIds = _.map(clientsList, 'clientId');
    }
    if (clientsIds && clientsIds.length) {
      clients = await clientModel.findAll({
        where: {
          id: { [Op.or]: clientsIds },
        },
        attributes: ['name', 'email', 'id'],
      });
    }

    clients = await Promise.all(clients.map(async (oneclient) => {
      const client = oneclient.toJSON();
      const assistedEvent = await bookingTicketsModel.findAll({
        where: {
          clientId: client.id,
          state: ticketState.ASSISTED,
        },
        attributes:
          [[sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        raw: true,
      });
      client.assistedEvent = assistedEvent[0].count || 0;

      const BookedEvent = await bookingModel.findAll({
        where: {
          clientId: client.id,
          [Op.or]: { eventId: eventIds },
        },
        attributes:
        [[sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalAmount'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'ticketCount']],
        raw: true,
      });

      client.totalAmount = BookedEvent[0].totalAmount || 0;
      client.averagePurchase = BookedEvent[0].ticketCount
        ? BookedEvent[0].totalAmount / BookedEvent[0].ticketCount : 0;

      const allEvents = await bookingModel.findAll({
        where: {
          clientId: client.id,
          eventId: { [Op.or]: eventIds },
        },
        attributes: ['eventId'],
      });
      const eventsIds = _.map(allEvents, 'eventId');

      const filter = {
        where: { id: { [Op.or]: eventsIds } },
        attributes: ['startDate', 'id'],
        order: [
          ['startDate', 'DESC'],
        ],
      };
      if (place) { filter.where.placeId = place; }
      if (date) { query.where.startDate = { [Op.between]: [start, end] }; }
      const lastEvent = await eventsModel.findAll(filter);
      client.lastEvent = lastEvent[0].startDate;

      const lastBookedEvent = await bookingModel.findAll({
        where: {
          eventId: lastEvent[0].id,
        },
        attributes: ['totalPrice'],
      });
      client.purchaseAmount = lastBookedEvent[0].totalPrice || 0;

      return client;
    }));

    req.session = {
      data: {
        clients,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getClients,
};
