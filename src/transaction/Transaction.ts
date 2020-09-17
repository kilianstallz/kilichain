import Wallet from "../wallet";
import { v1 } from "uuid";
import { ec } from "elliptic";
import { verifySignature } from "../utils";
import { MINIG_REWARD, REWARD_INPUT } from "../config/config";

export interface TransactionCreateInput {
  senderWallet: Wallet;
  recipient: string;
  amount: number;
}

export interface Input {
  timestamp: number;
  amount: number;
  address: string;
  signature: ec.Signature;
}

export default class Transaction {
  id: string;
  recipient: string;
  amount: number;
  outputMap: Record<string, number>;
  input: Input;

  constructor({
    senderWallet,
    recipient,
    amount,
  }: {
    senderWallet: Wallet;
    recipient: string;
    amount: number;
  });
  constructor({
    senderWallet,
    recipient,
    amount,
    input,
    outputMap,
  }: {
    senderWallet: Wallet;
    recipient: string;
    amount: number;
    outputMap?: any;
    input?: any;
  }) {
    this.id = v1();
    this.outputMap =
      outputMap || this.createOutputMap({ senderWallet, recipient, amount });
    this.recipient = recipient;
    this.amount = amount;

    this.input =
      input || this.createInput({ senderWallet, outputMap: this.outputMap });
  }

  private createInput({
    senderWallet,
    outputMap,
  }: {
    senderWallet: Wallet;
    outputMap: Transaction["outputMap"];
  }): Input {
    return {
      timestamp: Date.now(),
      amount: senderWallet.balance,
      address: senderWallet.publicKey,
      signature: senderWallet.sign(outputMap),
    };
  }

  private createOutputMap({
    senderWallet,
    recipient,
    amount,
  }: TransactionCreateInput) {
    const outputMap = {};
    outputMap[recipient] = amount;
    outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

    return outputMap;
  }

  static validateTransaction(trans: Transaction) {
    const { input, outputMap } = trans;
    const { address, amount, signature } = input;

    const outputTotal = Object.values(outputMap).reduce(
      (total, oAmount) => total + oAmount
    );

    if (amount !== outputTotal) {
      console.error(`Invalid transaction from ${address}.`);
      return false;
    }

    if (!verifySignature({ publicKey: address, data: outputMap, signature })) {
      console.error(`Invalid signature from ${address}.`);
      return false;
    }

    return true;
  }

  public update({ amount, recipient, senderWallet }: TransactionCreateInput) {
    if (amount > this.outputMap[senderWallet.publicKey]) {
      throw new Error("Amount exceeds balance.");
    }

    if (!this.outputMap[recipient]) {
      this.outputMap[recipient] = amount;
    } else {
      this.outputMap[recipient] = this.outputMap[recipient] + amount;
    }

    this.outputMap[senderWallet.publicKey] =
      this.outputMap[senderWallet.publicKey] - amount;

    this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
  }

  static rewardTransaction({ minerWallet }: { minerWallet: Wallet }) {
    return new this({
      input: REWARD_INPUT as any,
      outputMap: { [minerWallet.publicKey as any]: MINIG_REWARD as any },
    } as any);
  }
}
