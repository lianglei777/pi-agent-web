export const runtime = "nodejs";

export function GET() {
  return Response.json({ cwd: process.cwd() });
}

