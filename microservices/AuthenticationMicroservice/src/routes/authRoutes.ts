import express, { Request, Response, Router, NextFunction } from "express";
import { registerUser } from "../services/authService";
import { successResponse } from "../utils/apiResponse";
import { BadRequestError } from "../erros/apiError";

const router: Router = express.Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user.
 * @access Public
 */
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required.");
    }

    const newUser = await registerUser({ email, password });
    res
      .status(201)
      .json(successResponse("User registered successfully", newUser));
  }
);

export default router;
