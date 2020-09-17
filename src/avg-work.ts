import Blockchain from "./chain/Blockchain";

const blockchain = new Blockchain();

blockchain.addBlock({ data: "initial" });

console.log("first block", blockchain.chain[blockchain.chain.length - 1]);

let prevTime;
let nextTime;
let nextBlock;
let timeDiff;
let average;

const times = [] as number[];

for (let i = 0; i < 10000; i++) {
  prevTime = blockchain.chain[blockchain.chain.length - 1].timestamp;

  blockchain.addBlock({ data: `block ${i}` });
  nextBlock = blockchain.chain[blockchain.chain.length - 1];

  nextTime = nextBlock.timestamp;

  timeDiff = (nextTime - prevTime) as number;
  times.push(timeDiff as number);

  average =
    times.reduceRight((total: number, num: number) => (total + num) as number) /
    times.length;

  console.log(timeDiff, nextBlock.difficulty, average);
}
