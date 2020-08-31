const path = require('path');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
  const envFileName = process.env.NODE_ENV ? `.${process.env.NODE_ENV.trim()}` : '';
  dotenv.config({ path: path.resolve(__dirname, `../config/.env${envFileName}`) });
}

const env = {
  nodeEnv: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTENDURL: process.env.FRONTENDURL,
  APIURL: process.env.APIURL,
  MAILERAPPURL: process.env.MAILERAPPURL,
  mysql: {
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    host: process.env.MYSQL_HOST,
  },
  logLevel: process.env.logLevel,
};

module.exports = env;
