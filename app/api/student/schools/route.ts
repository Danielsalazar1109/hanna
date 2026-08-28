import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { SchoolModel } from "@/lib/models/School";

export const runtime = "nodejs";

export async function GET() {
  await connectMongo();

  const items = await SchoolModel.find({ enabled: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return NextResponse.json({
    items: items.map((i) => ({
      id: String(i._id),
      name: i.name,
      sortOrder: i.sortOrder,
    })),
  });
}
