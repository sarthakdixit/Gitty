import Reference, { IReference, ReferenceType } from "../models/Reference";
import { Types } from "mongoose";
import { ICreateReferencePayload } from "../interfaces/CreateReferencePayload";

const createReference = async (
  payload: ICreateReferencePayload
): Promise<IReference> => {
  const newRef = new Reference(payload);
  return await newRef.save();
};

const findReference = async (
  repositoryId: Types.ObjectId,
  type: ReferenceType,
  name: string
): Promise<IReference | null> => {
  return await Reference.findOne({
    repository: repositoryId,
    type,
    name,
  }).exec();
};

const updateReferenceCommitHash = async (
  referenceId: Types.ObjectId,
  newCommitHash: string
): Promise<IReference | null> => {
  return await Reference.findByIdAndUpdate(
    referenceId,
    { commitHash: newCommitHash, updatedAt: new Date() },
    { new: true, runValidators: true }
  ).exec();
};

const deleteReferenceById = async (
  referenceId: Types.ObjectId
): Promise<IReference | null> => {
  return await Reference.findByIdAndDelete(referenceId).exec();
};

const findAllReferencesByRepo = async (
  repositoryId: Types.ObjectId,
  type?: ReferenceType
): Promise<IReference[]> => {
  const query: any = { repository: repositoryId };
  if (type) {
    query.type = type;
  }
  return await Reference.find(query).exec();
};

export {
  createReference,
  findReference,
  updateReferenceCommitHash,
  deleteReferenceById,
  findAllReferencesByRepo,
};
