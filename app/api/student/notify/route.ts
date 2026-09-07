import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D+/g, "")}`;
  }
  const digits = trimmed.replace(/\D+/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

function isPlausiblePhone(raw: string): boolean {
  const normalized = normalizePhone(raw);
  const digits = normalized.startsWith("+") ? normalized.slice(1) : normalized;
  if (!/^\d{10,15}$/.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
}

function twilioAuthHeader(args: { accountSid: string; authToken: string }): string {
  const raw = `${args.accountSid}:${args.authToken}`;
  // btoa isn't available in node; use Buffer.
  const b64 = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${b64}`;
}

async function sendTwilioSms(args: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const from = process.env.TWILIO_FROM_NUMBER ?? "";

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
    );
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const form = new URLSearchParams();
  form.set("To", args.to);
  form.set("From", from);
  form.set("Body", args.body);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: twilioAuthHeader({ accountSid, authToken }),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg = (data as { message?: unknown } | null)?.message;
    throw new Error(typeof msg === "string" ? msg : `Twilio error (${res.status}).`);
  }

  return data;
}

export async function POST(req: Request) {
  await connectMongo();

  const body = (await req.json().catch(() => null)) as
    | {
        appointmentId?: unknown;
      }
    | null;

  const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId.trim() : "";
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId is required." }, { status: 400 });
  }

  const appt = await AppointmentModel.findById(appointmentId).lean();
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  if (appt.status !== "Scheduled") {
    return NextResponse.json({ error: "Appointment is no longer scheduled." }, { status: 400 });
  }

  const to = normalizePhone(appt.studentNumber);
  if (!isPlausiblePhone(to)) {
    return NextResponse.json({ error: "Stored phone number is invalid." }, { status: 400 });
  }

  // Twilio expects E.164. If the stored value isn't +..., we default to +1.
  const defaultCallingCode = (process.env.DEFAULT_COUNTRY_CALLING_CODE ?? "63").replace(/\D+/g, "");

  const e164 = (() => {
    if (to.startsWith("+")) return to;

    // If the user already typed the calling code (e.g. 63xxxxxxxxx), avoid double-prefix.
    if (to.startsWith(defaultCallingCode)) {
      return `+${to}`;
    }
    return `+${defaultCallingCode}${to}`;
  })();

  const smsBody = `SMARTQUEUE: It's your turn. Ticket ${appt.ticketNumber}.`;

  try {
    await sendTwilioSms({ to: e164, body: smsBody });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
