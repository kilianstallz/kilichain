import Axios from "axios";
import { reactive, readonly } from "vue";

const state = reactive({
  address: "",
  balance: 0
});

function getWalletInfo() {
  Axios.get("/api/wallet-info").then(({ data }) => {
    state.address = data.address;
    state.balance = data.balance;
  });
}

export const walletStore = readonly({
  state,
  actions: {
    getWalletInfo
  }
});
