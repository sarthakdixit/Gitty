import {
  createRepository,
  findRepositoryById,
  findRepositoryByNameAndOwner,
  findAllRepositoriesByOwner,
  deleteRepositoryById,
  updateRepositoryById,
} from "../repositories/repositoryRepository";
import { IRepository, RepositoryVisibility } from "../models/Repository";
import { Types } from "mongoose";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
} from "../errors/apiError";
import { ICreateRepositoryPayload } from "../interfaces/CreateRepositoryPayload";

const createRepo = async (
  payload: ICreateRepositoryPayload
): Promise<IRepository> => {
  if (!Types.ObjectId.isValid(payload.owner)) {
    throw new BadRequestError("Invalid owner ID format.");
  }
  const ownerObjectId = new Types.ObjectId(payload.owner);

  const existingRepo = await findRepositoryByNameAndOwner(
    payload.name,
    ownerObjectId
  );
  if (existingRepo) {
    throw new ConflictError(
      `Repository with name '${payload.name}' already exists for this user.`
    );
  }

  payload.owner = ownerObjectId;

  return await createRepository(payload);
};

const getRepoDetails = async (
  repoId: string,
  userId: string
): Promise<IRepository> => {
  if (!Types.ObjectId.isValid(repoId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }

  const repo = await findRepositoryById(repoId);

  if (!repo) {
    throw new NotFoundError(`Repository with ID '${repoId}' not found.`);
  }

  if (
    repo.visibility === RepositoryVisibility.PRIVATE &&
    repo.owner.toString() !== userId
  ) {
    throw new ForbiddenError("Access denied to private repository.");
  }

  return repo;
};

const getUserRepositories = async (ownerId: string): Promise<IRepository[]> => {
  if (!Types.ObjectId.isValid(ownerId)) {
    throw new BadRequestError("Invalid owner ID format.");
  }
  const ownerObjectId = new Types.ObjectId(ownerId);
  return await findAllRepositoriesByOwner(ownerObjectId);
};

const deleteRepo = async (repoId: string, userId: string): Promise<boolean> => {
  if (!Types.ObjectId.isValid(repoId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }

  const repo = await findRepositoryById(repoId);

  if (!repo) {
    throw new NotFoundError(`Repository with ID '${repoId}' not found.`);
  }

  if (repo.owner.toString() !== userId) {
    throw new ForbiddenError(
      "You do not have permission to delete this repository."
    );
  }

  const deletedRepo = await deleteRepositoryById(repoId);
  return !!deletedRepo;
};

const updateRepo = async (
  repoId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    visibility?: RepositoryVisibility;
  }
): Promise<IRepository> => {
  if (!Types.ObjectId.isValid(repoId)) {
    throw new BadRequestError("Invalid repository ID format.");
  }

  const repo = await findRepositoryById(repoId);

  if (!repo) {
    throw new NotFoundError(`Repository with ID '${repoId}' not found.`);
  }

  if (repo.owner.toString() !== userId) {
    throw new ForbiddenError(
      "You do not have permission to update this repository."
    );
  }

  if (updates.name && updates.name !== repo.name) {
    const existingRepoWithNewName = await findRepositoryByNameAndOwner(
      updates.name,
      repo.owner
    );
    if (existingRepoWithNewName) {
      throw new ConflictError(
        `A repository named '${updates.name}' already exists for this user.`
      );
    }
  }

  const updatedRepo = await updateRepositoryById(repoId, updates);

  if (!updatedRepo) {
    throw new InternalServerError(
      "Failed to update repository after initial find."
    );
  }

  return updatedRepo;
};

export {
  createRepo,
  getRepoDetails,
  getUserRepositories,
  deleteRepo,
  updateRepo,
};
