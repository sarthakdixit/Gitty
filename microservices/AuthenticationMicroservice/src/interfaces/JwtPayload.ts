import { Types } from "mongoose";

export interface jwtPayload {
  id: Types.ObjectId;
  email: string;
}
