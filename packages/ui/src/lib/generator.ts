import { customAlphabet } from "nanoid";

/**
 * Generates a 4-character nanoid
 * @returns A random 4-character string using alphanumeric characters
 */
export function randomNano(): string {
  const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz", 4);
  return nanoid();
}
