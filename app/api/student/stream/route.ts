import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppointmentDto = {
  id: string;
  ticketSeq: number;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  studentNumber: string;
  school: string;
  serviceType: string;
  status: string;
  createdAt: string;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  etaUntil?: string;
};

type AppointmentStreamDoc = {
  _id: unknown;
  ticketSeq: number;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  studentNumber: string;
  schoolId?: unknown;
  school: string;
  serviceType: string;
  status: string;
  createdAt: Date;
  etaUntil?: Date;
};

async function computeEstimate(args: {
  schoolId: unknown;
  serviceType: string;
  createdAt: Date;
}): Promise<{ queuePosition: number; estimatedWaitMinutes: number }> {
  const queuePosition = await AppointmentModel.countDocuments({
    schoolId: args.schoolId,
    serviceType: args.serviceType,
    status: "Scheduled",
    createdAt: { $lte: args.createdAt },
  });

  return { queuePosition, estimatedWaitMinutes: queuePosition * 15 };
}

function toDto(doc: {
  _id: unknown;
  ticketSeq: number;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  studentNumber: string;
  school: string;
  serviceType: string;
  status: string;
  createdAt: Date;
  etaUntil?: Date;
}): AppointmentDto {
  return {
    id: String(doc._id),
    ticketSeq: doc.ticketSeq,
    ticketNumber: doc.ticketNumber,
    studentName: doc.studentName,
    studentId: doc.studentId,
    studentNumber: doc.studentNumber,
    school: doc.school,
    serviceType: doc.serviceType,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    etaUntil: doc.etaUntil ? doc.etaUntil.toISOString() : undefined,
  };
}

async function buildDtoFromDoc(doc: AppointmentStreamDoc): Promise<AppointmentDto> {
  const dto = toDto({
    _id: doc._id,
    ticketSeq: doc.ticketSeq,
    ticketNumber: doc.ticketNumber,
    studentName: doc.studentName,
    studentId: doc.studentId,
    studentNumber: doc.studentNumber,
    school: doc.school,
    serviceType: doc.serviceType,
    status: doc.status,
    createdAt: doc.createdAt,
    etaUntil: doc.etaUntil,
  });

  if (doc.status === "Scheduled" && doc.schoolId) {
    const { queuePosition, estimatedWaitMinutes } = await computeEstimate({
      schoolId: doc.schoolId,
      serviceType: doc.serviceType,
      createdAt: doc.createdAt,
    });

    dto.queuePosition = queuePosition;
    dto.estimatedWaitMinutes = estimatedWaitMinutes;

    // If admin didn't explicitly set an ETA, derive one.
    if (!dto.etaUntil) {
      dto.etaUntil = new Date(
        doc.createdAt.getTime() + estimatedWaitMinutes * 60 * 1000
      ).toISOString();
    }
  }

  return dto;
}

function sseEvent(encoder: TextEncoder, event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseComment(encoder: TextEncoder, comment: string): Uint8Array {
  return encoder.encode(`: ${comment}\n\n`);
}

export async function GET(req: Request) {
  await connectMongo();

  const { searchParams } = new URL(req.url);
  const studentId = (searchParams.get("studentId") ?? "").trim();
  if (!studentId) {
    return new Response(JSON.stringify({ error: "studentId is required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  let changeStream: ReturnType<typeof AppointmentModel.watch> | null = null;
  let closed = false;

  let trackedAppointmentId: string | null = null;
  let trackedAppointmentObjectId: unknown | null = null;

  let refreshing = false;
  let refreshQueued = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = async () => {
        if (closed) return;
        closed = true;
        try {
          await changeStream?.close();
        } catch {
          // ignore
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(sseComment(encoder, "ping"));
      }, 15000);

      const sendErrorAndClose = (err: unknown) => {
        if (closed) return;
        controller.enqueue(sseEvent(encoder, "error", { error: String(err) }));
        clearInterval(heartbeat);
        void close();
      };

      const refreshAndSend = async () => {
        if (!trackedAppointmentId) return;

        const latest = (await AppointmentModel.findById(trackedAppointmentId).lean()) as
          | AppointmentStreamDoc
          | null;

        if (!latest) {
          controller.enqueue(sseEvent(encoder, "appointment", null));
          return;
        }

        const dto = await buildDtoFromDoc(latest);
        controller.enqueue(sseEvent(encoder, "appointment", dto));

        if (dto.status !== "Scheduled") {
          controller.enqueue(sseEvent(encoder, "done", { ok: true }));
          clearInterval(heartbeat);
          await close();
        }
      };

      const requestRefresh = () => {
        if (closed) return;
        if (refreshing) {
          refreshQueued = true;
          return;
        }

        refreshing = true;
        void refreshAndSend()
          .catch(sendErrorAndClose)
          .finally(() => {
            refreshing = false;
            if (refreshQueued) {
              refreshQueued = false;
              requestRefresh();
            }
          });
      };

      // Initial snapshot
      queueMicrotask(() => {
        void (async () => {
          const doc = (await AppointmentModel.findOne({
            studentId,
            status: "Scheduled",
          })
            .sort({ createdAt: -1 })
            .lean()) as AppointmentStreamDoc | null;

          if (!doc) {
            controller.enqueue(sseEvent(encoder, "appointment", null));
            return;
          }

          trackedAppointmentId = String(doc._id);
          trackedAppointmentObjectId = doc._id;

          await refreshAndSend();

          // Manual-only: only watch the student's own appointment (and its deletion).
          changeStream = AppointmentModel.watch(
            [
              {
                $match: {
                  operationType: { $in: ["insert", "update", "replace", "delete"] },
                  $or: [
                    { "fullDocument.studentId": studentId },
                    trackedAppointmentObjectId
                      ? { "documentKey._id": trackedAppointmentObjectId }
                      : { "fullDocument.studentId": studentId },
                  ],
                },
              },
            ],
            { fullDocument: "updateLookup" }
          );

          changeStream.on("change", (change: unknown) => {
            if (closed) return;

            const op = (change as { operationType?: unknown } | null)?.operationType;
            if (op === "delete") {
              requestRefresh();
              return;
            }

            const fullDoc = (change as { fullDocument?: unknown } | null)?.fullDocument;
            if (!fullDoc) return;

            const docStudentId = (fullDoc as { studentId?: unknown } | null)?.studentId;
            const docId = (fullDoc as { _id?: unknown } | null)?._id;

            const isSameStudent = docStudentId === studentId;
            const isTrackedAppointment =
              trackedAppointmentId && String(docId) === trackedAppointmentId;

            if (isSameStudent || isTrackedAppointment) {
              requestRefresh();
            }
          });

          changeStream.on("error", sendErrorAndClose);
        })().catch(sendErrorAndClose);
      });

      // Clean up when the client disconnects
      return () => {
        clearInterval(heartbeat);
        void close();
      };
    },
    cancel() {
      closed = true;
      try {
        void changeStream?.close();
      } catch {
        // ignore
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
