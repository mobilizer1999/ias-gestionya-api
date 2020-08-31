const express = require('express');
const jwtauth = require('../lib/passport');
const dresscodeController = require('../controllers/dresscode');
const { role } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

router.post('/create', [jwtauth], roleAuth(role.ADMIN), [dresscodeController.createDressCode]);
router.post('/query', [jwtauth], roleAuth(role.ADMIN), [dresscodeController.getDressCodes]);

module.exports = router;
