const express = require('express');
const multer = require('multer');

const jwtauth = require('../lib/passport');
const eventsController = require('../controllers/events');
const { role, rootPath, imagesPath } = require('../constants/app');

const roleAuth = require('../lib/roleAuth');

const router = express.Router();

const st = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, rootPath + imagesPath.event);
  },
  filename(req, file, cb) {
    cb(null, file.originalname);
  },
});
const storage = multer({ storage: st });

router.post('/create', storage.any(), [jwtauth], roleAuth(role.ADMIN), [eventsController.createEvent]);
router.get('/query', [jwtauth], roleAuth(role.ADMIN), [eventsController.getEvents]);
router.put('/update', storage.any(), [jwtauth], roleAuth(role.ADMIN), [eventsController.updateEvent]);
router.delete('/delete', [jwtauth], roleAuth(role.ADMIN), [eventsController.deleteEvent]);

module.exports = router;
