<template>
  <div class="status-list">
    <transition-group
      class="status-list__transition"
      name="custom-classes-transition"
      enter-active-class="animated slideInLeft"
      leave-active-class="animated slideInLeft"
      tag="div"
    >
      <div
        v-for="aggregateType in aggregateTypes"
        :class="listClasses(aggregateType.name)"
        :key="aggregateType.name"
        :data-key="aggregateType.name"
      >
        <template v-if="visibleAggregateHasStatuses">
          <div
            v-for="status in visibleStatuses.statuses"
            v-show="isAggregateVisible(aggregateType.name)"
            :data-key="getStatusKey(status, aggregateType)"
            :data-status-id="status.statusId"
            :key="getStatusKey(status, aggregateType)"
            class="status-list__item"
          >
            <status
              v-if="!status.conversation || !isAggregateVisible('bucket')"
              :status-at-first="status" />
            <conversation
              v-else
              :originates-from="status"
              :statuses="status.conversation"
            />
          </div>
        </template>
        <div
          v-else
          class="status-list__item-none"
        >{{ emptyAggregateText() }}</div>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex';
import { css } from 'emotion';

import ApiMixin from '../../mixins/api';
import StatusFormat from '../../mixins/status-format';
import EventHub from '../../modules/event-hub';
import Status from '../status/status.vue';
import Conversation from '../conversation/conversation.vue';
import SharedState from '../../modules/shared-state';
import ActionTypes from '../../store/bucket-action-types';

const { mapActions, mapGetters } = createNamespacedHelpers('bucket');

