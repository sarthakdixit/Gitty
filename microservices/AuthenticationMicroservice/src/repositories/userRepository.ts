import User, { IUser } from "../models/User";
import { CreateUserPayload } from "../interfaces/CreateUserPayload";
import mongoose from "mongoose";

const findUserByEmail = async (email: string): Promise<IUser | null> => {
  let query = User.findOne({ email });
  return await query.exec();
};

const createUser = async (userData: CreateUserPayload): Promise<IUser> => {
  const newUser = new User(userData);
  return await newUser.save();
};

const findUserById = async (
  id: string | mongoose.Types.ObjectId
): Promise<IUser | null> => {
  return await User.findById(id).exec();
};

export { findUserByEmail, createUser, findUserById };
