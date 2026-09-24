import "server-only";
import { randomInt } from "node:crypto";

// No 0/O, 1/l/I: the password gets read off an e-mail and typed by hand.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Good for one entry: the login is forced to choose its own on first access. */
export function generateTemporaryPassword(length = 12) {
  let password = "";
  for (let i = 0; i < length; i++) password += ALPHABET[randomInt(ALPHABET.length)];
  return password;
}
