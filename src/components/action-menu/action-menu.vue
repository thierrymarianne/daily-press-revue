<template>
  <div :class="actionMenuClasses">
    <div
      :class="getActionMenuContainerClasses"
    >

      <button
        v-if="isAuthenticated"
        :class="getButtonClass('Press review')"
        @click="intendToGet('Press review')"
      >Press Review</button>

      <router-link
        v-for="(menuItem, index) in menuItemsButPressReview"
        :key='index'
        :to='getPathTo(menuItem)'
        :class="getButtonClass(menuItem)"
        active-class='action-menu__get-statuses--active'
        exact
        tag='button'
        @click.native="intendToGetAggregate(menuItem)"
      >{{ getMenuLabel(menuItem) }}</router-link>

      <button
        v-if="isAuthenticated"
        :class="getButtonClass('bucket')"
        @click="intendToGet('bucket')"
      >Bucket</button>

      <div class="action-menu__action-wrapper">
        <div
          v-if="isAuthenticated"
          class="action-menu__row"
        >
          <button
            class="action-menu__button action-menu__refresh-button"
            @click="showStatusesHavingMedia"
          >
            <font-awesome-icon
              class="action-menu__refresh-icon"
              icon="images"
            />
          </button>

          <button
            :class="getActionMenuButtonClasses"
            @click="showStatusesInAggregateTop10O"
          >
            <font-awesome-icon
              icon="fire"
              class="action-menu__toggle-menu-icon"
            />
          </button>
        </div>

        <div class="action-menu__row action-menu__row--full-width">
          <ul
            v-if="isAuthenticated"
            class="action-menu__sub-menu">
            <li class="action-menu__sub-menu-item">
              <button
                class="action-menu__button action-menu__lists-button"
                @click="goToLists()"
              >
                <span>Lists</span>
              </button>
            </li>
            <li>
              <button
                class="action-menu__button action-menu__lists-button"
                @click="goToHighlights()"
              >
                <span>Highlights</span>
              </button>
            </li>
            <li>
              <button
                class="action-menu__button action-menu__lists-button"
                @click="goToPersonalHighlights()"
              >
                <span>Personal highlights</span>
              </button>
            </li>
            <li>
              <button
                class="action-menu__button action-menu__lists-button"
                @click="goToKeywords()"
              >
                <span>Keywords</span>
              </button>
            </li>
          </ul>

          <authenticator />

        </div>
      </div>

    </div>

    <font-awesome-icon
      :class="getActionMenuButtonClasses"
      :icon="getToggleMenuIcon"
      class="action-menu__toggle-menu-icon"
      @click="toggleMenuVisibility"
    />
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex';

import ApiMixin from '../../mixins/api';
import DateMixin from '../../mixins/date';
import CaseNormalizer from '../../mixins/case';
import EventHub from '../../modules/event-hub';
import SharedState from '../../modules/shared-state';
import Authenticator from '../authentication/authenticator.vue';

const { mapGetters: mapAuthenticationGetters } = createNamespacedHelpers(
  'authentication'
);

