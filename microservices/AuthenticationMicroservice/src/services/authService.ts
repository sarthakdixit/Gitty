import { findUserByEmail, createUser } from "../repositories/userRepository";
import { CreateUserPayload } from "../interfaces/CreateUserPayload";
import { IUser } from "../models/User";
import { ConflictError, UnauthorizedError } from "../erros/apiError";
import { jwtPayload } from "../interfaces/JwtPayload";
import { generateToken } from "./jetService";

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

const loginUser = async (
  userData: CreateUserPayload
): Promise<{ user: IUser; token: string }> => {
  const existingUser = await findUserByEmail(userData.email, true);
  if (!existingUser) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const isMatch = await existingUser.comparePassword(userData.password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const jwt: jwtPayload = {
    id: existingUser._id,
    email: existingUser.email,
  };

  const token = generateToken(jwt);

  const userObject = existingUser.toObject();
  delete userObject.password;

  return { user: userObject as IUser, token: token };
};

export { registerUser, loginUser };
