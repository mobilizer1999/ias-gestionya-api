const express = require('express');
const jwtauth = require('../lib/passport');
const genersController = require('../controllers/geners');
const { role } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

router.post('/create', [jwtauth], roleAuth(role.ADMIN), [genersController.createGeners]);
router.post('/query', [jwtauth], roleAuth(role.ADMIN), [genersController.getGeners]);

module.exports = router;
