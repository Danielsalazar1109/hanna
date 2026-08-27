import mongoose, { type InferSchemaType, type Types } from "mongoose";

export const APPOINTMENT_STATUSES = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "No Show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

const AppointmentSchema = new mongoose.Schema(
  {
    ticketSeq: { type: Number, required: true },
    ticketNumber: { type: String, required: true },
    studentName: { type: String, required: true },
    studentId: { type: String, required: true },
    studentNumber: { type: String, required: true },
    serviceType: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: APPOINTMENT_STATUSES,
      default: "Scheduled",
    },
  },
  { timestamps: true }
);

AppointmentSchema.index({ studentId: 1 });
AppointmentSchema.index({ ticketNumber: 1 }, { unique: true });
AppointmentSchema.index({ ticketSeq: 1 });
AppointmentSchema.index({ status: 1 });
AppointmentSchema.index({ serviceType: 1 });

export type AppointmentDoc = InferSchemaType<typeof AppointmentSchema> & {
  _id: Types.ObjectId;
};

const APPOINTMENT_MODEL_NAME = "Appointment";

// In Next.js dev with HMR, mongoose models can stay registered with an old schema.
// That can cause new fields (like studentNumber) to be silently dropped.
if (process.env.NODE_ENV !== "production") {
  if (mongoose.models[APPOINTMENT_MODEL_NAME]) {
    mongoose.deleteModel(APPOINTMENT_MODEL_NAME);
  }
}

export const AppointmentModel = mongoose.model<AppointmentDoc>(
  APPOINTMENT_MODEL_NAME,
  AppointmentSchema
);
