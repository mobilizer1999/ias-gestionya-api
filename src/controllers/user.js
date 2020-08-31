/* eslint-disable security/detect-non-literal-fs-filename, consistent-return,
 camelcase, no-underscore-dangle, prefer-destructuring */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { uuid } = require('uuidv4');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const PasswordValidator = require('password-validator');
const randomize = require('randomatic');
const debug = require('debug')('ias-gestion-api:userController');
const fs = require('fs');
const Op = require('sequelize').Op;
const juice = require('juice');
const _ = require('lodash');
const { models } = require('ias-utils');


const { sendEmail, sendSms } = require('../lib/utils');

const appConstants = require('../constants/app');

const { S3FS } = require('../constants/app');

const { userModel, placesModel } = models;

const S3FS_CONFIG = {
  bucketName: S3FS.BUCKETNAME,
  dirName: 'user',
  region: S3FS.REGION,
  accessKeyId: S3FS.ACCESSKEYID,
  secretAccessKey: S3FS.SECRETACCESSKEY,
};

AWS.config.update({
  accessKeyId: S3FS_CONFIG.accessKeyId,
  secretAccessKey: S3FS_CONFIG.secretAccessKey,
  region: S3FS_CONFIG.region,
});

const s3 = new AWS.S3();

const PwSaltRounds = 10;
const aFiles = [
  'selfieUrl',
];
const getImageNameFromUrl = (imageName) => {
  if (!imageName) { return; }
  const sArray = imageName.split('/');
  let fileteredName;
  if (sArray.length > 1) {
    fileteredName = sArray[sArray.length - 1];
  }
  return fileteredName || imageName;
};

const sendUserVerification = async (user, callback) => {
  debug('inside sendUserVerification');
  // Read OTP email template
  fs.readFile(appConstants.templetes.sendOtp, 'utf8', async (error, fileData) => {
    if (error) {
      return error;
    }
    // Create user token
    const token = await jwt.sign({ id: user.id, role: user.role }, appConstants.jwtSecret);
    // Create OTP
    const otp = randomize('0', 6);
    // Save token and OTP code in user object
    const updatedUser = await user.update({
      token,
      otp,
    });
    // If failed to save token or otp in object return error 500
    if (!updatedUser) {
      return error;
    }
    let compiledTemplate = _.template(fileData);
    const templeteData = {
      otp,
      verifyUserUrl: appConstants.verifyUserUrl + token,
    };
    compiledTemplate = compiledTemplate(templeteData);
    const htmlData = juice(compiledTemplate);
    // If user registered with email, send OTP via email.
    if (user.email) {
      const emailData = {
        to: user.email,
        subject: 'Registration Verification',
        body: htmlData,
      };
      try {
        await sendEmail(emailData);
      } catch (er) {
        return er;
      }
    } else if (user.cellphone) { // If user registered with email, send OTP via email.
      const smsBody = `Use  ${otp} as your verification code for Gestion-Ya.`;
      const smsData = {
        to: user.cellphone,
        body: smsBody,
        subject: 'Registration Verification',
      };
      try {
        await sendSms(smsData);
      } catch (er) {
        return er;
      }
    }
    return callback(null, token);
  });
};

function validatePassword(password) {
  const schema = new PasswordValidator();
  schema
    .is().min(8)
    .is().max(100)
    .has()
    .uppercase()
    .has()
    .lowercase()
    .has()
    .digits()
    .has()
    .not()
    .spaces();
  return schema.validate(password);
}


