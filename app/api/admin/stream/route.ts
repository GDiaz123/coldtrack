import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();

  logger.info("admin_sse_stream_opened");

  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async (data: unknown) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cancelled = true;
        }
      };

      const initial = await repo.getAdminOverview();
      await send({ type: "snapshot", payload: initial });

      const interval = setInterval(() => {
        void (async () => {
          if (cancelled) {
            clearInterval(interval);
            return;
          }
          try {
            const overview = await repo.getAdminOverview();
            await send({ type: "update", payload: overview });
          } catch {
            cancelled = true;
            clearInterval(interval);
          }
        })();
      }, 4000);

      const ping = setInterval(() => {
        if (cancelled) {
          clearInterval(ping);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cancelled = true;
          clearInterval(ping);
        }
      }, 15000);
    },

    cancel() {
      cancelled = true;
      logger.info("admin_sse_stream_closed");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
