import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB, disconnectDB } from "./config/db";

const port: number = parseInt(process.env.PORT || "3000", 10);

connectDB()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(
        `Node.js Microservice (TypeScript) listening at http://localhost:${port}`
      );
      console.log(
        "To test, open your browser or use a tool like Postman/curl and go to:"
      );
    });

    const gracefulShutdown = async () => {
      console.log("Shutting down gracefully...");
      server.close(async () => {
        console.log("Express server closed.");
        await disconnectDB();
        process.exit(0);
      });

      setTimeout(() => {
        console.error("Forcing shutdown after 10 seconds.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown();
    });
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      gracefulShutdown();
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  });
