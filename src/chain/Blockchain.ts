import Block from "./Block";
import { cryptoHash } from "../hash/hash";
import Transaction from "../transaction/Transaction";
import { MINIG_REWARD, REWARD_INPUT } from "../config/config";
import Wallet from "../wallet";

export default class Blockchain {
  chain: Block[];

  constructor() {
    this.chain = [Block.genesis()];
  }

  public addBlock({ data }: Partial<Block>) {
    const newBlock = Block.mineBlock({
      lastBlock: this.chain[this.chain.length - 1],
      data,
    });
    this.chain.push(newBlock);
  }

  public replaceChain(
    chain: Block[],
    validateTransactions = false,
    onSuccess?
  ) {
    if (chain.length <= this.chain.length) {
      console.error("The incoming chain must be longer");
      return;
    }

    if (!Blockchain.isValidChain(chain)) {
      console.error("The incoming chain must be valid");
      return;
    }

    if (validateTransactions && !this.validTransactionData({ chain })) {
      console.error("The incoming chain has invalid data.");
      return;
    }

    if (onSuccess) {
      onSuccess();
    }
    console.log("Replacing chain");
    this.chain = chain;
  }

  static isValidChain(chain: Block[]) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
      return false;
    }

    for (let i = 1; i < chain.length; i++) {
      const { data, hash, lastHash, timestamp, difficulty, nonce } = chain[i];
      const actualLastHash = chain[i - 1].hash;
      const lastDifficulty = chain[i - 1].difficulty;

      if (lastHash !== actualLastHash) {
        return false;
      }

      // Check hash validity
      const validatedHash = cryptoHash(
        timestamp,
        data,
        lastHash,
        difficulty,
        nonce
      );
      if (hash !== validatedHash) {
        return false;
      }

      const diff = lastDifficulty - difficulty;
      if (Math.abs(diff) > 1) {
        return false;
      }
    }
    return true;
  }

  validTransactionData({ chain }: { chain: Blockchain["chain"] }) {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const transactionSet = new Set();
      let rewardTransactionCount = 0;

      for (let trans of block.data) {
        if (trans.input.address === REWARD_INPUT.address) {
          rewardTransactionCount += 1;

          if (rewardTransactionCount > 1) {
            console.error("Mining reward limit exceeded.");
            return false;
          }

          if (Object.values(trans.outputMap)[0] !== MINIG_REWARD) {
            console.error("Miner reward amount is invalid");
            return false;
          }
        } else {
          if (!Transaction.validateTransaction(trans)) {
            console.error("Invalid transaction.");
            return false;
          }

          const trueBalance = Wallet.calculateBalance({
            chain: this.chain,
            address: trans.input.address,
          });

          if (trans.input.amount !== trueBalance) {
            console.error("Invalid input amount.");
            return false;
          }

          if (transactionSet.has(trans)) {
            console.error("Duplicate transactions.");
            return false;
          } else {
            transactionSet.add(trans);
          }
        }
      }
    }
    return true;
  }
}
