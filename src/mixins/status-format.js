import { createNamespacedHelpers } from 'vuex';

const { mapGetters } = createNamespacedHelpers('bucket');

export default {
  methods: {
    ...mapGetters([
      'isStatusInBucket',
      'isConversationInBucket',
      'getConversationsInBucket',
    ]),
    expandConversations: function (statuses) {
      const conversations = statuses.map((status) => {
        if (!this.isConversationInBucket()(status.statusId)) {
          return status;
        }

        const conversationsInBucket = this.getConversationsInBucket();
        status.conversation = conversationsInBucket[status.statusId];
        return status;
      });

      return conversations;
    },
    formatStatuses: function (statuses, fromSync) {
      if ((typeof statuses === 'undefined') || (statuses === null)) {
        return [];
      }

      let syncing = false;
      if ((typeof fromSync !== 'undefined') && (fromSync !== null)) {
        syncing = fromSync;
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
          links,
        };

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
      formattedStatuses = formattedStatuses.reduce((statusCollection, status) => {
        statusCollection.indexOf(status);
        statusCollection[statusCollection.indexOf(status)].key = statusCollection.indexOf(status);
        return statusCollection;
      }, formattedStatuses);

      if (!syncing) {
        formattedStatuses = this.expandConversations(formattedStatuses);
      }

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
        `<!doctype html><body>${subject}</body>`,
        'text/html',
      );
      return dom.body.textContent;
    },
  },
};