import { Types } from "mongoose";
import { RepositoryVisibility } from "../models/Repository";

export interface IRepository extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  owner: Types.ObjectId;
  visibility: RepositoryVisibility;
  createdAt: Date;
  updatedAt: Date;
}
