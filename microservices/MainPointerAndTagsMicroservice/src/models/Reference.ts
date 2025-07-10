import mongoose, { Document, Schema, Types } from "mongoose";

export enum ReferenceType {
  MAIN = "main",
  TAG = "tag",
}

export interface IReference extends Document {
  _id: Types.ObjectId;
  repository: Types.ObjectId; 
  type: ReferenceType; 
  name: string; 
  commitHash: string; 
  createdAt: Date;
  updatedAt: Date;
}

const ReferenceSchema: Schema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: [true, "Repository ID is required for a reference"],
    },
    type: {
      type: String,
      enum: Object.values(ReferenceType),
      required: [true, "Reference type is required"],
    },
    name: {
      type: String,
      required: [true, "Reference name is required"],
      trim: true,
      minlength: [1, "Reference name cannot be empty"],
      maxlength: [100, "Reference name cannot exceed 100 characters"],
      validate: {
        validator: (v: string) => /^[a-zA-Z0-9_.-]+$/.test(v),
        message: (props: any) =>
          `${props.value} is not a valid reference name.`,
      },
    },
    commitHash: {
      type: String,
      required: [true, "Commit hash is required for a reference"],
      match: [/^[0-9a-fA-F]{64}$/, "Invalid SHA256 commit hash format"], 
    },
  },
  {
    timestamps: true,
  }
);

ReferenceSchema.index({ repository: 1, type: 1, name: 1 }, { unique: true });

const Reference = mongoose.model<IReference>("Reference", ReferenceSchema);

export default Reference;
