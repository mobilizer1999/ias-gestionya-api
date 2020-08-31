const express = require('express');
const jwtauth = require('../lib/passport');
const clientController = require('../controllers/client');
const { role } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

router.get('/query', [jwtauth], roleAuth(role.ADMIN), [clientController.getClients]);

module.exports = router;