export default {
  name: 'action-menu',
  components: { Authenticator },
  mixins: [ApiMixin, CaseNormalizer, DateMixin],
  props: {
    denyAccessToAlternateRoutes: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      showMenu: this.isAdministrativeRoute(),
      visibleStatuses: SharedState.state.visibleStatuses
    };
  },
  computed: {
    ...mapAuthenticationGetters(['isAuthenticated', 'getGrantedRoutes']),
    actionMenuClasses() {
      if (this.isAuthenticated || this.isAdministrativeRoute()) {
        return { 'action-menu': true };
      }

      return { 'action-menu--hidden': true };
    },
    getActionMenuButtonClasses() {
      const classes = { 'action-menu__button': true };

      if (!this.showMenu) {
        classes['action-menu__button--with-top-border'] = true;
      }

      return classes;
    },
    getActionMenuContainerClasses() {
      const classes = { 'action-menu__container': true };

      if (this.showMenu) {
        classes['action-menu__container--is-visible'] = true;
      }

      return classes;
    },
    getToggleMenuIcon() {
      if (this.showMenu) {
        return 'arrow-alt-circle-up';
      }

      return 'arrow-alt-circle-down';
    },
    isVisible() {
      const hasFullMenu = this.isAuthenticated;

      const visibilities = {};
      Object.keys(this.routes).forEach(aggregateType => {
        if (aggregateType === 'actions') {
          return;
        }

        if (aggregateType === 'Press review') {
          return;
        }

        visibilities[aggregateType] = hasFullMenu;
      });
      visibilities.bucket = true;

      return visibilities;
    },
    menuItemsButPressReview() {
      const routeNames = [];

      const grantedRoutes = this.getGrantedRoutes;
      const routes = Object.values(this.routes).filter(route => {
        if (this.denyAccessToAlternateRoutes) {
          return false;
        }

        return grantedRoutes.indexOf(route.name) !== -1;
      });

      routes.forEach(route => {
        if (
          route.name === 'Press review' ||
          typeof route.name === 'undefined'
        ) {
          return;
        }
        routeNames.push(route.name);
      });

      return routeNames
        .sort()
        .filter(route => this.isVisible[this.getAggregateIndex(route)]);
    }
  },
  created() {
    EventHub.$on('navigate_to_homepage', this.goToHomepage);
    EventHub.$on('navigate_to_press_review', this.goToPressReview);
  },
  mounted() {
    EventHub.$on('action_menu.hide_intended', this.hideActionMenu);
  },
  methods: {
    getAggregateIndex(aggregateType) {
      return this.normalize(aggregateType);
    },
    isAdministrativeRoute() {
      return (
        this.$route.matched.filter(route => route.name === 'admin').length > 0
      );
    },
    getButtonClass(aggregateType) {
      const classes = { 'action-menu__get-statuses': true };

      const aggregateIndex = this.getAggregateIndex(aggregateType);

      if (
        this.visibleStatuses.name === aggregateType ||
        this.visibleStatuses.name === aggregateIndex
      ) {
        classes['action-menu__get-statuses--active'] = true;
      }

      return classes;
    },
    getMenuLabel(aggregateType) {
      return aggregateType;
    },
    getPathTo(aggregateType) {
      return {
        name: 'aggregate',
        params: {
          aggregateType: this.getAggregateIndex(aggregateType)
        }
      };
    },
    hideActionMenu() {
      this.showMenu = false;
    },
    goToKeywords() {
      this.$router.push({
        name: 'keywords'
      });
    },
    goToHomepage() {
      this.goToPressReview();
    },
    goToHighlights(aggregates) {
      const params = {
        startDate: this.getCurrentDate(),
        endDate: this.getCurrentDate()
      };

      let routeName = 'highlights';
      if (aggregates) {
        routeName = 'private-highlights';
      }

      this.$router.push({
        name: routeName,
        params
      });

      EventHub.$emit('highlight_list.reload_intended');
    },
    goToPersonalHighlights() {
      this.goToHighlights('all-aggregates');
    },
    goToLists() {
      this.$router.push({
        name: 'lists'
      });

      EventHub.$emit('aggregate_list.reload_intended');
    },
    goToPressReview(route) {
      if (route) {
        this.$router.push(route);
        return;
      }

      this.$router.push({
        name: 'press-review'
      });
    },
    intendToGet(aggregateType) {
      EventHub.$emit('status_list.load_intended');
      EventHub.$emit('action_menu.hide_intended');

      if (aggregateType === 'Press review') {
        this.$router.push({
          name: 'press-review'
        });
      }

      if (aggregateType === 'bucket') {
        EventHub.$emit('status_list.intent_to_refresh_bucket', {
          next: () => {
            this.$router.push({
              name: 'bucket'
            });
          }
        });
      }

      EventHub.$emit('status_list.reload_intended', {
        aggregateType
      });
    },
    intendToGetAggregate(aggregateType) {
      EventHub.$emit('action_menu.hide_intended');
      EventHub.$emit('status_list.load_intended');
      EventHub.$emit('status_list.reload_intended', {
        aggregateType
      });

      this.$router.push({
        name: 'aggregate',
        params: { aggregateType: this.getAggregateIndex(aggregateType) }
      });
    },
    showStatusesHavingMedia() {
      EventHub.$emit('status_list.reload_intended', {
        aggregateType: this.visibleStatuses.name,
        bustCache: true,
        filter: 'media'
      });
    },
    showStatusesInAggregateTop10O() {
      EventHub.$emit('status_list.reload_intended', {
        aggregateType: this.visibleStatuses.name,
        bustCache: true,
        filter: 'top100'
      });
    },
    toggleMenuVisibility() {
      this.showMenu = !this.showMenu;
    }
  }
};
</script>

<style lang="scss" scoped>
@import './action-menu.scss';
</style>
