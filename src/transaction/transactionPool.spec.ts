import { format } from "path";
import Blockchain from "../chain/Blockchain";
import Wallet from "../wallet";
import Transaction from "./Transaction";
import TransactionPool from "./TransactionPool";

describe("TransactionPool", () => {
  let transactionPool: TransactionPool;
  let transaction: Transaction;
  let senderWallet: Wallet;

  beforeEach(() => {
    senderWallet = new Wallet();
    transactionPool = new TransactionPool();
    transaction = new Transaction({
      senderWallet,
      recipient: "new-recipient",
      amount: 50,
    });
  });

  describe("setTransaction()", () => {
    it("adds a transaction", () => {
      transactionPool.setTransaction(transaction);

      expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
    });
  });

  describe("existingTransaction()", () => {
    it("returns an existing transaction", () => {
      transactionPool.setTransaction(transaction);
      expect(
        transactionPool.existingTransaction({
          inputAddress: senderWallet.publicKey,
        })
      ).toBe(transaction);
    });
  });

  describe("validTransactions()", () => {
    let validTransactions: Transaction[];

    beforeEach(() => {
      validTransactions = [];

      for (let i = 0; i < 10; i++) {
        transaction = new Transaction({
          senderWallet,
          recipient: "any",
          amount: 30,
        });

        if (i % 3 === 0) {
          transaction.input.amount = 99999;
        } else if (i % 3 === 1) {
          transaction.input.signature = new Wallet().sign("foo");
        } else {
          validTransactions.push(transaction);
        }

        transactionPool.setTransaction(transaction);
      }
    });

    it("returns valid transaction", () => {
      expect(transactionPool.validTransactions()).toEqual(validTransactions);
    });
  });

  describe("clear()", () => {
    it("clears the transactions", () => {
      transactionPool.clear();
      expect(transactionPool.transactionMap).toEqual({});
    });
  });

  describe("clearBlockchainTransactions()", () => {
    it("clears the pool of any existing blockchain transactions", () => {
      const blockchain = new Blockchain();
      const expectedTransactionmap = {};

      for (let i = 0; i < 6; i++) {
        const transaction = new Wallet().createTransaction({
          recipient: "foo",
          amount: 30,
        });

        transactionPool.setTransaction(transaction);

        if (i % 2 === 0) {
          blockchain.addBlock({ data: [transaction] });
        } else {
          expectedTransactionmap[transaction.id] = transaction;
        }

        transactionPool.clearBlockchainTransactions({
          chain: blockchain.chain,
        });
        expect(transactionPool.transactionMap).toEqual(expectedTransactionmap);
      }
    });
  });
});
