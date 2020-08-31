const express = require('express');
const jwtauth = require('../lib/passport');
const ambientController = require('../controllers/ambient');
const { role } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

router.post('/create', [jwtauth], roleAuth(role.ADMIN), [ambientController.createAmbient]);
router.post('/query', [jwtauth], roleAuth(role.ADMIN), [ambientController.getAmbients]);

module.exports = router;
