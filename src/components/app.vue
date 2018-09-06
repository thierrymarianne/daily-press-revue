<template>
  <div class='app'>
    <action-menu />
    <router-view></router-view>
    <modal />
  </div>
</template>

<script>
import ActionMenu from './action-menu/action-menu.vue';
import Modal from './modal/modal.vue';

export default {
  name: 'app',
  components: {
    ActionMenu,
    Modal
  }
};
</script>
