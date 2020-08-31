const express = require('express');
const multer = require('multer');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;

const jwtauth = require('../lib/passport');
const userController = require('../controllers/user');
const appConstant = require('../constants/app');
const { role } = require('../constants/app');
const roleAuth = require('../lib/roleAuth');

const router = express.Router();

passport.use(new TwitterStrategy({
  consumerKey: appConstant.twitterApp.apiKey,
  consumerSecret: appConstant.twitterApp.apiSecret,
  callbackURL: appConstant.twitterApp.callbackURL,
},
((token, tokenSecret, user, done) => {
  done(null, user);
})));
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

const st = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, appConstant.rootPath + appConstant.imagesPath.user);
  },
  filename(req, file, cb) {
    cb(null, file.originalname);
  },
});

const storage = multer({ storage: st });

router.post('/register', [userController.registerUser]);

router.get('/register/oauth/facebook', [userController.facebookAuthentication]);

router.get('/register/oauth/twitter', passport.authenticate('twitter'));

router.get('/register/oauth/twitter/callback', passport.authenticate('twitter'), [userController.twitterAuthentication]);

router.post('/register/confirm', [jwtauth], [userController.confirmRegisterUser]);

router.post('/register/resendOtp', [jwtauth], [userController.resendOtp]);

router.put('/update', storage.any(), [jwtauth], [userController.updateUser]);

router.post('/update/verify', [jwtauth], [userController.verifyUpdatedUser]);

router.post('/password/reset', [userController.resetPassword]);

router.post('/password/reset/update', [userController.updateResetedPassword]);

router.post('/auth', [userController.authenticate]);

router.get('/auth/token', [jwtauth], [userController.getCurrentUser]);

router.post('/', [jwtauth], roleAuth(role.ADMIN), [userController.addUser]);

router.get('/', [jwtauth], roleAuth(role.ADMIN), [userController.getAllUser]);

router.get('/:id', [jwtauth], roleAuth(role.ADMIN), [userController.getUserById]);

router.delete('/', [jwtauth], roleAuth(role.ADMIN), [userController.deleteUser]);

router.put('/password/update', [jwtauth], [userController.updatePassword]);

module.exports = router;
