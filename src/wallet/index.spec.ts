import { transcode } from "buffer";
import { exec } from "child_process";
import e from "express";
import Block from "../chain/Block";
import Blockchain from "../chain/Blockchain";
import { STARTING_BALANCE } from "../config/config";
import Transaction from "../transaction/Transaction";
import { verifySignature } from "../utils";
import Wallet from "./index";

describe("Wallet", () => {
  let wallet: Wallet;
  let transaction: Transaction;

  beforeEach(() => {
    wallet = new Wallet();
    transaction = new Transaction({
      senderWallet: wallet,
      recipient: "some",
      amount: 50,
    });
  });

  it("has a `balance`", () => {
    expect(wallet).toHaveProperty("balance");
  });

  it("has a `publickey`", () => {
    expect(wallet).toHaveProperty("publicKey");
  });

  describe("signing data", () => {
    const data = "foo";

    it("verifies a signature", () => {
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          data,
          signature: wallet.sign(data),
        })
      ).toBe(true);
    });

    it("does not verify an invalid signature", () => {
      expect(
        verifySignature({
          publicKey: wallet.publicKey,
          data,
          signature: new Wallet().sign(data),
        })
      ).toBe(false);
    });
  });

  describe("createTransaction()", () => {
    describe("and the amount exceeds the balance", () => {
      it("throws an error", () => {
        expect(() =>
          wallet.createTransaction({ amount: 999999, recipient: "foo" })
        ).toThrow("Amount exceeds balance.");
      });
    });
    describe("and the amount is valid", () => {
      let transaction: Transaction;
      let amount: number;
      let recipient: string;
      beforeEach(() => {
        amount = 50;
        recipient = "some-foo";
        transaction = wallet.createTransaction({ amount, recipient });
      });
      it("creates an instance of `Transaction`", () => {
        expect(transaction instanceof Transaction).toBe(true);
      });
      it("matches the transaction input with the wallet", () => {
        expect(transaction.input.address).toEqual(wallet.publicKey);
      });
      it("outputs the amount to the recipient", () => {
        expect(transaction.outputMap[recipient]).toEqual(amount);
      });
    });

    describe("where a chain is passed", () => {
      it("calls `Wallet.calculateBalance`", () => {
        const calcBalance = jest.fn();

        const originalCalcBalance = Wallet.calculateBalance;

        Wallet.calculateBalance = calcBalance;

        wallet.createTransaction({
          recipient: "foo",
          amount: 32,
          chain: new Blockchain().chain,
        });

        expect(calcBalance).toHaveBeenCalled();
        Wallet.calculateBalance = originalCalcBalance;
      });
    });
  });

  describe("calculateBalance()", () => {
    let blockchain: Blockchain;
    beforeEach(() => {
      blockchain = new Blockchain();
    });

    describe("and there are no outputs for the wallet", () => {
      it("returns the STARTING_BALANCE", () => {
        expect(
          Wallet.calculateBalance({
            chain: blockchain.chain,
            address: wallet.publicKey,
          })
        ).toEqual(STARTING_BALANCE);
      });
    });

    describe("and there are outputs for the wallet", () => {
      let transOne: Transaction;
      let transTwo: Transaction;

      beforeEach(() => {
        transOne = new Wallet().createTransaction({
          amount: 10,
          recipient: wallet.publicKey,
        });
        transTwo = new Wallet().createTransaction({
          amount: 20,
          recipient: wallet.publicKey,
        });
        blockchain.addBlock({ data: [transOne, transTwo] });
      });

      it("adds the summ of all outputs to the wallets balance", () => {
        expect(
          Wallet.calculateBalance({
            chain: blockchain.chain,
            address: wallet.publicKey,
          })
        ).toEqual(
          STARTING_BALANCE +
            transOne.outputMap[wallet.publicKey] +
            transTwo.outputMap[wallet.publicKey]
        );
      });

      describe("and wallet has made a transaction", () => {
        let recentTrans: Transaction;

        beforeEach(() => {
          recentTrans = wallet.createTransaction({
            amount: 10,
            recipient: "foo-add",
          });
          blockchain.addBlock({ data: [recentTrans] });
        });
        it("returns the output of the recent transaction", () => {
          expect(
            Wallet.calculateBalance({
              chain: blockchain.chain,
              address: wallet.publicKey,
            })
          ).toEqual(recentTrans.outputMap[wallet.publicKey]);
        });

        describe("and there are outputs next to and after the recent transaction", () => {
          let sameBlockTrans: Transaction;
          let nextBlockTransaction: Transaction;

          beforeEach(() => {
            recentTrans = wallet.createTransaction({
              amount: 10,
              recipient: "later-foo-add",
            });
            sameBlockTrans = Transaction.rewardTransaction({
              minerWallet: wallet,
            });
            blockchain.addBlock({ data: [recentTrans, sameBlockTrans] });

            nextBlockTransaction = new Wallet().createTransaction({
              recipient: wallet.publicKey,
              amount: 75,
            });

            blockchain.addBlock({ data: [nextBlockTransaction] });
          });

          it("includes the output amounts in the returned balance", () => {
            expect(
              Wallet.calculateBalance({
                chain: blockchain.chain,
                address: wallet.publicKey,
              })
            ).toEqual(
              recentTrans.outputMap[wallet.publicKey] +
                sameBlockTrans.outputMap[wallet.publicKey] +
                nextBlockTransaction.outputMap[wallet.publicKey]
            );
          });
        });
      });
    });
  });
});
