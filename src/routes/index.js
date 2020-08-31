const express = require('express');
const healthCheckRoutes = require('./healthCheck');
const userRoutes = require('./user');
const placesRoutes = require('./places');
const eventsRoutes = require('./events');
const genersRoutes = require('./geners');
const ambientRoutes = require('./ambient');
const artistRoutes = require('./artist');
const dresscodeRoutes = require('./dresscode');
const ticketMasterRoutes = require('./ticketMaster');
const clientsRoutes = require('./client');

const router = express.Router();

router.use('/healthcheck', healthCheckRoutes);
router.use('/user', userRoutes);
router.use('/places', placesRoutes);
router.use('/events', eventsRoutes);
router.use('/geners', genersRoutes);
router.use('/ambient', ambientRoutes);
router.use('/artist', artistRoutes);
router.use('/dresscode', dresscodeRoutes);
router.use('/tickets', ticketMasterRoutes);
router.use('/clients', clientsRoutes);

module.exports = router;
