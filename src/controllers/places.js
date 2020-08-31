/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable consistent-return */
const AWS = require('aws-sdk');
const fs = require('fs');
const { uuid } = require('uuidv4');
const debug = require('debug')('ias-gestion-api:placesController');
const { models } = require('ias-utils');

const { placesModel } = models;

const { S3FS } = require('../constants/app');

const S3FS_CONFIG = {
  bucketName: S3FS.BUCKETNAME,
  dirName: 'place',
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

const aFiles = [
  'landingPicture',
  'placePicture0',
  'placePicture1',
  'placePicture2',
  'placePicture3',
  'placePicture4',
  'placePicture5',
  'placePicture6',
  'placePicture7',
  'placePicture8',
  'placePicture9',
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

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    callback(array[parseInt(index, 10)], index, array);
  }
}

const createPlace = async (req, res, next) => {
  try {
    debug('inside createPlace');
    const params = req.body;
    if (!params.placeName || !params.placeDescription
      || !params.locationAddress || !params.decodedUser) {
      return res.status(400).json({ message: 'BAD_REQUEST: Missing required field. placeName, placeDescription and LocationAddress are mandatory.', errorid: uuid() });
    }

    const userId = params.decodedUser.id;
    const { placeName } = params;
    const existPlace = await placesModel.findOne({
      where: {
        placeName,
        userId,
      },
    });
    if (existPlace) {
      return res.status(400).json({ message: 'BAD_REQUEST: Place name alrady exists.', errorid: uuid() });
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
          .catch(() => {});
      });
    }
    params.userId = userId;
    const place = await placesModel.create(params);
    if (!place) {
      return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR: Place saved unsuccessfull!', errorId: uuid() });
    }
    req.session = {
      data: {
        message: 'Place saved successfully!',
        placeId: place.id,
        placeName: place.placeName,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getPlace = async (req, res, next) => {
  try {
    debug('inside getPlace');
    const { placeId } = req.query;
    const { decodedUser } = req.body;
    const filter = {
      where: {
        userId: decodedUser.id,
      },
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    };
    if (placeId) {
      filter.where.id = placeId;
    }

    const places = await placesModel.findAll(filter);
    req.session = {
      data: {
        places,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const updatePlace = async (req, res, next) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'BAD_REQUEST: Invalid Data.', errorid: uuid() });
    }

    const params = req.body;
    const { placeId } = params;
    aFiles.forEach((name) => {
      params[`${name}`] = getImageNameFromUrl(params[`${name}`]);
    });
    delete params.decodedUser;

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
          .catch(() => {});
      });
    }

    const updatedPlace = await placesModel.update(params, {
      where: {
        id: placeId,
      },
    });
    if (!updatedPlace) {
      return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR: Place Info updated unsuccessfull!' });
    }
    req.session = {
      data: {
        message: 'Place updated successfully!',
        placeId,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

const getAllPlace = async (req, res, next) => {
  try {
    debug('inside getPlace');
    const { decodedUser } = req.body;
    const filter = {
      where: {
        userId: decodedUser.id,
      },
      attributes: { exclude: ['createdAt', 'updatedAt', 'userId'] },
    };
    const places = await placesModel.findAll(filter);
    req.session = {
      data: {
        places,
      },
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPlace,
  getPlace,
  updatePlace,
  getAllPlace,
};
