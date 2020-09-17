import Block from "./Block";
import Blockchain from "./Blockchain";
import { cryptoHash } from "../hash/hash";
import Transaction from "../transaction/Transaction";
import Wallet from "../wallet";

describe("Blockchain", () => {
  let errorMock, logMock;
  let blockchain: Blockchain;
  let newChain: Blockchain;
  let originalChain: Block[];

  beforeEach(() => {
    errorMock = jest.fn();
    newChain = new Blockchain();
    blockchain = new Blockchain();
    originalChain = blockchain.chain;
    global.console.error = errorMock;
  });

  it("contains a `chain` Array instance", () => {
    expect(blockchain.chain instanceof Array).toBe(true);
  });

  it("should start with the genesis block", () => {
    expect(blockchain.chain[0]).toEqual(Block.genesis());
  });

  it("adds a new block to the chain", () => {
    const newData = "foo bar";
    blockchain.addBlock({ data: newData });

    expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
  });

  describe("isValidChain()", () => {
    describe("when chain does not with genesis block", () => {
      it("returns false", () => {
        blockchain.chain[0] = {
          data: "fake-genesis",
          hash: "a",
          nonce: 0,
          difficulty: 3,
          lastHash: "adfa",
          timestamp: 2333,
        };
        expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
      });
    });

    describe("when chain starts with genesis block and has multi blocks", () => {
      beforeEach(() => {
        blockchain.addBlock({ data: "Bears" });
        blockchain.addBlock({ data: "Beats" });
        blockchain.addBlock({ data: "Battle" });
      });

      describe("and a last hash ref has changed", () => {
        it("returns false", () => {
          blockchain.chain[2].lastHash = "brokenLastHash";

          expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
        });
      });

      describe("and the chain contains a block with invalid field", () => {
        it("returns false", () => {
          blockchain.chain[2].data = "brokenData";

          expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
        });
      });

      describe("the chain contains a jumped difficulty", () => {
        it("returns false", () => {
          const lastBlock = blockchain.chain[blockchain.chain.length - 1];
          const lastHash = lastBlock.lastHash;
          const timestamp = Date.now();
          const nonce = 0;
          const data = [];

          const difficulty = lastBlock.difficulty + 5;

          const hash = cryptoHash(timestamp, lastHash, nonce, difficulty, data);

          const badBlock = new Block({
            timestamp,
            lastHash,
            data,
            difficulty,
            nonce,
            hash,
          });
          blockchain.chain.push(badBlock);
          expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
        });
      });

      describe("and the chain does not contain any invalid blocks", () => {
        it("returns true", () => {
          expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
        });
      });
    });
  });

  describe("replaceChain()", () => {
    beforeEach(() => {
      logMock = jest.fn();

      global.console.log = logMock;
    });
    describe("when new chain is not longer", () => {
      beforeEach(() => {
        newChain.chain[0] = { new: "chain" } as any;
        blockchain.replaceChain(newChain.chain);
      });
      it("does not replace the chain", () => {
        expect(blockchain.chain).toEqual(originalChain);
      });
      it("logs an error", () => {
        expect(errorMock).toHaveBeenCalled();
      });
    });

    describe("when the new chain is longer", () => {
      beforeEach(() => {
        newChain.addBlock({ data: "Bears" });
        newChain.addBlock({ data: "Beats" });
        newChain.addBlock({ data: "Battle" });
      });
      describe("and the chain is invalid", () => {
        beforeEach(() => {
          newChain.chain[1].hash = "somehash";
          blockchain.replaceChain(newChain.chain);
        });
        it("does not replace the chain", () => {
          expect(blockchain.chain).toEqual(originalChain);
        });
        it("logs an error", () => {
          expect(errorMock).toHaveBeenCalled();
        });
      });
      describe("and the chain is valid", () => {
        beforeEach(() => {
          blockchain.replaceChain(newChain.chain);
        });
        it("replaces the chain", () => {
          expect(blockchain.chain).toEqual(newChain.chain);
        });
        it("logs a replacement", () => {
          expect(logMock).toHaveBeenCalled();
        });
      });
    });

    describe("and validateTransactions is activated", () => {
      it("calls validTransactionData", () => {
        const valTrans = jest.fn();
        blockchain.validTransactionData = valTrans;

        newChain.addBlock({ data: "adfas " });
        blockchain.replaceChain(newChain.chain, true);
        expect(valTrans).toHaveBeenCalled();
      });
    });
  });

  describe("validTransactionData()", () => {
    let transaction: Transaction;
    let rewardTransaction: Transaction;
    let wallet: Wallet;

    beforeEach(() => {
      wallet = new Wallet();
      transaction = wallet.createTransaction({
        recipient: "some-test",
        amount: 40,
      });
      rewardTransaction = Transaction.rewardTransaction({
        minerWallet: wallet,
      });
    });

    describe("and the transaction data is valid", () => {
      it("returns true", () => {
        newChain.addBlock({ data: [transaction, rewardTransaction] });
        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(
          true
        );
      });
    });

    describe("and the transaction data has multiple rewards", () => {
      it("returns false and logs an error", () => {
        newChain.addBlock({
          data: [transaction, rewardTransaction, rewardTransaction],
        });
        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(
          false
        );
        expect(errorMock).toHaveBeenCalled();
      });
    });

    describe("and the transaction data has at least one invalid outputMap", () => {
      describe("and the transaction is not a reward transaction", () => {
        it("returns false and logs an error", () => {
          transaction.outputMap[wallet.publicKey] = 99999;
          newChain.addBlock({ data: [transaction, rewardTransaction] });
          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe("and the transaction is a reward transaction", () => {
        it("returns false and logs an error", () => {
          rewardTransaction.outputMap[wallet.publicKey] = 9999;
          newChain.addBlock({ data: [transaction, rewardTransaction] });
          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe("and the transaction has at least one invalid input", () => {
        it("returns false and logs an error", () => {
          wallet.balance = 9000;

          const badOutputMap = {
            [wallet.publicKey]: 8900,
            fooRecep: 100,
          };

          const badTrans = {
            input: {
              timestamp: Date.now(),
              amout: wallet.balance,
              address: wallet.publicKey,
              signature: wallet.sign(badOutputMap),
            },
            outputMap: badOutputMap,
          };

          newChain.addBlock({ data: [badTrans, rewardTransaction] });
          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });

      describe("and a block contains multiple identival transactions", () => {
        it("returns false and logs an error", () => {
          newChain.addBlock({
            data: [transaction, transaction, transaction, rewardTransaction],
          });
          expect(
            blockchain.validTransactionData({ chain: newChain.chain })
          ).toBe(false);
          expect(errorMock).toHaveBeenCalled();
        });
      });
    });
  });
});
