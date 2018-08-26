import SharedState from '../modules/shared-state';

const raven = {
  dsn: 'https://b5bbb7c4a5554e70b91b1055093f6bda@sentry.io/1268836',
};

let host = '192.168.2.24:8090';
let scheme = 'http://';
if (SharedState.state.productionMode) {
  host = 'api.press-review.weaving-the-web.org';
  scheme = 'https://';
}

const api = {
  host: host,
  scheme: scheme,
  routes: {
    'latest-statuses': '/api/twitter/tweet/latest',
    'press-review': '/api/twitter/tweet/latest/news__France',
    clojure: '/api/twitter/tweet/latest/programming__clojure',
    javascript: '/api/twitter/tweet/latest/programming__JavaScript',
    golang: '/api/twitter/tweet/latest/programming__Golang',
    python: '/api/twitter/tweet/latest/programming__Python',
    rust: '/api/twitter/tweet/latest/programming__Rust',
    scala: '/api/twitter/tweet/latest/programming__scala',
    php: '/api/twitter/tweet/latest/programming__PHP',
    'vue-js': '/api/twitter/tweet/latest/library_vuejs',
  },
};

const authentication = {
  apiKey: 'ec5610735b9d646e569e57d02b1c9411794b53de',
};
localStorage.setItem('x-auth-token', authentication.apiKey);

export default {
  authentication,
  api,
  raven,
};
