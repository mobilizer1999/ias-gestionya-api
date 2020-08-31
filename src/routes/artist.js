const express = require('express');
const jwtauth = require('../lib/passport');
const artistsController = require('../controllers/artist');
const { role } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

router.post('/create', [jwtauth], roleAuth(role.ADMIN), [artistsController.createArtist]);
router.post('/query', [jwtauth], roleAuth(role.ADMIN), [artistsController.getArtist]);

module.exports = router;