export default {
  name: 'status-list',
  components: {
    Conversation,
    Status
  },
  mixins: [ApiMixin, StatusFormat],
  data() {
    return {
      aggregateTypes: {},
      state: SharedState.state,
      visibleStatuses: SharedState.state.visibleStatuses,
      errors: [],
      errorMessages: SharedState.errors,
      logger: SharedState.logger,
      logLevel: SharedState.logLevel,
      environment: SharedState.getEnvironmentParameters()
    };
  },
  computed: {
    visibleAggregateHasStatuses() {
      const aggregateIndex = this.getAggregateIndex(this.visibleStatuses.name);
      return this.aggregateTypes[aggregateIndex].statuses.length > 0;
    }
  },
  mounted() {
    EventHub.$on('status_list.reload_intended', this.getStatuses);
    EventHub.$on('status_list.intent_to_refresh_bucket', this.refreshBucket);
    EventHub.$on('status_list.after_fetch', this.refreshBucket);
    EventHub.$on('status.added_to_bucket', this.addToBucket);
    EventHub.$on('status.removed_from_bucket', this.removeFromBucket);
  },
  created() {
    this.aggregateTypes = this.declareAggregateTypesFromRoutes(this.routes);
    this.refreshBucket();

    if (this.$route.name === 'aggregate') {
      this.getStatuses({ aggregateType: this.$route.params.aggregate });
    }

    if (this.$route.name === 'press-review') {
      this.getStatuses({ aggregateType: 'press-review' });
    }

    const noHorizontalOverflow = css`
      overflow-x: hidden;
    `;
    document.body.classList.add(noHorizontalOverflow);
  },
  methods: {
    ...mapActions([
      ActionTypes.PERSIST_ADDITION_TO_BUCKET,
      ActionTypes.PERSIST_CONVERSATION_REMOVAL_FROM_BUCKET,
      ActionTypes.PERSIST_REMOVAL_FROM_BUCKET,
      ActionTypes.RESTORE_BUCKET_FROM_PERSISTENCE_LAYER
    ]),
    ...mapGetters(['getStatusesInBucket', 'isInBucket']),
    emptyAggregateText() {
      if (this.isAggregateVisible('bucket')) {
        return 'Your private bucket is empty.';
      }

      return 'Hum... Nothing has been collected yet for this list. Something SHALL be wrong (See RFC 2119).';
    },
    getStatusKey(status, aggregateType) {
      const timestamp = new Date(status.publishedAt).getTime();
      return `${aggregateType.name}:${status.statusId}:${timestamp}`;
    },
    refreshBucket(event) {
      const statusesInBucket = this.getStatusesInBucket();
      let statusCollection = this.getCollectionOfStatusesInBucket(
        statusesInBucket
      );

      const visitingBucket = this.visibleStatuses.name === 'bucket';
      if (visitingBucket) {
        statusCollection = this.expandConversations(statusCollection, event);
      }

      this.aggregateTypes.bucket = {
        statuses: statusCollection,
        isVisible: false,
        name: 'bucket'
      };

      if (visitingBucket) {
        this.visibleStatuses.statuses = statusCollection;
      }
    },
    getAggregateIndex(aggregateType) {
      return aggregateType.replace(/\s+/, '-').toLowerCase();
    },
    getCollectionOfStatusesInBucket(statuses) {
      if (statuses === undefined) {
        return [];
      }

      return Object.values(statuses);
    },
    listClasses(aggregateType) {
      const classNames = {
        'status-list__list': true
      };

      if (this.isAggregateVisible(aggregateType)) {
        classNames['status-list__list--full-width'] = true;
      }

      if (
        this.visibleStatuses.name === 'bucket' &&
        Object.keys(this.visibleStatuses.statuses).length === 0
      ) {
        classNames['status-list__empty-bucket'] = true;
      }

      if (
        this.visibleStatuses.name !== 'bucket' &&
        Object.keys(this.visibleStatuses.statuses).length === 0
      ) {
        classNames['status-list__empty-list'] = true;
      }

      return classNames;
    },
    switchBetweenVisibleStatuses(aggregateType, statuses, filter) {
      const visibleStatuses = statuses;
      const aggregateIndex = this.getAggregateIndex(aggregateType);

      Object.keys(this.aggregateTypes).forEach(aggregateName => {
        this.aggregateTypes[
          this.getAggregateIndex(aggregateName)
        ].isVisible = false;
      });
      this.aggregateTypes[aggregateIndex].isVisible = true;

      let statusCollection = {};
      statusCollection = Object.assign(
        {},
        this.aggregateTypes[aggregateIndex].statuses
      );
      visibleStatuses.statuses = this.filterStatuses(statusCollection, filter);
      visibleStatuses.name = aggregateIndex;
      return visibleStatuses;
    },
    getStatuses({ aggregateType, bustCache, filter }) {
      let shouldBustCache = false;
      if (typeof bustCache !== 'undefined' && aggregateType !== 'bucket') {
        shouldBustCache = bustCache;
      }

      if (this.shouldGuardAgainstUndefinedRoute()) {
        return;
      }

      const aggregateIndex = this.getAggregateIndex(aggregateType);

      if (
        (!shouldBustCache && aggregateIndex === 'bucket') ||
        this.aggregateTypes[aggregateIndex].statuses.length > 0
      ) {
        this.switchBetweenVisibleStatuses(
          aggregateType,
          this.visibleStatuses,
          filter
        );
        return;
      }

      const route = `${
        this.routes[aggregateIndex].source
      }${this.getTimestampSuffix()}`;
      const authenticationToken = localStorage.getItem('x-auth-token');

      this.replaceBucketFromPersistentLayer();

      this.$http
        .get(route, {
          headers: { 'x-auth-token': authenticationToken }
        })
        .then(response => {
          this.statuses = null;
          try {
            this.aggregateTypes[aggregateIndex].statuses = this.formatStatuses(
              response.data
            );
          } catch (error) {
            this.logger.error(error.message, 'status-list');
            return;
          }

          this.switchBetweenVisibleStatuses(
            aggregateType,
            this.visibleStatuses
          );
          EventHub.$emit('status_list.after_fetch');
        })
        .catch(e => this.logger.error(e.message, 'status-list', e));
    },
    getTimestampSuffix() {
      const timestamp = new Date().getTime();
      let timestampSuffix = '';
      if (!this.environment.productionMode) {
        timestampSuffix = `?${timestamp}`;
      }

      return timestampSuffix;
    },
    isAggregateVisible(aggregateType) {
      const aggregateIndex = this.getAggregateIndex(aggregateType);
      return aggregateIndex === this.visibleStatuses.name;
    },
    shouldGuardAgainstUndefinedRoute() {
      return typeof this.routes === 'undefined';
    },
    addToBucket({ status }) {
      this.persistAdditionToBucket(status);
      this.refreshBucket();
    },
    removeFromBucket({ status }) {
      this.persistRemovalFromBucket(status);
      if (status.statusRepliedTo) {
        const isConversationInBucket = this.isConversationInBucket()(
          status.statusId
        );
        if (isConversationInBucket) {
          this.persistConversationRemovalFromBucket(status.statusId);
        }
      }
      this.refreshBucket();
    }
  }
};
</script>

<style scoped>
@import './status-list.scss';
</style>
