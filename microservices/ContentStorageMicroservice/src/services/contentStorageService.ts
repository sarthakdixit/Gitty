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
  BadRequestError,
} from "../errors/apiError";
import { createHash } from "crypto";
import { Readable } from "stream";
import { ITreeEntry, ITree } from "../interfaces/Tree";
import { IContentBlobMetadata } from "../interfaces/ContentBlobMetadata";
import { Types } from "mongoose";
import { ICommit } from "../interfaces/Commit";

const calculateSha256 = (buffer: Buffer): string => {
  return createHash("sha256").update(buffer).digest("hex");
};

const COMMIT_CONTENT_TYPE = "application/x-vcs-commit";

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

const storeTree = async (
  entries: ITreeEntry[],
  uploadedByUserId: string,
  repositoryId: string
): Promise<string> => {
  if (!Types.ObjectId.isValid(uploadedByUserId)) {
    throw new BadRequestError("Invalid uploadedByUserId format.");
  }
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repositoryId format.");
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const treeContent = JSON.stringify({ entries });
  const contentBuffer = Buffer.from(treeContent, "utf8");

  const hash = calculateSha256(contentBuffer);

  const exists = await fileExists(hash);
  if (exists) {
    console.log(`Tree with hash ${hash} already exists. Skipping upload.`);
    return hash;
  }

  const readableStream = Readable.from(contentBuffer);

  const metadata: IContentBlobMetadata = {
    hashType: "sha256",
    originalSize: contentBuffer.length,
    uploadedAt: new Date(),
    originalFilename: `tree-${hash}.json`,
    contentType: "application/json",
    uploadedByUserId: new Types.ObjectId(uploadedByUserId),
    repositoryId: new Types.ObjectId(repositoryId),
  };

  await uploadStream(hash, readableStream, metadata);
  return hash;
};

const getTree = async (hash: string): Promise<ITree> => {
  const downloadStream = await getBlob(hash);

  return new Promise((resolve, reject) => {
    let data = "";
    downloadStream.on("data", (chunk) => (data += chunk.toString()));
    downloadStream.on("end", () => {
      const tree = JSON.parse(data);
      if (!tree || !Array.isArray(tree.entries)) {
        return reject(
          new BadRequestError(
            `Content with hash '${hash}' is not a valid tree format.`
          )
        );
      }
      resolve(tree as ITree);
    });
    downloadStream.on("error", (err) => {
      reject(
        new InternalServerError(
          `Failed to download tree content for hash '${hash}': ${err.message}`
        )
      );
    });
  });
};

const storeCommit = async (
  commit: ICommit,
  uploadedByUserId: string,
  repositoryId: string
): Promise<string> => {
  if (!Types.ObjectId.isValid(uploadedByUserId)) {
    throw new BadRequestError("Invalid uploadedByUserId format.");
  }
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repositoryId format.");
  }
  if (!commit.tree || !/^[0-9a-fA-F]{64}$/.test(commit.tree)) {
    throw new BadRequestError("Commit must reference a valid tree hash.");
  }
  if (
    !Array.isArray(commit.parents) ||
    commit.parents.some((p) => !/^[0-9a-fA-F]{64}$/.test(p))
  ) {
    throw new BadRequestError(
      "Commit parents must be an array of valid commit hashes."
    );
  }
  if (!commit.author || !commit.author.email || !commit.author.timestamp) {
    throw new BadRequestError("Commit author information is incomplete.");
  }
  if (
    !commit.committer ||
    !commit.committer.email ||
    !commit.committer.timestamp
  ) {
    throw new BadRequestError("Commit committer information is incomplete.");
  }
  if (!commit.message || commit.message.trim().length === 0) {
    throw new BadRequestError("Commit message is required.");
  }

  const commitContent = JSON.stringify(commit);
  const contentBuffer = Buffer.from(commitContent, "utf8");

  const hash = calculateSha256(contentBuffer);

  const exists = await fileExists(hash);
  if (exists) {
    console.log(`Commit with hash ${hash} already exists. Skipping upload.`);
    return hash;
  }

  const readableStream = Readable.from(contentBuffer);

  const metadata: IContentBlobMetadata = {
    hashType: "sha256",
    originalSize: contentBuffer.length,
    uploadedAt: new Date(),
    originalFilename: `commit-${hash}.json`,
    contentType: COMMIT_CONTENT_TYPE,
    uploadedByUserId: new Types.ObjectId(uploadedByUserId),
    repositoryId: new Types.ObjectId(repositoryId),
  };

  await uploadStream(hash, readableStream, metadata);
  return hash;
};

const getCommit = async (hash: string): Promise<ICommit> => {
  const file = await findFileByFileName(hash);

  if (!file) {
    throw new NotFoundError(`Commit with hash '${hash}' not found.`);
  }

  if (file.metadata?.contentType !== COMMIT_CONTENT_TYPE) {
    throw new BadRequestError(
      `Content with hash '${hash}' is not a commit object.`
    );
  }

  const downloadStream = openDownloadStream(file._id);

  return new Promise((resolve, reject) => {
    let data = "";
    downloadStream.on("data", (chunk) => (data += chunk.toString()));
    downloadStream.on("end", () => {
      const commit = JSON.parse(data);
      if (
        !commit ||
        !commit.tree ||
        !Array.isArray(commit.parents) ||
        !commit.author ||
        !commit.committer ||
        !commit.message
      ) {
        throw new BadRequestError(
          `Content with hash '${hash}' is not a valid commit format.`
        );
      }
      resolve(commit as ICommit);
    });
    downloadStream.on("error", (err) => {
      throw new InternalServerError(
        `Failed to download commit content for hash '${hash}': ${err.message}`
      );
    });
  });
};

const commitExists = async (commitHash: string): Promise<boolean> => {
  const file = await findFileByFileName(commitHash);
  return !!file && file.metadata?.contentType === COMMIT_CONTENT_TYPE;
};

export {
  storeBlob,
  getBlob,
  calculateSha256,
  fileExists,
  getBlobsByRepositoryAndUser,
  storeTree,
  getTree,
  storeCommit,
  getCommit,
  commitExists,
};
