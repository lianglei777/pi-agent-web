import os from "node:os";

export const runtime = "nodejs";

export function GET() {
  return Response.json({ home: os.homedir() });
}

