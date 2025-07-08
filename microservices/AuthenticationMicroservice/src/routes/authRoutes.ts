import express, { Request, Response, Router } from "express";
import { registerUser } from "../services/authService";
import { successResponse } from "../utils/apiResponse";

const router: Router = express.Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user.
 * @access Public
 */
router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new Error("Please enter all fields");
  }

  const newUser = await registerUser({ email, password });
  res
    .status(201)
    .json(successResponse("User registered successfully", newUser));
});

export default router;
