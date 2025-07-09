import {
  findUserByEmail,
  findUserById,
  createUser,
} from "../repositories/userRepository";
import { CreateUserPayload } from "../interfaces/CreateUserPayload";
import { IUser } from "../models/User";
import { ConflictError } from "../erros/apiError";

const registerUser = async (userData: CreateUserPayload): Promise<IUser> => {
  const existingUser = await findUserByEmail(userData.email);
  if (existingUser) {
    throw new ConflictError("User already exists");
  }
  const newUser = await createUser(userData);

  const userObject = newUser.toObject();
  delete userObject.password;
  return userObject as IUser;
};

export { registerUser };
