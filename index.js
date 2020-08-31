const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const bugsnag = require('@bugsnag/js');
const bugsnagExpress = require('@bugsnag/plugin-express');
const { logger: Logger, ExpressMiddlewares, models } = require('ias-utils');
const passport = require('passport');
const session = require('express-session');
const debug = require('debug')('ias-gestion-api:index');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const cors = require('cors');
const appConfig = require('./src/lib/appConfig');
const indexRoutes = require('./src/routes/index');
const env = require('./src/env');

const sessionStore = new SequelizeStore({
  db: models.sequelize,
});

const app = express();
app.use(cors());

const bugsnagClient = bugsnag({ apiKey: '56f80ba532b78d34371a68fbbaea77d0', logger: null });
bugsnagClient.use(bugsnagExpress);
const bugReport = bugsnagClient.getPlugin('express');

const logger = Logger({
  LOGLEVEL: 'DEBUG',
});

app.use(session({
  store: sessionStore,
  secret: 'MYSECRETISVERYSECRET',
  resave: false,
  saveUninitialized: false,
}));

app.set('view engine', 'jade');
if (env.nodeEnv === 'production' || env.nodeEnv === 'development') {
  app.use(bugReport.requestHandler);
}
app.use(ExpressMiddlewares.logData(env));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(helmet());


app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname));
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');


/* Report errors to bugsnag */
// if (env.nodeEnv === 'production' || env.nodeEnv === 'development') {
app.use(bugReport.errorHandler);
// }

/* app.get('/', (req, res) => {
  res.render('pages/index');
}); */

app.use(appConfig.trimParams);
app.use('/api', indexRoutes);

app.use(appConfig.handleError);
app.use(appConfig.handleSuccess);
app.use(appConfig.handle404);

const port = env.PORT || '3000';
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  debug('Inside uncaughtException', error);
});

module.exports = app;
