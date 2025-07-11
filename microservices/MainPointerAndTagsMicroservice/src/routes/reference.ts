import express, { Request, Response, Router, NextFunction } from "express";
import {
  updateMainPointer,
  getMainPointer,
  createTag,
  getTag,
  listTags,
  deleteTag,
} from "../services/referenceService";
import { protect } from "../middlewares/authMiddleware";
import { successResponse } from "../utils/apiResponse";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/apiError";

const router: Router = express.Router();

const getTokenFromRequest = (req: Request): string | undefined => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return undefined;
};

/**
 * @route PUT /api/references/main/:repositoryId
 * @description Updates the 'main' branch pointer for a repository.
 * @access Private (requires JWT, must be repository owner)
 * @body { commitHash: string }
 */
router.put(
  "/main/:repositoryId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId } = req.params;
    const { commitHash } = req.body;
    const userId = req.user?.id;
    const token = getTokenFromRequest(req);

    if (!userId || !token) {
      return next(
        new UnauthorizedError("User not authenticated or token missing.")
      );
    }
    if (!commitHash || typeof commitHash !== "string") {
      return next(new BadRequestError("Commit hash is required."));
    }

    const mainRef = await updateMainPointer(
      repositoryId,
      userId.toString(),
      token,
      commitHash
    );
    res
      .status(200)
      .json(successResponse("Main pointer updated successfully", mainRef));
  }
);

/**
 * @route GET /api/references/main/:repositoryId
 * @description Retrieves the current commit hash for the 'main' branch of a repository.
 * @access Private (requires JWT, access depends on repo visibility)
 */
router.get(
  "/main/:repositoryId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId } = req.params;
    const userId = req.user?.id;
    const token = getTokenFromRequest(req);

    if (!userId || !token) {
      return next(
        new UnauthorizedError("User not authenticated or token missing.")
      );
    }

    const mainRef = await getMainPointer(
      repositoryId,
      userId.toString(),
      token
    );
    res
      .status(200)
      .json(successResponse("Main pointer fetched successfully", mainRef));
  }
);

/**
 * @route POST /api/references/tags/:repositoryId
 * @description Creates a new tag for a repository.
 * @access Private (requires JWT, must have write access to repo)
 * @body { tagName: string, commitHash: string }
 */
router.post(
  "/tags/:repositoryId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId } = req.params;
    const { tagName, commitHash } = req.body;
    const userId = req.user?.id;
    const token = getTokenFromRequest(req);

    if (!userId || !token) {
      return next(
        new UnauthorizedError("User not authenticated or token missing.")
      );
    }
    if (!tagName || typeof tagName !== "string") {
      return next(new BadRequestError("Tag name is required."));
    }
    if (!commitHash || typeof commitHash !== "string") {
      return next(new BadRequestError("Commit hash is required."));
    }

    const newTag = await createTag(
      repositoryId,
      userId.toString(),
      token,
      tagName,
      commitHash
    );
    res.status(201).json(successResponse("Tag created successfully", newTag));
  }
);

/**
 * @route GET /api/references/tags/:repositoryId/:tagName
 * @description Retrieves a specific tag for a repository.
 * @access Private (requires JWT, access depends on repo visibility)
 */
router.get(
  "/tags/:repositoryId/:tagName",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId, tagName } = req.params;
    const userId = req.user?.id;
    const token = getTokenFromRequest(req);

    if (!userId || !token) {
      return next(
        new UnauthorizedError("User not authenticated or token missing.")
      );
    }

    const tag = await getTag(repositoryId, userId.toString(), token, tagName);
    res.status(200).json(successResponse("Tag fetched successfully", tag));
  }
);

/**
 * @route GET /api/references/tags/:repositoryId
 * @description Lists all tags for a repository.
 * @access Private (requires JWT, access depends on repo visibility)
 */
router.get(
  "/tags/:repositoryId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId } = req.params;
    const userId = req.user?.id;
    const token = getTokenFromRequest(req);

    if (!userId || !token) {
      return next(
        new UnauthorizedError("User not authenticated or token missing.")
      );
    }

    const tags = await listTags(repositoryId, userId.toString(), token);
    res.status(200).json(successResponse("Tags listed successfully", tags));
  }
);

/**
 * @route DELETE /api/references/tags/:repositoryId/:tagName
 * @description Deletes a specific tag for a repository.
 * @access Private (requires JWT, must have write access to repo)
 */
router.delete(
  "/tags/:repositoryId/:tagName",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId, tagName } = req.params;
    const userId = req.user?.id;
    const token = getTokenFromRequest(req);

    if (!userId || !token) {
      return next(
        new UnauthorizedError("User not authenticated or token missing.")
      );
    }

    const deleted = await deleteTag(
      repositoryId,
      userId.toString(),
      token,
      tagName
    );
    if (deleted) {
      res
        .status(200)
        .json(successResponse(`Tag '${tagName}' deleted successfully`, null));
    } else {
      next(
        new NotFoundError(`Tag '${tagName}' not found or could not be deleted.`)
      );
    }
  }
);

export default router;
