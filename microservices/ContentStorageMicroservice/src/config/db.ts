import mongoose from "mongoose";
import { GridFSBucket, Db } from "mongodb";

let gridFSBucket: GridFSBucket | null = null;

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    const dbInstance: Db | undefined = conn.connection.db;

    if (!dbInstance) {
      throw new Error("MongoDB Db instance is not available after connection.");
    }

    gridFSBucket = new GridFSBucket(dbInstance, {
      bucketName: "vcs_content",
    });
    console.log("GridFSBucket initialized for bucketName: vcs_content");

    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected!");
      if (!gridFSBucket) {
        gridFSBucket = new GridFSBucket(dbInstance, {
          bucketName: "vcs_content",
        });
        console.log("GridFSBucket re-initialized on reconnection.");
      }
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected successfully.");
    gridFSBucket = null;
  } catch (error: any) {
    console.error("Error disconnecting from MongoDB:", error.message);
    process.exit(1);
  }
};

const getGridFSBucket = (): GridFSBucket | null => gridFSBucket;

export { connectDB, disconnectDB, getGridFSBucket };