const registerUser = async (req, res, next) => {
  try {
    debug('inside registerUser');
    const { email, password, cellphone } = req.body;
    // Check that exist email or cellphone and password.
    if ((!email && !cellphone) || !password) { // OK
      return res.status(400).json({ message: 'BAD_REQUEST: Missing email, cellphone or password.' });
    }
    // Check that password is valid.
    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'BAD_REQUEST: Password should have 8 characters,  1 mayus, 1 minus and 1 number. Spaces are not allowed.' });
    }
    // Create array and store email or cellphone if they exist.
    const filter = [];
    if (email) {
      filter.push({ email });
    }
    if (cellphone) {
      filter.push({ cellphone });
    }
    // Search if user exist by email or cellphone.
    let user = await userModel.findOne({
      where: {
        [Op.or]: filter,
      },
    });
    // If user is alredy registered return error code 400
    if (user && user.isVarified) {
      return res.status(400).json({ meesage: 'BAD_REQUEST: User already exits.', errorId: uuid() });
    }
    // If user does not exist, create it on database.
    if (!user) {
      // Hash the password
      const encryptedPW = await bcrypt.hash(password, PwSaltRounds);
      // Create the user with the params.
      user = await userModel.create({
        email,
        cellphone,
        password: encryptedPW,
        role: appConstants.role.ADMIN,
      });

      // If cant be created, response with 500 error code.
      if (!user) {
        return res.status(500).json({ meesage: 'INTERNAL_SERVER_ERROR', errorId: uuid() });
      }
    }
    // Send OTP code to client to verify registration medium.
    await sendUserVerification(user, (error, result) => {
      if (error) {
        return next(error);
      }
      const token = result;
      req.session = {
        data: {
          registerToken: token,
        },
      };
      return next();
    });
  } catch (error) {
    return res.status(500).json({ meesage: 'INTERNAL_SERVER_ERROR', errorId: uuid(), error });
  }
};

