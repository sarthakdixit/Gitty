import express, { Request, Response, Router, NextFunction } from "express";
import {
  createRepo,
  getRepoDetails,
  getUserRepositories,
  deleteRepo,
  updateRepo,
} from "../services/repositoryService";
import { protect } from "../middlewares/authMiddleware";
import { successResponse } from "../utils/apiResponse";
import { RepositoryVisibility } from "../models/Repository";
import { BadRequestError, InternalServerError } from "../errors/apiError";

const router: Router = express.Router();

/**
 * @route POST /api/repos
 * @description Create a new repository.
 * @access Private (requires JWT)
 */
router.post(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, visibility } = req.body;
    const ownerId = req.user?.id;

    if (!ownerId) {
      throw new BadRequestError("User not authenticated.");
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new BadRequestError("Repository name is required.");
    }

    if (
      visibility &&
      !Object.values(RepositoryVisibility).includes(visibility)
    ) {
      throw new BadRequestError(
        'Invalid visibility. Must be "public" or "private".'
      );
    }

    const newRepo = await createRepo({
      name,
      owner: ownerId,
      description,
      visibility,
    });
    res
      .status(201)
      .json(successResponse("Repository created successfully", newRepo));
  }
);

/**
 * @route GET /api/repos/:repoId
 * @description Get details of a specific repository.
 * @access Private (requires JWT for private repos, public for public repos)
 */
router.get(
  "/:repoId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User not authenticated.");
    }

    const repo = await getRepoDetails(repoId, userId.toString());
    res
      .status(200)
      .json(successResponse("Repository details fetched successfully", repo));
  }
);

/**
 * @route GET /api/repos/user/:userId
 * @description Get all repositories owned by a specific user.
 * @access Private (requires JWT, user can only fetch their own repos for now)
 * NOTE: For a more advanced system, you might allow admins to fetch others' repos.
 */
router.get(
  "/user/:userId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId: requestedUserId } = req.params;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      throw new BadRequestError("User not authenticated.");
    }

    if (requestedUserId !== authenticatedUserId.toString()) {
      throw new BadRequestError("You can only view your own repositories.");
    }

    const repos = await getUserRepositories(authenticatedUserId.toString());
    res
      .status(200)
      .json(successResponse("User repositories fetched successfully", repos));
  }
);

/**
 * @route PUT /api/repos/:repoId
 * @description Update details of a specific repository.
 * @access Private (requires JWT, must be owner)
 */
router.put(
  "/:repoId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repoId } = req.params;
    const { name, description, visibility } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User not authenticated.");
    }

    const updates: {
      name?: string;
      description?: string;
      visibility?: RepositoryVisibility;
    } = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (visibility !== undefined) {
      if (!Object.values(RepositoryVisibility).includes(visibility)) {
        throw new BadRequestError(
          'Invalid visibility. Must be "public" or "private".'
        );
      }
      updates.visibility = visibility;
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestError("No update fields provided.");
    }

    const updatedRepo = await updateRepo(repoId, userId.toString(), updates);
    res
      .status(200)
      .json(successResponse("Repository updated successfully", updatedRepo));
  }
);

/**
 * @route DELETE /api/repos/:repoId
 * @description Delete a specific repository.
 * @access Private (requires JWT, must be owner)
 */
router.delete(
  "/:repoId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User not authenticated.");
    }

    const deleted = await deleteRepo(repoId, userId.toString());
    if (deleted) {
      res
        .status(200)
        .json(successResponse("Repository deleted successfully", null));
    } else {
      throw new InternalServerError(
        "Repository not found or could not be deleted."
      );
    }
  }
);

export default router;
