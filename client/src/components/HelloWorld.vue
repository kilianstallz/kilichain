<template>
  <div class="p-4">
    <div>
      <h1 class="mx-2 text-lg font-bold">
        My Wallet
      </h1>
      <div class="my-4">
        <h4>Address</h4>
        <div class="flex">
          <p class="text-sm break-words p-4 bg-gray-300 rounded">
            {{ walletStore.state.address }}
          </p>
        </div>
      </div>
      <div class="my-4">
        <h4>Balance</h4>
        <div class="flex">
          <p class="text-sm p-4 bg-gray-300 rounded">
            {{ walletStore.state.balance }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Wallet",
  inject: ["walletStore"],
  methods: {
    loadWallet() {
      return this.walletStore.actions.getWalletInfo();
    }
  },
  mounted() {
    this.loadWallet();
  }
};
</script>
