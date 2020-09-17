import Redis from "ioredis";
import { parse } from "path";
import Blockchain from "../chain/Blockchain";
import Transaction from "../transaction/Transaction";
import TransactionPool from "../transaction/TransactionPool";

export const CHANNEL = {
  TEST: "TEST",
  BLOCKCHAIN: "BLOCKCHAIN",
  TRANSACTION: "TRANSACTION",
};

export default class PubSub {
  publisher: Redis.Redis;
  subscriber: Redis.Redis;

  blockchain: Blockchain;
  transactionPool: TransactionPool;

  constructor({ blockchain, transactionPool }) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;

    this.publisher = new Redis();
    this.subscriber = new Redis();

    this.subscribeToChannels();

    this.subscriber.on("message", (channel, message) =>
      this.handleMessage(channel, message)
    );
  }

  handleMessage(channel, message) {
    console.log(`Message: [${channel}]: ${message}`);

    const parsedMessage = JSON.parse(message);

    if (channel === CHANNEL.BLOCKCHAIN) {
      this.blockchain.replaceChain(parsedMessage, true, () => {
        this.transactionPool.clearBlockchainTransactions({
          chain: parsedMessage,
        });
      });
      return;
    }

    if (channel === CHANNEL.TRANSACTION) {
      this.transactionPool.setTransaction(parsedMessage);
      return;
    }
  }

  subscribeToChannels() {
    Object.values(CHANNEL).forEach((channel) => {
      this.subscriber.subscribe(channel);
    });
  }

  publish({ channel, message }) {
    this.subscriber.unsubscribe(channel, () => {
      this.publisher.publish(channel, message, () => {
        this.subscriber.subscribe(channel);
      });
    });
  }

  broadcastChain() {
    this.publish({
      channel: CHANNEL.BLOCKCHAIN,
      message: JSON.stringify(this.blockchain.chain),
    });
  }

  broadcastTransaction(transaction: Transaction) {
    this.publish({
      channel: CHANNEL.TRANSACTION,
      message: JSON.stringify(transaction),
    });
  }
}
