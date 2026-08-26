import mongoose, { type InferSchemaType, type Types } from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

AdminSchema.index({ username: 1 }, { unique: true });

export type AdminDoc = InferSchemaType<typeof AdminSchema> & {
  _id: Types.ObjectId;
};

export const AdminModel =
  (mongoose.models.Admin as mongoose.Model<AdminDoc>) ||
  mongoose.model<AdminDoc>("Admin", AdminSchema);
