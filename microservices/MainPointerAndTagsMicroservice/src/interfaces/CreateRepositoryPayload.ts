import { Types } from "mongoose";
import { RepositoryVisibility } from "../models/Repository";

export interface ICreateRepositoryPayload {
  name: string;
  owner: Types.ObjectId;
  description?: string;
  visibility?: RepositoryVisibility;
}
