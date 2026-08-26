import mongoose, { type InferSchemaType } from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

export type CounterDoc = InferSchemaType<typeof CounterSchema>;

export const CounterModel =
  (mongoose.models.Counter as mongoose.Model<CounterDoc>) ||
  mongoose.model<CounterDoc>("Counter", CounterSchema);
