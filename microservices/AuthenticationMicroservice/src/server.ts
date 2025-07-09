import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { InternalServerError } from "./erros/apiError";

const port: number = parseInt(process.env.PORT || "3000", 10);

process.on(
  "unhandledRejection",
  (reason: Error | any, promise: Promise<any>) => {
    console.error(
      "[UNHANDLED REJECTION] Unhandled Rejection at:",
      promise,
      "reason:",
      reason
    );
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const internalError = new InternalServerError(
      `Unhandled Rejection: ${error.message}`,
      false
    );
    console.error(`[UNHANDLED REJECTION] Stack: ${internalError.stack}`);
    gracefulShutdown(1);
  }
);

process.on("uncaughtException", (error: Error) => {
  console.error("[UNCAUGHT EXCEPTION] Uncaught Exception:", error);
  const internalError = new InternalServerError(
    `Uncaught Exception: ${error.message}`,
    false
  );
  console.error(`[UNCAUGHT EXCEPTION] Stack: ${internalError.stack}`);
  gracefulShutdown(1);
});

const gracefulShutdown = async (exitCode: number = 0) => {
  console.log("Initiating graceful shutdown...");
  if (serverInstance) {
    serverInstance.close(async () => {
      console.log("Express server closed.");
      await disconnectDB();
      console.log(`Exiting process with code: ${exitCode}`);
      process.exit(exitCode);
    });
  } else {
    await disconnectDB();
    console.log(`Exiting process with code: ${exitCode}`);
    process.exit(exitCode);
  }

  setTimeout(() => {
    console.error("Forcing shutdown after 10 seconds.");
    process.exit(1);
  }, 10000);
};

let serverInstance: any;

connectDB()
  .then(() => {
    serverInstance = app.listen(port, () => {
      console.log(
        `Node.js Microservice (TypeScript) listening at http://localhost:${port}`
      );
      console.log(
        "To test, open your browser or use a tool like Postman/curl and go to:"
      );
    });

    process.on("SIGTERM", () => gracefulShutdown(0));
    process.on("SIGINT", () => gracefulShutdown(0));
  })
  .catch((error) => {
    console.error("Failed to connect to database, exiting:", error);
    process.exit(1);
  });
