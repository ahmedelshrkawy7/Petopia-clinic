import bcrypt from "bcryptjs"

import { env } from "../config/env"

export const hashPassword = (password: string) => bcrypt.hash(password, env.BCRYPT_ROUNDS)

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash)

let dummyHash: Promise<string> | undefined

/** Spends the same time as a real check so unknown emails can't be detected by timing. */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("timing-equalizer")
  await bcrypt.compare(password, await dummyHash)
}
