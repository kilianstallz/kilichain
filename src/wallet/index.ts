import { ec as EC } from "elliptic";
import Blockchain from "../chain/Blockchain";
import { STARTING_BALANCE } from "../config/config";
import { cryptoHash } from "../hash/hash";
import Transaction, {
  TransactionCreateInput,
} from "../transaction/Transaction";
import { ec } from "../utils/elliptic";

export interface CreateTransactionInput {
  amount: number;
  recipient: string;
  chain?: Blockchain["chain"];
}

export default class Wallet {
  publicKey: string;
  balance: number;
  keyPair: EC.KeyPair;

  constructor() {
    this.balance = STARTING_BALANCE;

    this.keyPair = ec.genKeyPair();

    this.publicKey = this.keyPair.getPublic().encode("hex", false);
  }

  public sign(data: any) {
    // hash for optimization
    const hashData = cryptoHash(data);
    return this.keyPair.sign(hashData);
  }

  public createTransaction({
    amount,
    recipient,
    chain,
  }: CreateTransactionInput) {
    if (chain) {
      this.balance = Wallet.calculateBalance({
        chain,
        address: this.publicKey,
      });
    }
    if (amount > this.balance) {
      throw new Error("Amount exceeds balance.");
    }

    return new Transaction({ senderWallet: this, recipient, amount });
  }

  static calculateBalance({
    chain,
    address,
  }: {
    chain: Blockchain["chain"];
    address: string;
  }) {
    let hasConductedTransaction = false;
    let outputsTotal = 0;

    for (let i = chain.length - 1; i > 0; i--) {
      const block = chain[i];

      for (let trans of block.data) {
        if (trans.input.address === address) {
          hasConductedTransaction = true;
        }
        const addressOutput = trans.outputMap[address];

        if (addressOutput) {
          outputsTotal = outputsTotal + addressOutput;
        }
      }

      if (hasConductedTransaction) {
        break;
      }
    }
    return hasConductedTransaction
      ? outputsTotal
      : STARTING_BALANCE + outputsTotal;
  }
}
