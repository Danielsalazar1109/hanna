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

export type AppointmentDoc = InferSchemaType<typeof AppointmentSchema> & {
  _id: Types.ObjectId;
};

export const AppointmentModel =
  (mongoose.models.Appointment as mongoose.Model<AppointmentDoc>) ||
  mongoose.model<AppointmentDoc>("Appointment", AppointmentSchema);
