const express = require('express');
const multer = require('multer');

const jwtauth = require('../lib/passport');
const placesController = require('../controllers/places');
const { role, rootPath, imagesPath } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

const st = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, rootPath + imagesPath.place);
  },
  filename(req, file, cb) {
    cb(null, file.originalname);
  },
});
const storage = multer({ storage: st });

router.post('/create', storage.any(), [jwtauth], roleAuth(role.ADMIN), [placesController.createPlace]);
router.post('/update', storage.any(), [jwtauth], roleAuth(role.ADMIN), [placesController.updatePlace]);
router.get('/query', [jwtauth], roleAuth(role.ADMIN), [placesController.getPlace]);
router.get('/getAll', [jwtauth], roleAuth(role.ADMIN), [placesController.getAllPlace]);


module.exports = router;
