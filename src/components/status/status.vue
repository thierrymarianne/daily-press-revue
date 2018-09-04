<template>
  <div class='status'>
    <div class='status__row'>
      <div class='status__publication-date'>{{ publicationDate }}</div>
    </div>
    <div v-if='isRetweet' class='status__row'>
      <a 
        class='status__username'
        :href='memberTimelineUrl'
      >@{{ status.usernameOfRetweetingMember }}</a>&nbsp;retweeted&nbsp;<a 
        class='status__username'
        :href='retweetingMemberTimelineUrl'
      >@{{ status.username }}</a>

    </div>
    <div v-else class='status__row'>
      <a 
        class='status__username'
        :href='memberTimelineUrl'
      >@{{ status.username }}</a>
    </div>
    <div class='status__row'>
      <div class='status__avatar-container'>
        <div
          class='status__avatar' 
          :style='"background: center / 24px no-repeat url(" +  avatarUrl + ")"'
        ></div>
      </div>
      <span class='status__text'>{{ status.text }}</span>
    </div>
    <div class='status__row'>
      <a class='status__url' :href='status.url'>Permalink</a>
      <a
        :href='link'
        class='status__url' 
        v-for='link in status.links'
      >{{ link }}</a>
    </div>
    <div class='status__row'>
      <a class='status__web-intent' :href='urls.reply'>
        <font-awesome-icon icon='reply' />
        <span>Reply</span>
      </a>
      <a class='status__web-intent' :href='urls.retweet'>
        <font-awesome-icon icon='retweet' />
        <span>Retweet</span>
      </a>
      <a class='status__web-intent' :href='urls.like'>
        <font-awesome-icon icon='heart' />
        <span>Like</span>
      </a>
      <button
        v-if='!isBucketVisible'
        class='status__web-intent'
        @click='toggleBucketAddition'
      >
        <font-awesome-icon :icon='addedToBucketIcon' />
        <span>{{ bucketAdditionLabel }}</span>
      </button>
      <button 
        v-else
        class='status__web-intent'
        @click='removeFromBucket'
      >
        <font-awesome-icon icon='minus' />
        <span>Remove from bucket</span>
      </button>
    </div>
    <button
      class='status__web-intent'
      v-if='isBucketVisible'
      @click='syncStatus'
    >
      <font-awesome-icon
        class='action-menu__replied-icon'
        icon='sync' 
      />
      <span>Refresh</span>
    </button>    
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex';
const { mapActions, mapGetters, mapMutations } = createNamespacedHelpers('bucket');

import ApiMixin  from '../../mixins/api';
import EventHub from '../../modules/event-hub';
import SharedState from '../../modules/shared-state';

export default {
  name: 'status',
  mixins: [ApiMixin],
  props: {
    statusAtFirst: {
      type: Object,
      required: true,
    },
  },
  computed: {
    addedToBucketIcon: function () {
      if (!this.addedToBucket) {
        return 'plus';
      }

      return 'minus';
    },
    bucketAdditionLabel: function () {
      if (!this.addedToBucket) {
        return 'Add to bucket';
      }

      return 'Remove from bucket';
    },
    avatarUrl: function () {
      return this.status.avatarUrl;
    },
    isBucketVisible: function () {
      return SharedState.state.visibleStatuses.name === "bucket";
    },
    isRetweet: function () {
      if (typeof this.status === 'undefined') {
        return false;
      }
      return this.status.retweet;
    },
    urls: function () {
      if (typeof this.status === 'undefined') {
        return '';
      }
      
      return {
        reply: `https://twitter.com/intent/tweet?in_reply_to=${this.status.statusId}`,
        retweet: `https://twitter.com/intent/retweet?tweet_id=${this.status.statusId}`,
        like: `https://twitter.com/intent/like?tweet_id=${this.status.statusId}`,
      }
    },
    publicationDate: function () {
      if (typeof this.status === 'undefined') {
        return '';
      }

      const publicationDate = new Date(this.status.publishedAt);
      return `${publicationDate.toDateString()} ${publicationDate.toTimeString()}`;
    },
    memberTimelineUrl: function () {
      if (typeof this.status === 'undefined') {
        return '';
      }

      return `https://twitter.com/${this.status.username}`;
    },
    retweetingMemberTimelineUrl: function () {
      if (typeof this.status === 'undefined' &&
      this.status.retweet === false) {
        return '';
      }

      return `https://twitter.com/${this.status.usernameOfRetweetingMember}`;
    }    
  },
  data: function () {
    return {
      addedToBucket: this.statusAtFirst.isInBucket,
      errorMessages: SharedState.errors,
      logger: SharedState.logger,
      status: this.statusAtFirst
    };
  },
  methods: {
    ...mapGetters([
      'isStatusInBucket',
    ]),
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
          isInBucket: false,
          links
        }

        if (status.status_replied_to) {
          formattedStatus.statusRepliedTo = this.formatStatuses([status.status_replied_to])[0];
        }

        if (this.isStatusInBucket()(formattedStatus.statusId)) {
          formattedStatus.isInBucket = true;
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
    removeFromBucket: function () {
      this.removeStatusFromBucket();
      EventHub.$emit('status_list.intent_to_refresh_bucket');
    },
    removeStatusFromBucket: function () {
      EventHub.$emit('status.removed_from_bucket', { status: this.status });
      this.addedToBucket = !this.addedToBucket;      
    },
    syncStatus: function () {
      const method = this.routes.actions.syncStatus.method;
      let route = this.routes.actions.syncStatus.route;
      const parameters = this.routes.actions.syncStatus.parameters;

      route = route.replace(':statusId', this.status.statusId);

      const authenticationToken = localStorage.getItem('x-auth-token');
      this.$http[method](route, {
        headers: { 'x-auth-token': authenticationToken }
      }).
      then(({ data }) => {
        const formattedStatuses = this.formatStatuses(data);
        this.status = formattedStatuses[0];
        EventHub.$emit('status_list.intent_to_refresh_bucket');
      }).catch(e => this.logger.error(e.message, 'status', e));

    },
    toggleBucketAddition: function () {
      if (this.addedToBucket === false) {
        EventHub.$emit('status.added_to_bucket', { status: this.status });
        this.addedToBucket = !this.addedToBucket;
        return;
      }

      this.removeStatusFromBucket()
    }
  }
};
</script>

<style lang='scss' scoped>
@import './status.scss';
</style>