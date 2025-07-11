import {
  createReference,
  findReference,
  updateReferenceCommitHash,
  deleteReferenceById,
  findAllReferencesByRepo,
} from "../repositories/referenceRepository";
import { getRepositoryDetailsFromService } from "../clients/repositoryServiceClient";
import { IRepositoryInfo } from "../interfaces/RepositoryInfo";
import { checkCommitExistenceInContentService } from "../clients/contentServiceClient";
import { IReference, ReferenceType } from "../models/Reference";
import { Types } from "mongoose";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from "../errors/apiError";

const checkRepositoryAccess = async (
  repositoryId: string,
  userId: string,
  token: string,
  requiredAccess: "read" | "write"
): Promise<IRepositoryInfo> => {
  const repo = await getRepositoryDetailsFromService(repositoryId, token);

  if (requiredAccess === "write" && repo.owner.toString() !== userId) {
    throw new ForbiddenError(
      "You do not have write permission for this repository."
    );
  }

  if (
    requiredAccess === "read" &&
    repo.visibility === "private" &&
    repo.owner.toString() !== userId
  ) {
    throw new ForbiddenError("Access denied to private repository.");
  }

  return repo;
};

const updateMainPointer = async (
  repositoryId: string,
  userId: string,
  token: string,
  newCommitHash: string
): Promise<IReference> => {
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestError("Invalid user ID format.");
  }
  if (!newCommitHash || !/^[0-9a-fA-F]{64}$/.test(newCommitHash)) {
    throw new BadRequestError("Invalid commit hash format.");
  }

  const repoObjectId = new Types.ObjectId(repositoryId);

  const repo = await checkRepositoryAccess(
    repositoryId,
    userId,
    token,
    "write"
  );

  const commitExistsInStorage = await checkCommitExistenceInContentService(
    newCommitHash,
    token
  );
  if (!commitExistsInStorage) {
    throw new NotFoundError(
      `Commit with hash '${newCommitHash}' does not exist in content storage.`
    );
  }

  let mainRef = await findReference(repoObjectId, ReferenceType.MAIN, "main");

  if (mainRef) {
    mainRef = await updateReferenceCommitHash(mainRef._id, newCommitHash);
    if (!mainRef) {
      throw new InternalServerError("Failed to update main pointer.");
    }
  } else {
    mainRef = await createReference({
      repository: repoObjectId,
      type: ReferenceType.MAIN,
      name: "main",
      commitHash: newCommitHash,
    });
  }

  return mainRef;
};

const getMainPointer = async (
  repositoryId: string,
  userId: string,
  token: string
): Promise<IReference> => {
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestError("Invalid user ID format.");
  }

  const repoObjectId = new Types.ObjectId(repositoryId);

  await checkRepositoryAccess(repositoryId, userId, token, "read");

  const mainRef = await findReference(repoObjectId, ReferenceType.MAIN, "main");
  if (!mainRef) {
    throw new NotFoundError(
      `Main pointer not found for repository '${repositoryId}'.`
    );
  }

  return mainRef;
};

const createTag = async (
  repositoryId: string,
  userId: string,
  token: string,
  tagName: string,
  commitHash: string
): Promise<IReference> => {
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestError("Invalid user ID format.");
  }
  if (!tagName || tagName.trim().length === 0) {
    throw new BadRequestError("Tag name is required.");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(commitHash)) {
    throw new BadRequestError("Invalid commit hash format.");
  }

  const repoObjectId = new Types.ObjectId(repositoryId);

  await checkRepositoryAccess(repositoryId, userId, token, "write");

  const commitExistsInStorage = await checkCommitExistenceInContentService(
    commitHash,
    token
  );
  if (!commitExistsInStorage) {
    throw new NotFoundError(
      `Commit with hash '${commitHash}' does not exist in content storage.`
    );
  }

  const existingTag = await findReference(
    repoObjectId,
    ReferenceType.TAG,
    tagName
  );
  if (existingTag) {
    throw new ConflictError(
      `Tag with name '${tagName}' already exists for repository '${repositoryId}'.`
    );
  }

  const newTag = await createReference({
    repository: repoObjectId,
    type: ReferenceType.TAG,
    name: tagName,
    commitHash: commitHash,
  });

  return newTag;
};

const getTag = async (
  repositoryId: string,
  userId: string,
  token: string,
  tagName: string
): Promise<IReference> => {
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestError("Invalid user ID format.");
  }
  if (!tagName || tagName.trim().length === 0) {
    throw new BadRequestError("Tag name is required.");
  }

  const repoObjectId = new Types.ObjectId(repositoryId);

  await checkRepositoryAccess(repositoryId, userId, token, "read");

  const tagRef = await findReference(repoObjectId, ReferenceType.TAG, tagName);
  if (!tagRef) {
    throw new NotFoundError(
      `Tag '${tagName}' not found for repository '${repositoryId}'.`
    );
  }

  return tagRef;
};

const listTags = async (
  repositoryId: string,
  userId: string,
  token: string
): Promise<IReference[]> => {
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestError("Invalid user ID format.");
  }

  const repoObjectId = new Types.ObjectId(repositoryId);

  await checkRepositoryAccess(repositoryId, userId, token, "read");

  return await findAllReferencesByRepo(repoObjectId, ReferenceType.TAG);
};

const deleteTag = async (
  repositoryId: string,
  userId: string,
  token: string,
  tagName: string
): Promise<boolean> => {
  if (!Types.ObjectId.isValid(repositoryId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new BadRequestError("Invalid user ID format.");
  }
  if (!tagName || tagName.trim().length === 0) {
    throw new BadRequestError("Tag name is required.");
  }

  const repoObjectId = new Types.ObjectId(repositoryId);

  await checkRepositoryAccess(repositoryId, userId, token, "write");

  const tagRef = await findReference(repoObjectId, ReferenceType.TAG, tagName);
  if (!tagRef) {
    throw new NotFoundError(
      `Tag '${tagName}' not found for repository '${repositoryId}'.`
    );
  }

  const deleted = await deleteReferenceById(tagRef._id);
  return !!deleted;
};

export {
  updateMainPointer,
  getMainPointer,
  createTag,
  getTag,
  listTags,
  deleteTag,
};
