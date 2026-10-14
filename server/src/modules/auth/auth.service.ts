import { AppError, isDuplicateKeyError } from "../../lib/app-error"
import { burnPasswordCheck, hashPassword, verifyPassword } from "../../lib/passwords"
import {
  sessionExpiry,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type RefreshClaims,
} from "../../lib/tokens"
import type { LoginInput, RegisterInput } from "./auth.schemas"
import { toPublicUser, User, type PublicUser, type UserRecord } from "./user.model"

/** Matches the frontend's AuthSession; expiresAt is epoch ms. */
export type Session = { user: PublicUser; expiresAt: number }

export type IssuedSession = {
  session: Session
  accessToken: string
  refreshToken: string
  remember: boolean
  expiresAtSec: number
}

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password")
const unauthenticated = () =>
  new AppError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.")

function issue(user: UserRecord, remember: boolean, expiresAtSec: number): IssuedSession {
  const id = user._id.toString()
  return {
    session: { user: toPublicUser(user), expiresAt: expiresAtSec * 1000 },
    accessToken: signAccessToken({ sub: id, role: user.role }),
    refreshToken: signRefreshToken({
      sub: id,
      ver: user.refreshTokenVersion,
      remember,
      exp: expiresAtSec,
    }),
    remember,
    expiresAtSec,
  }
}

export async function register(input: RegisterInput): Promise<IssuedSession> {
  const { password, ...profile } = input
  try {
    const user = await User.create({
      ...profile,
      role: "owner",
      passwordHash: await hashPassword(password),
    })
    return issue(user, true, sessionExpiry(true))
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists", {
        email: "An account with this email already exists",
      })
    }
    throw err
  }
}

export async function login({ email, password, remember }: LoginInput): Promise<IssuedSession> {
  const user = await User.findOne({ email }).select("+passwordHash")
  if (!user) {
    await burnPasswordCheck(password)
    throw invalidCredentials()
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidCredentials()
  return issue(user, remember, sessionExpiry(remember))
}

async function resolveRefresh(
  token: string | undefined
): Promise<{ user: UserRecord; claims: RefreshClaims }> {
  const claims = token ? verifyRefreshToken(token) : null
  if (!claims) throw unauthenticated()
  const user = await User.findById(claims.sub)
  if (!user || user.refreshTokenVersion !== claims.ver) throw unauthenticated()
  return { user, claims }
}

export async function refresh(token: string | undefined): Promise<IssuedSession> {
  const { user, claims } = await resolveRefresh(token)
  return issue(user, claims.remember, claims.exp)
}

export async function getSession(token: string | undefined): Promise<Session> {
  const { user, claims } = await resolveRefresh(token)
  return { user: toPublicUser(user), expiresAt: claims.exp * 1000 }
}

/** Revokes every refresh token for the user (all devices). */
export async function logout(token: string | undefined): Promise<void> {
  const claims = token ? verifyRefreshToken(token) : null
  if (!claims) return
  await User.updateOne(
    { _id: claims.sub, refreshTokenVersion: claims.ver },
    { $inc: { refreshTokenVersion: 1 } }
  )
}
