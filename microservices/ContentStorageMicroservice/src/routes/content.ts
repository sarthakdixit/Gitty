import express, { Request, Response, Router, NextFunction } from "express";
import fileUpload from "express-fileupload";
import {
  storeBlob,
  getBlob,
  getBlobsByRepositoryAndUser,
  storeTree,
  getTree,
  storeCommit,
  getCommit,
} from "../services/contentStorageService";
import { successResponse } from "../utils/apiResponse";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/apiError";
import { protect } from "../middlewares/authMiddleware";
import { findRepositoryById } from "../repositories/repositoryRepository";
import { RepositoryVisibility } from "../models/Repository";
import { ITreeEntry } from "../interfaces/Tree";
import { ICommit } from "../interfaces/Commit";

const router: Router = express.Router();

router.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: "File size limit has been exceeded.",
    debug: false,
  })
);

/**
 * @route POST /api/content/blobs
 * @description Uploads a content blob with associated metadata.
 * @access Private (requires JWT)
 * @body multipart/form-data with a file named 'file' and a 'repositoryId' field.
 */
router.post(
  "/blobs",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const uploadedByUserId = req.user?.id;
    if (!uploadedByUserId) {
      return next(new UnauthorizedError("User not authenticated."));
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return next(new BadRequestError("No files were uploaded."));
    }

    const uploadedFile = req.files.file;
    const { repositoryId } = req.body;

    if (!repositoryId || typeof repositoryId !== "string") {
      return next(new BadRequestError("Repository ID is required."));
    }

    if (Array.isArray(uploadedFile)) {
      return next(
        new BadRequestError("Only single file uploads are supported.")
      );
    }

    const contentBuffer = uploadedFile.data;
    const originalFilename = uploadedFile.name;
    const contentType = uploadedFile.mimetype;

    if (!originalFilename || !contentType) {
      return next(
        new BadRequestError("Uploaded file must have a name and content type.")
      );
    }

    const hash = await storeBlob(
      contentBuffer,
      originalFilename,
      contentType,
      uploadedByUserId.toString(),
      repositoryId
    );
    res.status(201).json(
      successResponse("Blob uploaded successfully", {
        hash,
        size: contentBuffer.length,
        originalFilename,
        contentType,
      })
    );
  }
);

/**
 * @route GET /api/content/blobs/:hash
 * @description Retrieves a content blob by its SHA256 hash.
 * @access Public (or private depending on your VCS model)
 */
