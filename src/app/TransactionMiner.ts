import Blockchain from "../chain/Blockchain";
import Transaction from "../transaction/Transaction";
import TransactionPool from "../transaction/TransactionPool";
import Wallet from "../wallet";
import PubSub from "./PubSub";

export default class TransactionMiner {
  blockchain: Blockchain;
  transactionPool: TransactionPool;
  wallet: Wallet;
  pubsub: PubSub;

  constructor({
    blockchain,
    transactionPool,
    wallet,
    pubsub,
  }: {
    blockchain: Blockchain;
    transactionPool: TransactionPool;
    wallet: Wallet;
    pubsub: PubSub;
  }) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;
    this.wallet = wallet;
    this.pubsub = pubsub;
  }

  public mineTransactions() {
    // get the transaction pools valid transactions
    const validTransactions = this.transactionPool.validTransactions();
    // generate the miners reward
    validTransactions.push(
      Transaction.rewardTransaction({ minerWallet: this.wallet })
    );

    // add them to the blockchain
    this.blockchain.addBlock({ data: validTransactions });

    // broadcast the chain
    this.pubsub.broadcastChain();
    // clear the transaction pool
    this.transactionPool.clear();
  }
}
