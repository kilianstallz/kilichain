import { GENESIS_DATA, MINE_RATE } from "../config/config";
import { cryptoHash, hexToBinary } from "../hash/hash";

export default class Block {
  timestamp: number;
  lastHash: string;
  hash: string;
  difficulty: number;
  nonce: number;
  data: any;
  constructor({ timestamp, lastHash, hash, data, difficulty, nonce }) {
    this.timestamp = timestamp;
    this.lastHash = lastHash;
    this.hash = hash;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }

  static genesis() {
    return new this(GENESIS_DATA);
  }

  static mineBlock({ lastBlock, data }: { lastBlock: Block; data: any }) {
    const lastHash = lastBlock.hash;
    let hash: string;
    let timestamp: number;
    let { difficulty } = lastBlock;
    let nonce = 0;

    do {
      nonce++;
      timestamp = Date.now();
      difficulty = Block.adjustDifficulty({
        originalBlock: lastBlock,
        timestamp,
      });
      hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
    } while (
      hexToBinary(hash).substring(0, difficulty) !== "0".repeat(difficulty)
    );

    return new this({
      timestamp,
      lastHash,
      data,
      difficulty,
      nonce,
      hash,
    });
  }

  static adjustDifficulty({
    originalBlock,
    timestamp,
  }: {
    originalBlock: Block;
    timestamp: number;
  }) {
    const { difficulty } = originalBlock;

    if (difficulty < 1) {
      return 1;
    }

    const diff = timestamp - originalBlock.timestamp;
    if (diff > MINE_RATE) {
      return difficulty - 1;
    }

    return difficulty + 1;
  }
}
