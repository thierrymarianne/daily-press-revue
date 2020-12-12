<template>
  <div class="intro">
    <div class="intro__logo-container">
      <img class="intro__logo" :src="logo" alt="Revue de Presse logo"/>
    </div>
    <div class="intro__description-container">
      <p class="intro__description">Revue 2 presse est un <a
          class="intro__project"
          :href="currentRoute + '#project'">projet citoyen indépendant
        </a> qui s'adresse aux journalistes et à toute personne qui s'intéresse à l'actualité et à l'influence des médias sur l'opinion.
      </p>
    </div>
  </div>
</template>

<script>
import logo from "./../../../docs/assets/revue-de-presse_400x400.jpg";

export default {
  name: "intro",
  data() {
    return {
      currentRoute: this.$router.currentRoute.path,
      logo
    }
  }
}
</script>

<style lang="scss" scoped>
@import './intro.scss';
</style>