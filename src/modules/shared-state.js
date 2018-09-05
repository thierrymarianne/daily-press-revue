import Raven from 'raven-js';

import Config from '../config';
import testApi from '../config/index.test';

const developmentMode = process.env.NODE_ENV !== 'production';
const productionMode = !developmentMode;

const environmentParameters = {
  developmentMode: developmentMode,
  mobileMode: developmentMode,
  productionMode: !developmentMode,
  testMode: Config.testMode
};

const getEnvironmentParameters = () => environmentParameters;

const environmentProvider = { getEnvironmentParameters };

let apiMixin = {
  computed: {
    routes: function() {
      return testApi.getApi(environmentProvider).routes;
    }
  }
};

if (!Config.testMode) {
  const api = Config.getApi(environmentProvider);
  apiMixin = {
    computed: {
      routes: function() {
        return {
          pressReview: `${api.scheme}${api.host}${api.routes['press-review']}`
        };
      }
    }
  };
}

environmentParameters.test = {
  apiMixin
};

const isDevelopmentModeActive = () =>
  getEnvironmentParameters().developmentMode;
const isProductionModeActive = () => getEnvironmentParameters().productionMode;
const isTestModeActive = () => getEnvironmentParameters().testMode;

const disableTestMode = () => {
  getEnvironmentParameters().developmentMode = true;
  getEnvironmentParameters().mobileMode = false;
  getEnvironmentParameters().productionMode = false;
  getEnvironmentParameters().testMode = false;
};

const enableTestMode = () => {
  getEnvironmentParameters().developmentMode = false;
  getEnvironmentParameters().productionMode = true;
  getEnvironmentParameters().mobileMode = false;
  getEnvironmentParameters().testMode = true;

  // Allow conditional import
  // @see https:// https://stackoverflow.com/a/46543835
  // and https://babeljs.io/docs/en/babel-plugin-syntax-dynamic-import/
  return true;
};

const toggleTestMode = () => {
  if (!isTestModeActive()) {
    enableTestMode();

    return;
  }

  disableTestMode();
};

getEnvironmentParameters().toggleTestMode = toggleTestMode;

const REQUIRED_COLLECTION = 'Empty aggregate';

const errors = {
  REQUIRED_COLLECTION
};

const state = {
  actions: {
    fetchedLatestStatusesOfAggregate: null
  },
  visibleStatuses: {
    statuses: {},
    name: 'pressReview'
  }
};

const logLevel = {
  isSilent: false,
  onError: function() {}
};

const logger = {
  info(message, file, extra) {
    if (logLevel.isSilent) {
      return;
    }

    if (productionMode) {
      Raven.captureMessage(message, {
        level: 'info',
        logger: file,
        extra
      });
    }
  },
  error(error, file, extra) {
    logLevel.onError({ error, file, extra });

    if (logLevel.isSilent) {
      return;
    }

    if (productionMode) {
      Raven.captureException(error, {
        logger: file,
        extra
      });
      return;
    }

    throw error;
  }
};

export default {
  disableTestMode,
  enableTestMode,
  errors,
  getEnvironmentParameters,
  isDevelopmentModeActive,
  isProductionModeActive,
  isTestModeActive,
  logger,
  logLevel,
  state
};
