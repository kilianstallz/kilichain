import { MINIG_REWARD, REWARD_INPUT } from "../config/config";
import { verifySignature } from "../utils";
import Wallet from "../wallet";
import Transaction from "./Transaction";

describe("Transaction", () => {
  let transaction: Transaction;
  let senderWallet: Wallet;
  let recipient: string;
  let amount: number;

  beforeEach(() => {
    senderWallet = new Wallet();
    recipient = "recipient-public-key";
    amount = 50;

    transaction = new Transaction({ senderWallet, recipient, amount });
  });

  it("has an `id`", () => {
    expect(transaction).toHaveProperty("id");
  });

  describe("outputMap", () => {
    it("has an `outputMap`", () => {
      expect(transaction).toHaveProperty("outputMap");
    });

    it("outputs the amount to the recipient", () => {
      expect(transaction.outputMap[recipient]).toEqual(amount);
    });

    it("outputs the remaining balance for the `senderWallet`", () => {
      expect(transaction.outputMap[senderWallet.publicKey]).toEqual(
        senderWallet.balance - amount
      );
    });
  });

  describe("input", () => {
    it("has an `input`", () => {
      expect(transaction).toHaveProperty("input");
    });

    it("has a `timestamp`", () => {
      expect(transaction.input).toHaveProperty("timestamp");
    });

    it("sets the `amount` to the `senderWallet` balance", () => {
      expect(transaction.input.amount).toEqual(senderWallet.balance);
    });

    it("sets the `address` to the `senderWallet` publicKey", () => {
      expect(transaction.input.address).toEqual(senderWallet.publicKey);
    });
    it("signs the input", () => {
      expect(
        verifySignature({
          publicKey: senderWallet.publicKey,
          data: transaction.outputMap,
          signature: transaction.input.signature,
        })
      ).toBe(true);
    });
  });

  describe("validateTransaction()", () => {
    let errorMock;

    beforeEach(() => {
      errorMock = jest.fn();
      global.console.error = errorMock;
    });

    describe("when the transaction is valid", () => {
      it("returns true", () => {
        expect(Transaction.validateTransaction(transaction)).toBe(true);
      });
    });
    describe("when the transaction is invalid", () => {
      describe("and the transactions outputMap is invalid", () => {
        it("returns false and logs", () => {
          transaction.outputMap[senderWallet.publicKey] = 999999;
          expect(Transaction.validateTransaction(transaction)).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });
      describe("and the transactions signature is invalid", () => {
        it("returns false and logs", () => {
          transaction.input.signature = new Wallet().sign("data");
          expect(Transaction.validateTransaction(transaction)).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });
    });
  });

  describe("update()", () => {
    let originalSignature;
    let originalOutput;
    let nextRecipient;
    let nextAmount;

    describe("and the amount is valid", () => {
      beforeEach(() => {
        originalSignature = transaction.input.signature;
        originalOutput = transaction.outputMap[senderWallet.publicKey];
        nextRecipient = "some-two";
        nextAmount = 50;

        transaction.update({
          senderWallet,
          recipient: nextRecipient,
          amount: nextAmount,
        });
      });

      it("outputs the amount to the next recipient", () => {
        expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount);
      });

      it("subtracts the amount from the original `senderWallet`", () => {
        expect(transaction.outputMap[senderWallet.publicKey]).toEqual(
          originalOutput - nextAmount
        );
      });

      it("maintains a total output that matches the input amounts", () => {
        expect(
          Object.values(transaction.outputMap).reduce((total, o) => total + o)
        ).toEqual(transaction.input.amount);
      });

      it("resigns the transaction", () => {
        expect(transaction.input.signature).not.toEqual(originalSignature);
      });

      describe("and another update for the same recipient", () => {
        let addedAmount: number;

        beforeEach(() => {
          addedAmount = 80;
          transaction.update({
            amount: addedAmount,
            recipient: nextRecipient,
            senderWallet,
          });
        });

        it("adds to the recipients amount", () => {
          expect(transaction.outputMap[nextRecipient]).toEqual(
            nextAmount + addedAmount
          );
        });

        it("subs the amount from the sender wallet", () => {
          expect(transaction.outputMap[senderWallet.publicKey]).toEqual(
            originalOutput - nextAmount - addedAmount
          );
        });
      });
    });

    describe("and the amount is invalid", () => {
      it("throws an error", () => {
        expect(() =>
          transaction.update({
            senderWallet,
            recipient: "foo",
            amount: 99999999,
          })
        ).toThrow("Amount exceeds balance.");
      });
    });
  });

  describe("rewardTransaction()", () => {
    let rewardTransaction: Transaction;
    let minerWallet: Wallet;

    beforeEach(() => {
      minerWallet = new Wallet();
      rewardTransaction = Transaction.rewardTransaction({ minerWallet });
    });

    it("creates a transaction with the reward input", () => {
      expect(rewardTransaction.input).toEqual(REWARD_INPUT);
    });

    it("creates one transaction for the miner with the minig reward", () => {
      expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(
        MINIG_REWARD
      );
    });
  });
});