const confirmRegisterUser = async (req, res, next) => {
  try {
    debug('inside confirmRegisterUser');
    // destructuring the req.body only code and decoded.
    const { code, decodedUser } = req.body;
    // If code does not exists return invalid data.
    if (!code) {
      return res.status(400).json({ message: 'BAD_REQUEST: invalid data', errorId: uuid() });
    }
    debug('code', code);
    // If code exists search for user with id, and otp code.
    const user = await userModel.findOne({
      where: {
        id: decodedUser.id,
        otp: code,
      },
    });
    // If User, can't be found, is because is alrady verify
    if (!user) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid Data', errorId: uuid() });
    }
    // Else continue and verify the user.
    const updatedUser = await user.update({
      isVarified: true,
    });

    if (!updatedUser) {
      return res.status(400).json({ message: 'BAD_REQUEST : Can not update user', errorId: uuid() });
    }
    req.session = {
      data: {
        message: 'User registered sucessfully!',
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    callback(array[parseInt(index, 10)], index, array);
  }
}

const updateUser = async (req, res, next) => {
  try {
    debug('inside updateUser');
    const params = req.body;
    const { id } = req.params;
    delete params.decodedUser;
    if (!params) {
      return res.status(400).json({ message: 'BAD_REQUEST: invalid data', errorId: uuid() });
    }

    const user = await userModel.findOne({
      where: {
        id,
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'BAD_REQUEST: User not found!', errorId: uuid() });
    }

    const isEmailMatched = params.email && !(params.email === user.email);
    const isCellphoneMatched = params.cellphone && !(params.cellphone === user.cellphone);
    if (isEmailMatched || isCellphoneMatched) {
      if (isCellphoneMatched) {
        const isCellphoneExist = await userModel.findOne({
          where: { cellphone: params.cellphone },
        });

        if (isCellphoneExist) {
          return res.status(400).json({ message: `User with ${params.cellphone} is already exits!`, errorId: uuid() });
        }
      }

      if (isEmailMatched) {
        const isEmailExist = await userModel.findOne({
          where: { email: params.email },
        });

        if (isEmailExist) {
          return res.status(400).json({ message: `User with ${params.email} is already exits!`, errorId: uuid() });
        }
      }
      params.isVarified = false;
      params.otp = randomize('0', 6);

      fs.readFile(appConstants.templetes.sendOtp, 'utf8', async (error, fileData) => {
        if (error) {
          return res.status(400).json({ message: 'Something went wrong please try again!', errorId: uuid() });
        }
        try {
          let compiledTemplate = _.template(fileData);
          const templeteData = {
            otp: params.otp,
            verifyUserUrl: appConstants.verifyUserUrl + user.token,
          };

          compiledTemplate = compiledTemplate(templeteData);
          const htmlData = juice(compiledTemplate);
          if (user.email) {
            const emailData = {
              to: 'name@namykjfjfitfhgdjhgjdhfe.com',
              subject: 'Updated Profile Details Verification',
              body: htmlData,
            };
            try {
              await sendEmail(emailData);
            } catch (er) {
              return res.send(500).json({ message: 'Failed to send email', errorId: uuid(), error: er });
            }
          } else if (user.cellphone) {
            const smsBody = `Use  ${params.otp} as your verification code for Gestion-Ya.`;
            const smsData = {
              to: user.cellphone,
              body: smsBody,
              subject: 'Updated Profile Details Verification',
            };
            try {
              await sendSms(smsData);
            } catch (er) {
              return res.send(500).json({ message: 'Failed to send sms', errorId: uuid() });
            }
          }
        } catch (err) {
          return next(err);
        }
      });
    }

    aFiles.forEach((name) => {
      params[`${name}`] = getImageNameFromUrl(params[`${name}`]);
    });
    const updatedUser = await user.update(params);
    if (!updatedUser) {
      return res.send(400).json({ message: 'UpdateUser fails!', errorId: uuid() });
    }

    if (req.files && req.files.length !== 0) {
      await asyncForEach(req.files, async (file) => {
        await s3.putObject({
          Bucket: S3FS_CONFIG.bucketName,
          Body: fs.readFileSync(file.path),
          Key: `${S3FS_CONFIG.dirName}/${file.filename}`,
        })
          .promise()
          .then(() => {
            fs.unlinkSync(file.path);
          })
          .catch(() => { });
      });
    }
    delete params.otp;
    req.session = {
      data: {
        message: 'Account information updated successfully!',
        fieldsUpdated: updatedUser,
        emailVerifying: params.isVarified,
      },
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

const verifyUpdatedUser = async (req, res, next) => {
  try {
    debug('inside verifyUpdatedUser');
    const { code, decodedUser } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'BAD_REQUEST: code does not exists', errorId: uuid() });
    }
    debug('code', code);
    const user = await userModel.findOne({
      where: {
        id: decodedUser.id,
        otp: code,
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'BAD_REQUEST: User not found', errorId: uuid() });
    }

    const updatedUser = await user.update({
      isVarified: true,
    });

    if (!updatedUser) {
      return res.status(400).json({ message: 'BAD_REQUEST: Fail to verify user', errorId: uuid() });
    }

    req.session = {
      data: {
        message: 'User verified successfull',
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    debug('inside resetPassword');
    const { email, cellphone } = req.body;
    console.log(req.body);
    // If email or celphone does not exist return invalid data.
    if (!email && !cellphone) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data cellphone or email', errorId: uuid() });
    }
    // Creat query objet, and full the fields with email or phone.
    const query = {};
    if (email) {
      query.email = email;
    }
    if (cellphone) {
      query.cellphone = cellphone;
    }
    // Search user for email or cellhpone
    const user = await userModel.findOne({
      where: query,
    });

    if (!user) {
      res.send(400).json({ message: 'BAD_REQUEST: User does not exists', errorId: uuid() });
    }

    fs.readFile(appConstants.templetes.resetPassword, 'utf8', async (error, fileData) => {
      if (error) {
        return res.status(400).json({ message: `BAD_REQUEST: Fail to read temaplate because error: ${error}`, errorId: uuid() });
      }
      try {
        const tempPassword = randomize('Aa0', 10);
        let compiledTemplate = _.template(fileData);
        const templeteData = {
          tempPassword,
          resetPasswordUrl: appConstants.resetPasswordUrl,
        };

        compiledTemplate = compiledTemplate(templeteData);
        const htmlData = juice(compiledTemplate);
        let message = '';
        if (user.email) {
          const emailData = {
            to: user.email,
            subject: 'Reset Password',
            body: htmlData,
          };
          try {
            await sendEmail(emailData);
            message = 'Reset password email sent';
          } catch (er) {
            return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR', errorId: uuid() });
          }
        } else if (user.cellphone) {
          const smsBody = `Use  ${tempPassword} as your temporary password for Gestion-Ya.`;
          const smsData = {
            to: user.cellphone,
            body: smsBody,
          };
          try {
            await sendSms(smsData);
            message = 'Reset password sms sent';
          } catch (er) {
            return res.status(500).json({ message: `INTERNAL_SERVER_ERROR: ${er}`, errorId: uuid() });
          }
        }

        const updatedUser = await user.update({
          tempPassword,
        });

        if (!updatedUser) {
          return res.status(400).json({ message: 'BAD_REQUEST: Update user fails.' });
        }
        req.session = {
          data: {
            message,
          },
        };
        return next();
      } catch (err) {
        return next(err);
      }
    });
  } catch (error) {
    return next(error);
  }
};

const updateResetedPassword = async (req, res, next) => {
  try {
    debug('inside UpdateResetedPassword');
    const {
      email, tempPassword, newPassword, cellphone,
    } = req.body;

    if ((!email && !cellphone) || !tempPassword || !newPassword) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data.', errorId: uuid() });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ message: 'The password should have minimim 8 characters 1 number and 1 letter.', errorId: uuid() });
    }

    const query = {};
    if (email) {
      query.email = email;
    }
    if (cellphone) {
      query.cellphone = cellphone;
    }
    query.tempPassword = tempPassword;

    const user = await userModel.findOne({
      where: query,
    });

    if (!user) {
      return res.status(401).json({ message: 'UNAUTHORIZED: Invalid credentials ', errorId: uuid() });
    }

    const encryptedPW = await bcrypt.hash(newPassword, PwSaltRounds);
    const updatedUser = await user.update({
      password: encryptedPW,
    });

    if (!updatedUser) {
      return res.status(400).json({ message: 'Password reseted unsuccessfull!', errorId: uuid() });
    }

    req.session = {
      data: {
        message: 'Password reseted successfully',
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const authenticate = async (req, res, next) => {
  try {
    debug('inside authenticate');
    const { email, password, cellphone } = req.body;

    if ((!email && !cellphone) || !password) {
      return res.status(400).json({ message: 'BAD_REQUEST: Missing email, cellphone or password.', errorId: uuid() });
    }
    const query = {
      isVarified: true,
    };
    if (email) {
      query.email = email;
    }
    if (cellphone) {
      query.cellphone = cellphone;
    }
    let user = await userModel.findOne({
      where: query,
    });

    if (!user) {
      return res.status(401).json({ message: 'UNAUTHORIZED: Invalid credentials.', errorId: uuid() });
    }
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'UNAUTHORIZED: Invalid credentials.', errorId: uuid() });
    }

    if (!user.token) {
      const token = await jwt.sign({ id: user.id }, appConstants.jwtSecret);
      user = await user.update({
        token,
      });
      if (!user) {
        return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR', errorId: uuid() });
      }
    }

    req.session = {
      data: {
        token: user.token,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    debug('inside getCurrentUser');
    const { decodedUser } = req.body;

    const user = await userModel.findOne({
      where: {
        id: decodedUser.id,
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'password', 'tempPassword', 'token', 'otp'] },
    });

    if (!user) {
      return res.status(400).json({ message: 'BAD_REQUEST: User not found!', errorId: uuid() });
    }
    const userDetails = user.toJSON();
    if (user.placeId) {
      const placeDetails = await placesModel.findOne({
        where: {
          id: user.placeId,
        },
        attributes: { exclude: ['createdAt', 'updatedAt'] },
      });
      userDetails.placeName = placeDetails.placeName;
    }
    req.session.data = userDetails;
    return next();
  } catch (error) {
    return next(error);
  }
};

const facebookAuthentication = async (req, res, next) => {
  try {
    debug('Inside facebookAuthentication');

    const { facebookApp } = appConstants;
    const appCode = req.query.code;
    let appToken;
    let url = `https://graph.facebook.com/v3.2/oauth/access_token?client_id=${facebookApp.clientID} &redirect_uri=${facebookApp.callbackURL}&client_secret=${facebookApp.clientSecret}&code=${appCode}`;

    fetch(url, { method: 'GET' })
      .then((response) => response.json())
      .then((response) => {
        appToken = response.access_token;
        url = `https://graph.facebook.com/me?access_token=${appToken}`;
        return fetch(url, { method: 'GET' });
      })
      .then((response) => response.json())
      .then((response) => {
        const { id } = response;
        if (!id) {
          return res.status(400).json({ message: 'BAD_REQUEST: Somthing was rong plewase try again!', errorId: uuid() });
        }

        url = `https://graph.facebook.com/v3.2/${id}?fields=id,name,picture,email&access_token=${appToken}`;
        return fetch(url, { method: 'GET' });
      })
      .then((response) => response.json())
      .then(async (response) => {
        const {
          id, picture, email, name,
        } = response;

        const existUser = await userModel.findOne({
          where: {
            fbId: id,
          },
        });
        let isEmailExist;
        if (email) {
          isEmailExist = await userModel.findOne({
            where: {
              email,
            },
          });
        }
        if (isEmailExist && !existUser) {
          const updateUserData = { fbId: id, isVarified: true };
          const updatedUser = await isEmailExist.update(updateUserData);
          if (!updatedUser) {
            return res.status(400).json({ message: 'Somthing wrong please try again!', errorId: uuid() });
          }
          const token = updatedUser.token;
          res.redirect(301, appConstants.oauthRedirectUrl + token);
        } else if (existUser) {
          res.redirect(301, appConstants.oauthRedirectUrl + existUser.token);
        } else {
          const newUser = {
            firstName: name,
            fbId: id,
            isVarified: true,
            email,
            selfieUrl: picture.data.url,
          };
          const user = await userModel.create(newUser);
          if (!user) {
            return res.status(400).json({ message: 'INVALID PARAMS', errorId: uuid() });
          }
          const token = await jwt.sign({ id: user.id }, appConstants.jwtSecret);
          await user.update({
            token,
          });
          res.redirect(301, appConstants.oauthRedirectUrl + token);
        }
      });
  } catch (error) {
    debug('error', error);
    return next(error);
  }
};

const twitterAuthentication = async (req, res, next) => {
  try {
    debug('Inside twitterAuthentication');
    const {
      id_str, profile_image_url_https, email, name,
    } = req.session.passport.user._json;

    const existUser = await userModel.findOne({
      where: {
        twitterId: id_str,
      },
    });

    let token = '';
    let isEmailexist;
    if (email) {
      isEmailexist = await userModel.findOne({
        where: {
          email,
        },
      });
    }

    if (isEmailexist) {
      const updateUserData = { twitterId: id_str, isVarified: true };
      const updatedUser = await isEmailexist.update(updateUserData);
      if (!updatedUser) {
        return res.status(400).json({ message: 'Somthing wrong please try again!', errorId: uuid() });
      }
      token = updatedUser.token;
    } else if (!existUser && !isEmailexist) {
      const newUser = {
        firstName: name,
        twitterId: id_str,
        isVarified: true,
        email,
        selfieUrl: profile_image_url_https,
      };
      const user = await userModel.create(newUser);
      if (!user) {
        return res.status(400).json({ message: 'Invalid Params', errorId: uuid() });
      }
      token = await jwt.sign({ id: user.id }, appConstants.jwtSecret);
      await user.update({
        token,
      });
    } else {
      token = existUser.token;
    }
    res.redirect(301, appConstants.oauthRedirectUrl + token);
  } catch (error) {
    debug('error', error);
    return next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    debug('Inside Resend OTP');
    const { decodedUser } = req.body;
    const user = await userModel.findOne({
      where: {
        id: decodedUser.id,
      },
    });
    //
    if (!user) {
      return res.status(400).json({ message: 'BAD_REQUEST' });
    }
    await sendUserVerification(user, (error) => {
      if (error) {
        return next(error);
      }
      // const token = result;
      req.session = {
        data: {
          message: 'OTP code sent again!',
          // registerToken: token,
        },
      };
      return next();
    });
  } catch (error) {
    debug('error', error);
    return next(error);
  }
};
// Verify why callback return error.
const sendUserInvitation = async (user, callback) => {
  fs.readFile(appConstants.templetes.inviteUser, 'utf8', async (error, fileData) => {
    if (error) {
      return error;
    }

    const token = await jwt.sign({ id: user.id, role: user.role }, appConstants.jwtSecret);
    const otp = randomize('0', 6);
    const tempPassword = randomize('Aa0', 10);
    const updatedUser = await user.update({
      token,
      otp,
      tempPassword,
    });
    if (!updatedUser) {
      return new Error('cant not update user');
    }
    let compiledTemplate = _.template(fileData);
    const templeteData = {
      tempPassword,
      otp,
      verifyUserUrl: appConstants.verifyUserUrl + token,
    };

    compiledTemplate = compiledTemplate(templeteData);
    const htmlData = juice(compiledTemplate);

    if (user.email) {
      const emailData = {
        to: user.email,
        subject: 'You have Invited to GestionYa.',
        body: htmlData,
      };
      try {
        await sendEmail(emailData);
      } catch (er) {
        return er;
      }
    } else if (user.cellphone) {
      const smsBody = `Use  ${otp} as your verification code and Use  ${tempPassword} as your temporary password for Gestion-Ya.`;
      const smsData = {
        to: user.cellphone,
        body: smsBody,
        subject: 'You have Invited to GestionYa.',
      };
      try {
        await sendSms(smsData);
      } catch (er) {
        return er;
      }
    }
    return callback(null, token);
  });
};

const addUser = async (req, res, next) => {
  try {
    const {
      email, cellphone, role, firstName, lastName, gender,
    } = req.body;
    const { decodedUser } = req.body;
    if ((!email && !cellphone) || !role || !firstName || !lastName) {
      return res.status(400).json({ message: 'Invalid data!', errorId: uuid() });
    }

    const filter = [];
    if (email) {
      filter.push({ email });
    }
    if (cellphone) {
      filter.push({ cellphone });
    }
    let user = await userModel.findOne({
      where: {
        [Op.or]: filter,
      },
    });

    if (user && user.isVarified) {
      return res.status(400).json({ message: 'BAD_REQUEST: User already exits!', errorId: uuid() });
    }
    const userId = decodedUser.id;
    if (!user) {
      user = await userModel.create({
        email,
        cellphone,
        role,
        firstName,
        lastName,
        gender,
        userId,
      });

      if (!user) {
        return res.status(400).json({ message: 'BAD_REQUEST: Invalid data!', errorId: uuid() });
      }
    }

    await sendUserInvitation(user, (error) => {
      if (error) {
        return next(error);
      }
      req.session = {
        data: {
          message: 'User Added sucessfully!',
        },
      };
      return next();
    });
  } catch (error) {
    return next(error);
  }
};

const getAllUser = async (req, res, next) => {
  try {
    console.log(req.body);
    console.log(req.body.decodedUser);
    const { decodedUser } = req.body;
    const query = {
      where: { userId: decodedUser.id },
      attributes: { exclude: ['createdAt', 'updatedAt', 'password', 'tempPassword', 'token', 'otp'] },
    };
    const users = await userModel.findAll({
      where: {
        id: decodedUser.id,
      },
      attributes: {
        exclude: ['id', 'password', 'otp', 'oauth', 'tempPassword', 'createdAt', 'updatedAt', 'token', 'fbId', 'twitterId'],
      },
    });
    req.session = {
      data: {
        users,
      },
    };
    return next();
  } catch (error) {
    console.log('error');
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { decodedUser } = req.body;
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data!', errorId: uuid() });
    }
    console.log(decodedUser);
    const filter = {
      where: { userId: decodedUser.id, id },
      attributes: { exclude: ['createdAt', 'updatedAt', 'password', 'tempPassword', 'token', 'otp', 'placeId', 'isVarified'] },
    };
    const user = await userModel.findOne(filter);
    req.session = {
      data: {
        user,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};


const deleteUser = async (req, res, next) => {
  try {
    const { decodedUser } = req.body;
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data!', errorId: uuid() });
    }
    const deletedUser = await userModel.destroy({
      where: {
        userId: decodedUser.id,
        id,
      },
    });

    if (!deletedUser) {
      return res.status(400).json({ message: 'BAD_REQUEST: User deleted unsuccessfull!', errorId: uuid() });
    }
    req.session.data = { message: 'User deleted successfully!' };
    return next();
  } catch (error) {
    return next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { decodedUser } = req.body;
    console.log();
    const {
      oldPassword, confirmPassword, newPassword,
    } = req.body;
    if (!confirmPassword || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid data!', errorId: uuid() });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ message: 'BAD_REQUEST: The password should have minimim 8 characters 1 number and 1 letter.', errorId: uuid() });
    }

    const user = await userModel.findOne({
      where: {
        id: decodedUser.id,
      },
    });
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid old password!', errorId: uuid() });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'BAD_REQUEST: The password and confirmation password do not match!', errorId: uuid() });
    }
    const isExist = await bcrypt.compare(newPassword, user.password);
    if (isExist) {
      return res.status(400).json({ message: 'BAD_REQUEST: Password is already exist!', errorId: uuid() });
    }
    const encryptedPW = await bcrypt.hash(newPassword, PwSaltRounds);
    const updatedUser = await user.update({
      password: encryptedPW,
    });
    if (!updatedUser) {
      return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR: Password updated unsuccessfull!', errorId: uuid() });
    }
    req.session.data = { message: 'Password updated successfully' };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerUser,
  confirmRegisterUser,
  updateUser,
  verifyUpdatedUser,
  resetPassword,
  updateResetedPassword,
  authenticate,
  getCurrentUser,
  facebookAuthentication,
  twitterAuthentication,
  resendOtp,
  sendUserVerification,
  addUser,
  getAllUser,
  getUserById,
  deleteUser,
  updatePassword,
};
