import User, { IUser } from "../models/User";
import { CreateUserPayload } from "../interfaces/CreateUserPayload";
import { Query } from "mongoose";

const findUserByEmail = async (
  email: string,
  includePassword: boolean = false
): Promise<IUser | null> => {
  let query: Query<IUser | null, IUser> = User.findOne({ email });
  if (includePassword) {
    query = query.select("+password");
  }
  return await query.exec();
};

const createUser = async (userData: CreateUserPayload): Promise<IUser> => {
  const newUser = new User(userData);
  return await newUser.save();
};

export { findUserByEmail, createUser };
