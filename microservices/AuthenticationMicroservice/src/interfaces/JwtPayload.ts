import { Types } from "mongoose";

export interface jwtPayload {
  id: Types.ObjectId;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: jwtPayload;
    }
  }
}
