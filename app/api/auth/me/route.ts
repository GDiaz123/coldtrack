import { getCurrentUser } from "@/lib/server/request-auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return Response.json({ ok: true, user });
}
