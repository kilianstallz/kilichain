import Blockchain from "../chain/Blockchain";
import Transaction from "./Transaction";

export default class TransactionPool {
  transactionMap: Record<string, Transaction> = {};

  public setTransaction(transaction: Transaction) {
    this.transactionMap[transaction.id] = transaction;
  }

  public existingTransaction({ inputAddress }: { inputAddress: string }) {
    const transaction = Object.values(this.transactionMap);
    return transaction.find((trans) => trans.input.address === inputAddress);
  }

  public setMap(transactionmap) {
    this.transactionMap = transactionmap;
  }

  public validTransactions() {
    return Object.values(this.transactionMap).filter((trans) =>
      Transaction.validateTransaction(trans)
    );
  }

  public clear() {
    this.transactionMap = {};
  }

  public clearBlockchainTransactions({
    chain,
  }: {
    chain: Blockchain["chain"];
  }) {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      for (let trans of block.data) {
        if (this.transactionMap[trans.id]) {
          delete this.transactionMap[trans.id];
        }
      }
    }
  }
}
