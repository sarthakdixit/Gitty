import { Types } from "mongoose";

export interface IContentBlobMetadata {
  hashType: "sha256";
  originalSize: number;
  uploadedAt: Date;
  originalFilename: string;
  contentType: string;
  uploadedByUserId: Types.ObjectId;
  repositoryId: Types.ObjectId;
}
