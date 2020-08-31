const request = require('request-promise');
const { models } = require('ias-utils');
const debug = require('debug')('ias-gestion-api:utils');
const appConstants = require('../constants/app');


const { mailerCredentialsModel } = models;
const sendSms = async (smsData) => {
  const userData = await mailerCredentialsModel.findOne();
  const bodyData = {
    apiKey: userData.dataValues.apiKey,
    apiPass: userData.dataValues.apiPass,
    body: smsData.body,
    to: smsData.to,
    module: 'sms',
    subject: smsData.subject,
  };
  const options = {
    method: 'post',
    url: appConstants.mailerApp.sendSmsUrl,
    body: bodyData,
    json: true,
  };
  // debug('send sms : ', options);
  const response = await request(options);
  return response;
};

const sendEmail = async (emailData) => {
  try {
    debug('inside sendEmail');
    const userData = await mailerCredentialsModel.findOne();
    const bodyData = {
      apiKey: userData.dataValues.apiKey,
      apiPass: userData.dataValues.apiPass,
      sendto: emailData.to,
      subject: emailData.subject,
      emailbody: emailData.body,
      module: 'email',
    };
    // debug('emailData : ', emailData);
    const options = {
      method: 'POST',
      url: appConstants.mailerApp.sendEmailUrl,
      body: bodyData,
      json: true,
    };
    const response = await request(options);
    return response;
  } catch (error) {
    error.message = 'INTERNAL_SERVER_ERROR';
    throw error;
  }
};

module.exports = {
  sendSms,
  sendEmail,
};
