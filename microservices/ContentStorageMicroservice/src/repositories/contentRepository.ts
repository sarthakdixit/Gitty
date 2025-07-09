import { getGridFSBucket } from "../config/db";
import {
  GridFSBucket,
  GridFSBucketReadStream,
  GridFSBucketWriteStream,
  ObjectId,
} from "mongodb";
import { InternalServerError } from "../errors/apiError";
import { Readable } from "stream";
import { IContentBlobMetadata } from "../interfaces/ContentBlobMetadata";
import { get } from "http";

const getBucket = (): GridFSBucket => {
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new InternalServerError(
      "GridFSBucket is not initialized. Database connection might be down."
    );
  }
  return bucket;
};

const findFileByFileName = async (filename: string): Promise<any | null> => {
  const bucket = getBucket();
  const files = await bucket.find({ filename }).toArray();
  return files.length > 0 ? files[0] : null;
};

const findFilesByMetadata = async (query: object): Promise<any[]> => {
  const bucket = getBucket();
  return await bucket.find(query).toArray();
};

const uploadStream = (
  filename: string,
  sourceStream: Readable,
  metadata?: IContentBlobMetadata
): Promise<{ _id: ObjectId; filename: string }> => {
  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(filename, { metadata });

  return new Promise((resolve, reject) => {
    sourceStream.pipe(uploadStream);

    uploadStream.on("finish", () => {
      resolve({ _id: uploadStream.id, filename: uploadStream.filename });
    });

    uploadStream.on("error", (err) => {
      console.error(`Error during GridFS upload for ${filename}:`, err);
      reject(
        new InternalServerError(`Failed to upload content: ${err.message}`)
      );
    });
  });
};

const openDownloadStream = (fileId: ObjectId): GridFSBucketReadStream => {
  const bucket = getBucket();
  const downloadStream = bucket.openDownloadStream(fileId);

  downloadStream.on("error", (err) => {
    console.error(`Error opening download stream for file ID ${fileId}:`, err);
    throw new InternalServerError(
      `Failed to open download stream: ${err.message}`
    );
  });

  return downloadStream;
};

const fileExists = async (filename: string): Promise<boolean> => {
  const file = await findFileByFileName(filename);
  return !!file;
};

export {
  findFileByFileName,
  uploadStream,
  openDownloadStream,
  fileExists,
  findFilesByMetadata,
};
