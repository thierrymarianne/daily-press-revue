<template>
  <div class='status-list'>
    <transition-group
      name='custom-classes-transition'
      enter-active-class='animated slideInLeft'
      leave-active-class='animated slideInLeft'
      tag='div'
    >
      <div 
        :class='listClasses(aggregateType.name)'
        :key='aggregateType.name'
        :data-key='aggregateType.name'
        v-for='aggregateType in aggregateTypes'
      >
        <div v-if='visibleAggregateHasStatuses'>
          <div
            :data-key='status.key'
            :key='status.key'
            class='status-list__item'
            v-show='isAggregateVisible(aggregateType.name)'
            v-for='status in visibleStatuses.statuses'
          >
              <status :status='status' />
          </div>
        </div>
        <div
          v-else-if='isAggregateVisible("bucket")'
          class='status-list__item-none'
        >No item has been added to this bucket before.</div>
      </div>
    </transition-group>
  </div>
</template>

<script>
import ApiMixin  from '../../mixins/api';
import EventHub from '../../modules/event-hub';
import Status from '../status/status.vue';
import SharedState from '../../modules/shared-state';

export default {
  components: {
    Status
  },
  mixins: [ApiMixin],
  name: 'status-list',
  created: function () {
    this.aggregateTypes = this.declareAggregateTypesFromRoutes(this.routes)
    this.getStatuses({ aggregateType: 'pressReview' });
  },
  computed: {
    visibleAggregateHasStatuses: function () {
      return this.aggregateTypes[this.visibleStatuses.name]
      .statuses.length > 0;
    }
  },
  methods: {
    listClasses: function (aggregateType) {
      const classNames = {
         'status-list__list': true
      }; 

      if (this.isAggregateVisible(aggregateType)) {
        classNames['status-list__list--full-width'] = true;
      }
      
      return classNames;
    },
    formatStatuses: function (statuses) {

      if (typeof statuses === 'undefined' || statuses === null) {
        return [];
      }

      let formattedStatuses = [];

      if (typeof statuses.forEach !== 'function') {
        throw Error(this.errorMessages.REQUIRED_COLLECTION);
      }

      statuses.forEach((status) => {
        if ((typeof status.text === 'undefined')
          || (typeof status.text.match !== 'function')) {
          return;
        }

        let links = status.text.match(/http(?:s)?:\/\/\S+/g);

        if (links === null || links === undefined || links.length <= 1) {
          links = [];
        }

        const formattedStatus = {
          username: status.username,
          avatarUrl: status.avatar_url,
          publishedAt: new Date(status.published_at),
          statusId: status.status_id,
          text: this.parseFromString(status.text),
          url: status.url,
          isVisible: false,
          links
        }

        formattedStatus.retweet = status.retweet;
        if (status.retweet) {
          formattedStatus.usernameOfRetweetingMember = status.username_of_retweeting_member;
        }

        formattedStatuses.push(formattedStatus);
      });

      formattedStatuses = formattedStatuses.sort(this.sortByPublicationDate);
      formattedStatuses = formattedStatuses.reduce((statuses, status) => {
        statuses.indexOf(status)
        statuses[statuses.indexOf(status)].key = statuses.indexOf(status);
        return statuses;
      },  formattedStatuses);

      return formattedStatuses;
    },
    switchBetweenVisibleStatuses: function (aggregateType, statuses) {
      Object.keys(this.aggregateTypes).map((aggregateType) => {
        this.aggregateTypes[aggregateType].isVisible = false
      });
      this.aggregateTypes[aggregateType].isVisible = true

      statuses.statuses = Object.assign({}, this.aggregateTypes[aggregateType].statuses);
      statuses.name = aggregateType;      

      return statuses;
    },
    getStatuses: function ({ aggregateType, bustCache }) {
      let shouldBustCache = false;
      if ((typeof bustCache !== 'undefined') && (aggregateType !== 'bucket')) {
        shouldBustCache = bustCache;
      }

      if (this.shouldGuardAgainstUndefinedRoute()) {
        return;
      }

      this.state.fetchedLatestStatusesOfAggregate = aggregateType;

      if (!shouldBustCache
      && ((this.aggregateTypes[aggregateType].statuses.length > 0) 
        || aggregateType === 'bucket')) {
        this.switchBetweenVisibleStatuses(aggregateType, this.visibleStatuses);
        return;
      }

      const route = `${this.routes[aggregateType]}${this.getTimestampSuffix()}`;
      const authenticationToken = localStorage.getItem('x-auth-token');

      this.loadedContentPercentage = 0;

      this.$http.get(
        route, {
          headers: { 'x-auth-token': authenticationToken }
        }
      )
      .then((response) => {
        this.statuses = null;
        try {
          this.aggregateTypes[aggregateType].statuses = this.formatStatuses(response.data);
        } catch (error) {
          SharedState.logger.error(error.message, 'status-list');
          return;
        }

        this.switchBetweenVisibleStatuses(aggregateType, this.visibleStatuses);
        EventHub.$emit('status_list.after_fetch');
      })
      .catch(e => this.logger.error(e.message, 'status-list', e))
    },
    getTimestampSuffix: function () {
      const timestamp = (new Date()).getTime();
      let timestampSuffix = '';
      if (!this.environment.productionMode) {
        let timestampSuffix = `?${timestamp}`;
      }

      return timestampSuffix;      
    },
    isAggregateVisible: function (aggregateType) {
      return aggregateType === this.visibleStatuses.name;
    },
    shouldGuardAgainstUndefinedRoute: function () {
      typeof this.routes === 'undefined';
    },
    sortByPublicationDate: function (statusA, statusB) {
      if (statusA.publishedAt === statusB.publishedAt) {
        return 0;
      }

      if (statusA.publishedAt < statusB.publishedAt) {
        return 1;
      }

      return -1;
    },
    // @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
    parseFromString: function (subject) {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
          '<!doctype html><body>' + subject,
          'text/html');
      return dom.body.textContent;
    },
  },
  mounted: function () {
    EventHub.$on('status_list.reload_intended', this.getStatuses)
  },
  data: function () {
    return {
      aggregateTypes: {},
      state: SharedState.state,
      visibleStatuses: SharedState.state.visibleStatuses,
      errors: [],
      errorMessages: SharedState.errors,
      loadedContentPercentage: SharedState.state.loadedContentPercentage,
      logger: SharedState.logger,
      logLevel: SharedState.logLevel,
      environment: SharedState.getEnvironmentParameters(),
    };
  },
}
</script>

<style scoped>
@import './status-list.scss';
</style>