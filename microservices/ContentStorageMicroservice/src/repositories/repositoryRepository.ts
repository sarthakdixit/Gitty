import Repository, { IRepository } from "../models/Repository";
import { Types } from "mongoose";
import { ICreateRepositoryPayload } from "../interfaces/CreateRepositoryPayload";

const createRepository = async (
  payload: ICreateRepositoryPayload
): Promise<IRepository> => {
  const newRepo = new Repository(payload);
  return await newRepo.save();
};

const findRepositoryById = async (
  repoId: string | Types.ObjectId
): Promise<IRepository | null> => {
  return await Repository.findById(repoId).exec();
};

const findRepositoryByNameAndOwner = async (
  name: string,
  ownerId: string | Types.ObjectId
): Promise<IRepository | null> => {
  return await Repository.findOne({ name, owner: ownerId }).exec();
};

const findAllRepositoriesByOwner = async (
  ownerId: string | Types.ObjectId
): Promise<IRepository[]> => {
  return await Repository.find({ owner: ownerId }).exec();
};

const deleteRepositoryById = async (
  repoId: string | Types.ObjectId
): Promise<IRepository | null> => {
  return await Repository.findByIdAndDelete(repoId).exec();
};

const updateRepositoryById = async (
  repoId: string | Types.ObjectId,
  updates: Partial<IRepository>
): Promise<IRepository | null> => {
  return await Repository.findByIdAndUpdate(repoId, updates, {
    new: true,
    runValidators: true,
  }).exec();
};

export {
  createRepository,
  findRepositoryById,
  findRepositoryByNameAndOwner,
  findAllRepositoriesByOwner,
  deleteRepositoryById,
  updateRepositoryById,
};
