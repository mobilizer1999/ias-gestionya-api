
const ROOT_PATH = process.cwd();
const env = require('../env');

exports.rootPath = ROOT_PATH;

exports.imagesPath = {
  user: '/images/user/',
  place: '/images/place/',
  event: '/images/event/',
};
exports.jwtSecret = 'my_token_secret';

exports.facebookApp = {
  clientID: '1991314174329450',
  clientSecret: 'e16eb48a7c6bb54c74d916999cf5dbe5',
  callbackURL: `${env.APIURL}/api/user/register/oauth/facebook`,
};

exports.twitterApp = {
  apiKey: 'tfSYPl0XAWQg68OAEmPnbbEo2',
  apiSecret: 'iCFsys0HxORIVBoUOZhv7AzbAszcyI3TN2uQE2jRxrg1Wd79BM',
  callbackURL: `${env.APIURL}/api/user/register/oauth/twitter/callback`,
};

exports.S3FS = {
  ACCESSKEYID: 'AKIA4H24Q6DP4VSVPU7Z',
  SECRETACCESSKEY: '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',
  REGION: 'us-west-2',
  ROOT_URL: 'https://s3-us-west-2.amazonaws.com/',
  BUCKETNAME: 'ias-image-upload',
  IMAGEDIRECTORY: {
    USER_IMG_DIR: 'ias-image-upload/user',
    EVENT_IMG_DIR: 'ias-image-upload/event',
    PLACE_IMG_DIR: 'ias-image-upload/place',
  },
};

exports.S3_IMAGES_PATH = {
  USER_IMAGES: `${this.S3FS.ROOT_URL}${this.S3FS.IMAGEDIRECTORY.USER_IMG_DIR}/`,
  EVENT_IMAGES: `${this.S3FS.ROOT_URL}${this.S3FS.IMAGEDIRECTORY.EVENT_IMG_DIR}/`,
  PLACE_IMAGES: `${this.S3FS.ROOT_URL}${this.S3FS.IMAGEDIRECTORY.PLACE_IMG_DIR}/`,
};

exports.oauthRedirectUrl = `${env.FRONTENDURL}/#/login?registerToken=`;

exports.mailerApp = {
  sendSmsUrl: `${env.MAILERAPPURL}/send/sms`,
  sendEmailUrl: `${env.MAILERAPPURL}/send/email`,
};
exports.templetes = {
  sendOtp: `${this.rootPath}/src/templetes/email/verifyUser.html`,
  resetPassword: `${this.rootPath}/src/templetes/email/resetPassword.html`,
  inviteUser: `${this.rootPath}/src/templetes/email/inviteUser.html`,
};

exports.verifyUserUrl = `${env.FRONTENDURL}/#/verify-user?token=`;
exports.resetPasswordUrl = `${env.FRONTENDURL}/#/reset-password`;

exports.role = {
  MANAGER: 'MANAGER',
  RRPP: 'RRPP',
  ADMIN: 'ADMIN',
  DOORCONTROL: 'DOORCONTROL',
};

exports.ticketState = {
  PURCHASED: 'PURCHASED',
  ASSIGNED: 'ASSIGNED',
  ASSISTED: 'ASSISTED',
  NOTASSISTED: 'NOTASSISTED',
};

exports.ticketStatus = {
  CANCELLED: 'CANCELLED',
  ALLOWED: 'ALLOWED',
  ALREADYUSED: 'ALREADYUSED',
  DENIED: 'DENIED',
};
