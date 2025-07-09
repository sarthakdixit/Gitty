import {
  uploadStream,
  findFileByFileName,
  openDownloadStream,
  fileExists,
  findFilesByMetadata,
} from "../repositories/contentRepository";
import {
  InternalServerError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../errors/apiError";
import { createHash } from "crypto";
import { Readable } from "stream";
import { IContentBlobMetadata } from "../interfaces/ContentBlobMetadata";
import { Types } from "mongoose";

const calculateSha256 = (buffer: Buffer): string => {
  return createHash("sha256").update(buffer).digest("hex");
};

const storeBlob = async (
  contentBuffer: Buffer,
  originalFilename: string,
  contentType: string,
  uploadedByUserId: string,
  repositoryId: string
): Promise<string> => {
  if (!Types.ObjectId.isValid(uploadedByUserId)) {
    throw new BadRequestError("Invalid uploadedByUserId format.");
  }
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repositoryId format.");
  }

  const hash = calculateSha256(contentBuffer);

  const exists = await fileExists(hash);
  if (exists) {
    console.log(`Blob with hash ${hash} already exists. Skipping upload.`);
    return hash;
  }

  const readableStream = Readable.from(contentBuffer);

  const metadata: IContentBlobMetadata = {
    hashType: "sha256",
    originalSize: contentBuffer.length,
    uploadedAt: new Date(),
    originalFilename,
    contentType,
    uploadedByUserId: new Types.ObjectId(uploadedByUserId),
    repositoryId: new Types.ObjectId(repositoryId),
  };

  await uploadStream(hash, readableStream, metadata);
  return hash;
};

const getBlob = async (hash: string): Promise<Readable> => {
  const file = await findFileByFileName(hash);

  if (!file) {
    throw new NotFoundError(`Blob with hash '${hash}' not found.`);
  }

  return openDownloadStream(file._id);
};

const getBlobsByRepositoryAndUser = async (
  repositoryId: string,
  userId?: string
): Promise<any[]> => {
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }

  const query: any = {
    "metadata.repositoryId": new Types.ObjectId(repositoryId),
  };

  if (userId) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestError("Invalid user ID format.");
    }
    query["metadata.uploadedByUserId"] = new Types.ObjectId(userId);
  }

  const files = await findFilesByMetadata(query);

  return files.map((file) => ({
    hash: file.filename,
    size: file.length,
    originalFilename: file.metadata?.originalFilename,
    contentType: file.metadata?.contentType,
    uploadedAt: file.uploadDate,
    uploadedByUserId: file.metadata?.uploadedByUserId,
    repositoryId: file.metadata?.repositoryId,
    fileId: file._id,
  }));
};

export {
  storeBlob,
  getBlob,
  calculateSha256,
  fileExists,
  getBlobsByRepositoryAndUser,
};
