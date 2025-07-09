import express, { Request, Response, Router, NextFunction } from "express";
import fileUpload from "express-fileupload";
import {
  storeBlob,
  getBlob,
  calculateSha256,
  getBlobsByRepositoryAndUser,
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

export default router;
