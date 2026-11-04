import { NextResponse } from "next/server";
import { emailSessionOk } from "@/lib/email/auth";
import { subscribersToCsv } from "@/lib/email/csv";
import { loadSubscribers } from "@/lib/email/store";
import { osJson } from "@/lib/os/response";
import { PRIVATE_HEADERS } from "@/lib/os/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await emailSessionOk())) return osJson({ error: "Unauthorized" }, 401);
  const people = await loadSubscribers();
  const res = new NextResponse(subscribersToCsv(people.rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscribers.csv"',
    },
  });
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) res.headers.set(key, value);
  return res;
}
