import mongoose, { type InferSchemaType, type Types } from "mongoose";

const SchoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

SchoolSchema.index({ name: 1 }, { unique: true });
SchoolSchema.index({ enabled: 1, sortOrder: 1, name: 1 });

export type SchoolDoc = InferSchemaType<typeof SchoolSchema> & {
  _id: Types.ObjectId;
};

const SCHOOL_MODEL_NAME = "School";

// In Next.js dev with HMR, mongoose models can stay registered with an old schema.
if (process.env.NODE_ENV !== "production") {
  if (mongoose.models[SCHOOL_MODEL_NAME]) {
    mongoose.deleteModel(SCHOOL_MODEL_NAME);
  }
}

export const SchoolModel = mongoose.model<SchoolDoc>(SCHOOL_MODEL_NAME, SchoolSchema);
