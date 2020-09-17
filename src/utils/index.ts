import { cryptoHash } from "../hash/hash";
import { ec } from "./elliptic";

export function verifySignature({ publicKey, data, signature }) {
  const keyFromPublic = ec.keyFromPublic(publicKey, "hex");

  return keyFromPublic.verify(cryptoHash(data), signature);
}
