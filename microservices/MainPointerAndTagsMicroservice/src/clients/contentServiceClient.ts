import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "../errors/apiError";
import { ICommit } from "../interfaces/Commit";

const getContentServiceBaseUrl = () => {
  const url = process.env.CONTENT_SERVICE_URL;
  if (!url) {
    throw new InternalServerError(
      "CONTENT_SERVICE_URL is not configured in environment variables."
    );
  }
  return url;
};

const checkCommitExistenceInContentService = async (
  commitHash: string,
  token: string
): Promise<boolean> => {
  const contentServiceUrl = getContentServiceBaseUrl();
  const response = await fetch(
    `${contentServiceUrl}/api/content/commits/${commitHash}`,
    {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.status === 200) {
    return true;
  } else if (response.status === 404) {
    return false;
  } else if (response.status === 400) {
    const errorData = await response.json();
    throw new BadRequestError(
      errorData.message || `Invalid commit hash format sent to Content Service.`
    );
  } else {
    const errorData = await response.json();
    throw new InternalServerError(
      errorData.message ||
        `Failed to check commit existence in Content Service: ${response.status}`
    );
  }
};

const getCommitFromContentService = async (
  commitHash: string,
  token: string
): Promise<ICommit> => {
  const contentServiceUrl = getContentServiceBaseUrl();

  const response = await fetch(
    `${contentServiceUrl}/api/content/commits/${commitHash}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (response.status === 404) {
    throw new NotFoundError(
      data.message ||
        `Commit with hash '${commitHash}' not found in Content Service.`
    );
  }
  if (response.status === 400) {
    throw new BadRequestError(
      data.message ||
        `Invalid commit hash or content type from Content Service.`
    );
  }
  if (!response.ok) {
    throw new InternalServerError(
      data.message ||
        `Failed to retrieve commit from Content Service: ${response.status}`
    );
  }

  return data.data as ICommit;
};

export { checkCommitExistenceInContentService, getCommitFromContentService };
