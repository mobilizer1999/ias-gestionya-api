/* eslint-disable security/detect-object-injection,guard-for-in,
 no-restricted-syntax, prefer-destructuring */
const { uuid } = require('uuidv4');
const debug = require('debug')('ias-gestion-api:ticketsController');
const Op = require('sequelize').Op;
const _ = require('lodash');
const { models } = require('ias-utils');

const { ticketMasterModel, bookingModel, bookingTicketsModel } = models;
const { ticketState, ticketStatus } = require('../constants/app');

const createEventTickets = async (req, res, next) => {
  debug('inside tickets controller');
  try {
    const { tickets } = req.body;
    if (!tickets) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }
    const ticketsList = tickets;

    if (ticketsList && !ticketsList.length) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }

    ticketsList.forEach((oneElement, index) => {
      const isValidParams = !oneElement.eventId || !oneElement.scope
        || !oneElement.status || !oneElement.type
        || !oneElement.name || !oneElement.quantity
        || !oneElement.ticketPrice || !oneElement.genre
        || !oneElement.ticketDescription || !oneElement.ticketAvailFrom
        || !oneElement.ticketAvailUntil || !oneElement.ticketsPerTable
        || !oneElement.placeConsumtions;
      if (isValidParams) {
        return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
      }
      if (oneElement.privateTickets) {
        ticketsList[index].privateTickets = JSON.stringify(oneElement.privateTickets);
      }
      return oneElement;
    });

    const eventTicket = await ticketMasterModel.bulkCreate(ticketsList);
    if (eventTicket && !eventTicket.length) {
      return res.status(400).json({ message: 'BAD_REQUEST: Something want wrong please try again!', errorId: uuid() });
    }

    req.session = {
      data: {
        message: 'Event tickets saved successfully!',
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getEventTickets = async (req, res, next) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }

    const eventTicketsList = await ticketMasterModel.findAll({
      where: { eventId },
    });

    const ticketsList = await Promise.all(
      eventTicketsList.map(async (oneElement, index) => {
        eventTicketsList[index].privateTickets = JSON.parse(oneElement.privateTickets);
        const oneTicket = oneElement.toJSON();
        if (oneTicket.type === 'TABLE') {
          const allTickets = await bookingModel.findAll({
            where: {
              ticketTypeId: oneTicket.id,
            },
            raw: true,
            attributes: ['tableNumber'],
          });
          const soldTableNumber = _.map(allTickets, 'tableNumber').join(
            ',',
          );
          oneTicket.soldTableNumber = soldTableNumber || '';
        }
        return oneTicket;
      }),
    );
    req.session = {
      data: {
        ticketsList,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const updateEventTickets = async (req, res, next) => {
  debug('inside tickets update controller');
  try {
    if (!req.body.tickets) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }
    const ticketsList = req.body.tickets;

    if (ticketsList && !ticketsList.length) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }

    const ticketsDetails = ticketsList.forEach(async (oneTicket, index) => {
      const isValidParams = !oneTicket.ticketId || !oneTicket.eventId;

      if (isValidParams) {
        return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
      }

      if (oneTicket.privateTickets) {
        ticketsList[index].privateTickets = JSON.stringify(oneTicket.privateTickets);
      }
      const ticketDetails = await ticketMasterModel.findOne({
        where: {
          id: oneTicket.ticketId,
          eventId: oneTicket.eventId,
        },
      });

      if (!ticketDetails) {
        return res.status(400).json({ message: 'BAD_REQUEST: No records found!', errorId: uuid() });
      }

      const updatedRecords = await ticketMasterModel.update(oneTicket, {
        where: {
          id: oneTicket.ticketId,
        },
      });

      if (updatedRecords && !updatedRecords.length) {
        return res.status(422).json({ message: 'UNPROCESSABLE_ENTITY_ERROR: Event tickets updated unsuccessfull!', errorId: uuid() });
      }
      return updatedRecords;
    });

    if (ticketsDetails && !ticketsDetails.length) {
      return res.status(400).json({ message: 'BAD_REQUEST: Event tickets updated unsuccessfull', errorId: uuid() });
    }

    req.session = {
      data: {
        message: 'Event updated successfully!',
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const refundEventTickets = async (req, res, next) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }

    const updatedBookticket = await bookingModel.update({
      status: 'CANCELLED',
    }, {
      where: {
        eventId,
      },
    });
    if (updatedBookticket && !updatedBookticket.length) {
      return res.status(422).json({ message: 'UNPROCESSABLE_ENTITY_ERROR: Tickets refunded unsuccessfull!', errorId: uuid() });
    }

    const ticketBookingList = await bookingModel.findAll({
      where: {
        eventId,
      },
    });
    ticketBookingList.forEach(async (oneTicket) => {
      const updatedSoldTicket = await bookingTicketsModel.update({
        status: 'CANCELLED',
      }, {
        where: {
          ticketBookingId: oneTicket.id,
        },
      });
      if (updatedSoldTicket && !updatedSoldTicket.length) {
        return res.status(422).json({ message: 'UNPROCESSABLE_ENTITY_ERROR: Tickets refunded unsuccessfull!', errorId: uuid() });
      }
      return oneTicket;
    });

    req.session = {
      data: {
        message: 'Tickets refunded successfully!',
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const verifyTicket = async (req, res, next) => {
  try {
    let message = '';
    const { userLegalId } = req.body;
    if (!userLegalId) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data', errorId: uuid() });
    }

    const existTicket = await bookingTicketsModel.findOne({
      where: { userLegalId },
    });

    if (!existTicket) {
      return res.status(400).json({ message: 'BAD_REQUEST: Tickets not found!', errorId: uuid() });
    }

    const bookedTicket = await bookingModel.findOne({
      where: { id: existTicket.ticketBookingId },
    });

    const today = new Date();
    const ticketDetail = await ticketMasterModel.findOne({
      where: {
        id: bookedTicket.ticketTypeId,
        ticketAvailFrom: {
          [Op.lte]: today,
        },
        ticketAvailUntil: {
          [Op.gte]: today,
        },
      },
    });

    if (!ticketDetail) {
      return res.status(400).json({ message: 'BAD_REQUEST: Event not found for today!', errorId: uuid() });
    }

    if (existTicket.status === ticketStatus.CANCELLED) {
      message = ticketStatus.CANCELLED;
    }

    if (existTicket.status === ticketStatus.ALLOWED) {
      message = ticketStatus.ALREADYUSED;
    }

    if (existTicket.status === ticketStatus.DENIED || existTicket.status === null) {
      const UpdateTicketData = {
        status: ticketStatus.ALLOWED,
        state: ticketState.ASSISTED,
      };

      const updatedTicket = await existTicket.update(UpdateTicketData);
      if (!updatedTicket) {
        return res.status(400).json({ message: 'BAD_REQUEST: Please try again', errorId: uuid() });
      }
      message = ticketStatus.ALLOWED;
    }

    req.session = {
      data: {
        message,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEventTickets,
  getEventTickets,
  updateEventTickets,
  refundEventTickets,
  verifyTicket,
};
