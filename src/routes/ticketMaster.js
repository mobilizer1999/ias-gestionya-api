const express = require('express');
const jwtauth = require('../lib/passport');
const ticketMasterController = require('../controllers/ticketMaster');
const { role } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

router.post('/create', [jwtauth], roleAuth(role.ADMIN), [ticketMasterController.createEventTickets]);
router.get('/query', [jwtauth], roleAuth(role.ADMIN), [ticketMasterController.getEventTickets]);
router.post('/update', [jwtauth], roleAuth(role.ADMIN), [ticketMasterController.updateEventTickets]);
router.post('/refund', [jwtauth], roleAuth(role.ADMIN), [ticketMasterController.refundEventTickets]);
router.post('/verify', [jwtauth], roleAuth(role.DOORCONTROL), [ticketMasterController.verifyTicket]);

module.exports = router;
