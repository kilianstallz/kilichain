import express from "express";
import Blockchain from "./chain/Blockchain";
import PubSub from "./app/PubSub";
import Axios from "axios";
import TransactionPool from "./transaction/TransactionPool";
import Wallet from "./wallet";
import TransactionMiner from "./app/TransactionMiner";

const app = express();
app.use(express.json());
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({ blockchain, transactionPool });
const transactionMiner = new TransactionMiner({
  blockchain,
  transactionPool,
  wallet,
  pubsub,
});

const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

app.get("/api/blocks", (req, res) => {
  res.json(blockchain.chain);
});

app.post("/api/mine", (req, res) => {
  const { data } = req.body;

  blockchain.addBlock({ data });

  pubsub.broadcastChain();

  res.redirect("/api/blocks");
});

app.post("/api/transact", (req, res) => {
  const { amount, recipient } = req.body;

  let transaction = transactionPool.existingTransaction({
    inputAddress: wallet.publicKey,
  });

  try {
    if (transaction) {
      transaction.update({ senderWallet: wallet, recipient, amount });
    } else {
      transaction = wallet.createTransaction({
        recipient,
        amount,
        chain: blockchain.chain,
      });
    }
    transactionPool.setTransaction(transaction);

    pubsub.broadcastTransaction(transaction);

    return res.status(201).json({ type: "success", transaction });
  } catch (err) {
    return res.status(400).json({ type: "error", message: err.message });
  }
});

app.get("/api/transaction-pool", (req, res) => {
  res.json(transactionPool.transactionMap);
});

app.get("/api/mine-transactions", (req, res) => {
  transactionMiner.mineTransactions();
  res.redirect("/api/blocks");
});

app.get("/api/wallet-info", (req, res) => {
  res.json({
    address: wallet.publicKey,
    balance: Wallet.calculateBalance({
      chain: blockchain.chain,
      address: wallet.publicKey,
    }),
  });
});

const syncWithRootState = () => {
  Axios.get(`${ROOT_NODE_ADDRESS}/api/blocks`).then((res) => {
    if (res.status === 200) {
      const rootChain = res.data;
      console.log("replace chain on a sync with ", rootChain);
      blockchain.replaceChain(rootChain, true);
    }
  });

  Axios.get(`${ROOT_NODE_ADDRESS}/api/transaction-pool`).then((res) => {
    if (res.status === 200) {
      const rootPool = res.data;
      console.log("replace pool on a sync with ", rootPool);
      transactionPool.setMap(rootPool);
    }
  });
};

let PEER_PORT;

if (process.env.GENERATE_PEER_PORT === "true") {
  PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

const port = PEER_PORT || DEFAULT_PORT;
app.listen(port, () => {
  console.log("App running on port " + port);

  if (port !== DEFAULT_PORT) {
    syncWithRootState();
  }
});
