<script>
import Wallet from "./components/HelloWorld.vue";
import { walletStore } from "./providers/wallet";
export default {
  components: {
    Wallet
  },
  provide: {
    walletStore
  }
};
</script>

<template>
  <div id="app">
    <Wallet />
  </div>
</template>

<style lang="scss"></style>
