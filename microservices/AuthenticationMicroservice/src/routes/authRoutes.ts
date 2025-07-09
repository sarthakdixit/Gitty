import express, { Request, Response, Router, NextFunction } from "express";
import { loginUser, registerUser } from "../services/authService";
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

/**
 * @route POST /api/auth/login
 * @description Login user.
 * @access Public
 */
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required.");
    }

    const newUser = await loginUser({ email, password });
    res.status(200).json(successResponse("User logged in", newUser));
  }
);

export default router;
