import mongoose, { type InferSchemaType, type Types } from "mongoose";

const ServiceTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

ServiceTypeSchema.index({ name: 1 }, { unique: true });
ServiceTypeSchema.index({ enabled: 1, sortOrder: 1, name: 1 });

export type ServiceTypeDoc = InferSchemaType<typeof ServiceTypeSchema> & {
  _id: Types.ObjectId;
};

const SERVICE_TYPE_MODEL_NAME = "ServiceType";

// In Next.js dev with HMR, mongoose models can stay registered with an old schema.
if (process.env.NODE_ENV !== "production") {
  if (mongoose.models[SERVICE_TYPE_MODEL_NAME]) {
    mongoose.deleteModel(SERVICE_TYPE_MODEL_NAME);
  }
}

export const ServiceTypeModel = mongoose.model<ServiceTypeDoc>(
  SERVICE_TYPE_MODEL_NAME,
  ServiceTypeSchema
);
