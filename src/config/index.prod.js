
const ravenDsn = process.env.RAVEN_DSN
const authenticationApiKey = process.env.AUTHENTICATION_API_KEY
const authenticationAudience = process.env.AUTHENTICATION_AUDIENCE
const authenticationHost = process.env.AUTHENTICATION_HOST
const authenticationClientId = process.env.AUTHENTICATION_CLIENT_ID
const authenticationRedirectUri = process.env.AUTHENTICATION_REDIRECT_URI
const authenticationLogoutUri = process.env.AUTHENTICATION_LOGOUT_URI

const raven = {
  dsn: ravenDsn
};

const testMode = false;

const getHostAndScheme = environmentProvider => {
  let host = 'localhost';
  let scheme = 'http://';

  const environment = environmentProvider.getEnvironmentParameters();
  if (environment.productionMode) {
    host = 'api.press-review.weaving-the-web.org';
    scheme = 'https://';
  }

  return {
    host,
    scheme
  };
};

const api = {
  routes: {
    actions: {
      fetchHighlights: {
        method: 'get',
        route: '/api/twitter/highlights',
        params: {
          pageSize: Number,
          pageIndex: Number
        }
      }
    }
  }
};

const getApi = environmentProvider => {
  api.host = getHostAndScheme(environmentProvider).host;
  api.scheme = getHostAndScheme(environmentProvider).scheme;

  return api;
};
const getRoutes = () => api.routes;
const getSchemeAndHost = () => `${api.scheme}${api.host}`;

const authentication = {
  apiKey: authenticationApiKey,
  auth0: {
    audience: authenticationAudience,
    host: authenticationHost,
    clientId: authenticationClientId,
    redirectUri: authenticationRedirectUri,
    logoutUri: authenticationLogoutUri
  }
};
localStorage.setItem('x-auth-token', authentication.apiKey);

export default {
  authentication,
  getApi,
  getRoutes,
  getSchemeAndHost,
  raven,
  testMode
};
