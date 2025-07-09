import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/jwtService"; 
import { UnauthorizedError } from "../errors/apiError"; 
import { jwtPayload } from "../interfaces/JwtPayload";

/**
 * Middleware to protect routes by verifying JWT.
 * Attaches the decoded user payload to `req.user`.
 * @param req - Express Request object.
 * @param res - Express Response object.
 * @param next - Express NextFunction.
 */
const protect = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new UnauthorizedError("No token, authorization denied"));
  }

  try {
    const decoded = verifyToken(token) as jwtPayload;
    req.user = decoded;
    next(); 
  } catch (error) {
    next(error);
  }
};

export { protect };
