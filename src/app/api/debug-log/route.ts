import { NextResponse } from "next/server";
import fs from "fs";

export const runtime = "nodejs";

const LOG = "/tmp/sprachdost-voice-debug.log";

/** Voice-test page posts its browser diagnostics here; we store them in a file we can read. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const line = `\n=== ${new Date().toISOString()} ===\n${JSON.stringify(body, null, 2)}\n`;
    fs.appendFileSync(LOG, line);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    const content = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf-8") : "(no logs yet)";
    return new NextResponse(content, { headers: { "Content-Type": "text/plain" } });
  } catch {
    return new NextResponse("(error)", { status: 500 });
  }
}
