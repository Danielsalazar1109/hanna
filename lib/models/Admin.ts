import mongoose, { type InferSchemaType, type Types } from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: false },
    isSuperAdmin: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

AdminSchema.index({ username: 1 }, { unique: true });
AdminSchema.index({ schoolId: 1 });

export type AdminDoc = InferSchemaType<typeof AdminSchema> & {
  _id: Types.ObjectId;
};

const ADMIN_MODEL_NAME = "Admin";

// In Next.js dev with HMR, mongoose models can stay registered with an old schema.
if (process.env.NODE_ENV !== "production") {
  if (mongoose.models[ADMIN_MODEL_NAME]) {
    mongoose.deleteModel(ADMIN_MODEL_NAME);
  }
}

export const AdminModel = mongoose.model<AdminDoc>(ADMIN_MODEL_NAME, AdminSchema);
