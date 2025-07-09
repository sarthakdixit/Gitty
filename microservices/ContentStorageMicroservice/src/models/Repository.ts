import mongoose, { Document, Schema, Types } from "mongoose";

export enum RepositoryVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

export interface IRepository extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  owner: Types.ObjectId;
  visibility: RepositoryVisibility;
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name must be at most 100 characters long"],
      validate: {
        validator: (v: string) => /^[a-zA-Z0-9_-]+$/.test(v),
        message: (props: any) =>
          `${props.value} is not a valid repository name. Use alphanumeric, hyphens, or underscores.`,
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Repository owner is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters long"],
    },
    visibility: {
      type: String,
      enum: Object.values(RepositoryVisibility),
      default: RepositoryVisibility.PRIVATE,
      required: [true, "Visibility is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate repository names for the same owner
RepositorySchema.index({ name: 1, owner: 1 }, { unique: true });

const Repository = mongoose.model<IRepository>("Repository", RepositorySchema);

export default Repository;
