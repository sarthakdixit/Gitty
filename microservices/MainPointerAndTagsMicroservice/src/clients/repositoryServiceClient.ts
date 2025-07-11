import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "../errors/apiError";
import { IRepositoryInfo } from "../interfaces/RepositoryInfo";

const getRepositoryDetailsFromService = async (
  repositoryId: string,
  token: string
): Promise<IRepositoryInfo> => {
  const repoServiceUrl = process.env.REPOSITORY_SERVICE_URL;
  if (!repoServiceUrl) {
    throw new InternalServerError("REPOSITORY_SERVICE_URL is not configured.");
  }

  const response = await fetch(`${repoServiceUrl}/api/repos/${repositoryId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (response.status === 404) {
    throw new NotFoundError(
      data.message ||
        `Repository with ID '${repositoryId}' not found in Repository Service.`
    );
  }
  if (response.status === 403) {
    throw new ForbiddenError(
      data.message ||
        "Access denied to repository details in Repository Service."
    );
  }
  if (!response.ok) {
    throw new InternalServerError(
      data.message ||
        `Failed to fetch repository details from Repository Service: ${response.status}`
    );
  }

  return data.data as IRepositoryInfo;
};

export { getRepositoryDetailsFromService };
