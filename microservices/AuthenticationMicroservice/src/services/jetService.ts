import jwt, { SignOptions } from "jsonwebtoken";
import { jwtPayload } from "../interfaces/JwtPayload";
import { InternalServerError } from "../erros/apiError";

const generateToken = (payload: jwtPayload): string => {
  if (!process.env.JWT_SECRET) {
    throw new InternalServerError("JWT_SECRET is not configured.");
  }
  if (!process.env.JWT_EXPIRES_IN) {
    throw new InternalServerError("JWT_EXPIRES_IN is not configured.");
  }

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    } as SignOptions
  );

  return token;
};

const verifyToken = (token: string): jwtPayload => {
  if (!process.env.JWT_SECRET) {
    throw new InternalServerError("JWT_SECRET is not configured.");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwtPayload;
  return decoded;
};

export { generateToken, verifyToken };