router.get(
  "/blobs/:hash",
  async (req: Request, res: Response, next: NextFunction) => {
    const { hash } = req.params;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      throw new UnauthorizedError("User not authenticated.");
    }

    if (!hash || !/^[0-9a-fA-F]{64}$/.test(hash)) {
      return next(new BadRequestError("Invalid SHA256 hash format."));
    }

    const downloadStream = await getBlob(hash);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename=${hash}`);

    downloadStream.pipe(res);

    downloadStream.on("error", (err) => {
      console.error(
        `Stream error during blob download for hash ${hash}: ${err.message}`
      );
      if (!res.headersSent) {
        next(err);
      } else {
        res.end();
      }
    });
  }
);

/**
 * @route GET /api/content/blobs/repo/:repositoryId
 * @description Retrieves a list of blobs associated with a specific repository.
 * Can optionally filter by userId (uploader).
 * @access Private (requires JWT) - Access depends on repository visibility and user permissions.
 * @queryParam userId - Optional. Filter by the user who uploaded the blob.
 */
router.get(
  "/blobs/repo/:repositoryId",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId } = req.params;
    const { userId: queryUserId } = req.query;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      throw new UnauthorizedError("User not authenticated.");
    }

    if (!repositoryId || typeof repositoryId !== "string") {
      throw new BadRequestError("Repository ID is required.");
    }

    if (queryUserId && typeof queryUserId !== "string") {
      throw new BadRequestError("Invalid userId query parameter.");
    }

    const repo = await findRepositoryById(repositoryId);
    if (!repo) {
      throw new NotFoundError(
        `Repository with ID '${repositoryId}' not found.`
      );
    }

    if (
      repo.visibility === RepositoryVisibility.PRIVATE &&
      repo.owner.toString() !== authenticatedUserId.toString()
    ) {
      new ForbiddenError(
        "Access denied to list blobs for this private repository."
      );
    }

    if (queryUserId && queryUserId !== authenticatedUserId.toString()) {
      throw new ForbiddenError(
        "You can only list your own uploaded blobs within a repository."
      );
    }

    const blobs = await getBlobsByRepositoryAndUser(
      repositoryId,
      (queryUserId as string) || authenticatedUserId.toString()
    );
    res.status(200).json(successResponse("Blobs fetched successfully", blobs));
  }
);

/**
 * @route POST /api/content/trees
 * @description Stores a tree object (directory snapshot).
 * @access Private (requires JWT)
 * @body JSON object with 'entries' (array of ITreeEntry) and 'repositoryId'.
 */
router.post(
  "/trees",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const uploadedByUserId = req.user?.id;
    if (!uploadedByUserId) {
      throw new UnauthorizedError("User not authenticated.");
    }

    const { entries, repositoryId } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestError(
        "Tree entries are required and must be an array."
      );
    }
    if (!repositoryId || typeof repositoryId !== "string") {
      throw new BadRequestError("Repository ID is required.");
    }

    for (const entry of entries) {
      if (!entry.mode || !entry.type || !entry.hash || !entry.name) {
        throw new BadRequestError(
          "Each tree entry must have mode, type, hash, and name."
        );
      }
      if (!["blob", "tree"].includes(entry.type)) {
        throw new BadRequestError(
          `Invalid entry type: ${entry.type}. Must be 'blob' or 'tree'.`
        );
      }
      if (!/^[0-9a-fA-F]{64}$/.test(entry.hash)) {
        throw new BadRequestError(
          `Invalid hash format for entry '${entry.name}'.`
        );
      }
    }

    const repo = await findRepositoryById(repositoryId);
    if (!repo) {
      throw new NotFoundError(
        `Repository with ID '${repositoryId}' not found.`
      );
    }
    if (
      repo.visibility === RepositoryVisibility.PRIVATE &&
      repo.owner.toString() !== uploadedByUserId.toString()
    ) {
      throw new ForbiddenError(
        "You do not have permission to upload trees to this repository."
      );
    }

    const treeHash = await storeTree(
      entries as ITreeEntry[],
      uploadedByUserId.toString(),
      repositoryId
    );
    res.status(201).json(
      successResponse("Tree stored successfully", {
        hash: treeHash,
        entriesCount: entries.length,
      })
    );
  }
);

/**
 * @route GET /api/content/trees/:hash
 * @description Retrieves a tree object by its SHA256 hash.
 * @access Private (requires JWT) - Access depends on repository visibility and user permissions.
 * NOTE: For a full VCS, you'd likely need to pass repositoryId to check permissions,
 * but for simplicity here, we assume if you have the tree hash, you're authorized to view it (for now).
 * A more robust check would involve traversing from a commit to its tree and then checking repo permissions.
 */
router.get(
  "/trees/:hash",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { hash } = req.params;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      throw new UnauthorizedError("User not authenticated.");
    }

    if (!hash || !/^[0-9a-fA-F]{64}$/.test(hash)) {
      throw new BadRequestError("Invalid SHA256 hash format.");
    }

    const tree = await getTree(hash);
    res.status(200).json(successResponse("Tree fetched successfully", tree));
  }
);

/**
 * @route POST /api/content/commits
 * @description Stores a commit object.
 * @access Private (requires JWT)
 * @body JSON object representing the ICommit structure.
 */
router.post(
  "/commits",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const uploadedByUserId = req.user?.id;
    if (!uploadedByUserId) {
      return next(new UnauthorizedError("User not authenticated."));
    }

    const { commit, repositoryId } = req.body;

    if (!commit || typeof commit !== "object") {
      return next(new BadRequestError("Commit object is required."));
    }
    if (!repositoryId || typeof repositoryId !== "string") {
      return next(new BadRequestError("Repository ID is required."));
    }

    const repo = await findRepositoryById(repositoryId);
    if (!repo) {
      return next(
        new NotFoundError(`Repository with ID '${repositoryId}' not found.`)
      );
    }
    if (
      repo.visibility === RepositoryVisibility.PRIVATE &&
      repo.owner.toString() !== uploadedByUserId.toString()
    ) {
      return next(
        new ForbiddenError(
          "You do not have permission to create commits for this repository."
        )
      );
    }

    const commitHash = await storeCommit(
      commit as ICommit,
      uploadedByUserId.toString(),
      repositoryId
    );
    res
      .status(201)
      .json(
        successResponse("Commit stored successfully", { hash: commitHash })
      );
  }
);

/**
 * @route GET /api/content/commits/:hash
 * @description Retrieves a commit object by its SHA256 hash.
 * @access Private (requires JWT) - Access depends on repository visibility and user permissions.
 * NOTE: For a full VCS, you'd need to pass repositoryId to check permissions,
 * but for simplicity here, we assume if you have the commit hash, you're authorized to view it (for now).
 */
router.get(
  "/commits/:hash",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    const { hash } = req.params;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      throw new UnauthorizedError("User not authenticated.");
    }

    if (!hash || !/^[0-9a-fA-F]{64}$/.test(hash)) {
      return next(new BadRequestError("Invalid SHA256 hash format."));
    }

    const commit = await getCommit(hash);
    res
      .status(200)
      .json(successResponse("Commit fetched successfully", commit));
  }
);

export default router;
