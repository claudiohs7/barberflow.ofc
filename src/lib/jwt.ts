import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "super-secret";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30m";

export function signAccessToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
