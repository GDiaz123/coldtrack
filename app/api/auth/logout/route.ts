import { cookies } from "next/headers";
import { logger } from "@/lib/server/logger";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("token");

  logger.info("user_logged_out");
  return Response.json({ ok: true });
}
