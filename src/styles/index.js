import Vue from 'vue';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowAltCircleUp,
  faArrowAltCircleDown,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import styles from './global.scss';

// See https://fontawesome.com/how-to-use/on-the-web/using-with/vuejs
library.add(faArrowAltCircleUp);
library.add(faArrowAltCircleDown);

Vue.component('font-awesome-icon', FontAwesomeIcon);

export default {
  Styles: styles,
  components: {
    'font-awesome-icon': FontAwesomeIcon,
  },
};
