import { Types } from "mongoose";
import { ReferenceType } from "../models/Reference";

export interface ICreateReferencePayload {
  repository: Types.ObjectId;
  type: ReferenceType;
  name: string;
  commitHash: string;
}
