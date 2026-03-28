import { NextResponse } from "next/server";

function normalizeEvents(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.events)) {
    return payload.events;
  }

  if (payload && typeof payload === "object") {
    return [payload];
  }

  return [];
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const events = normalizeEvents(payload).slice(-25);

    if (events.length > 0) {
      console.info("[telemetry] received", {
        count: events.length,
        latest: events[events.length - 1]?.name || "unknown",
      });
    }

    return NextResponse.json({ ok: true, accepted: events.length });
  } catch (error) {
    console.error("Telemetry ingest error:", error);
    return NextResponse.json({ ok: false, error: "invalid_telemetry_payload" }, { status: 400 });
  }
}
