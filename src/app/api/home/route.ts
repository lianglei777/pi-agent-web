import os from "node:os";
import type { HomeResponse } from "@/contracts/system";

export const runtime = "nodejs";

export function GET() {
  const body = { home: os.homedir() } satisfies HomeResponse;
  return Response.json(body);
}

