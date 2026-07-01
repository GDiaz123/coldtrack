import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const repo = await getColdtrackRepository();

  if (!(await repo.getCompany(companyId))) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  logger.info("sse_stream_opened", { companyId });

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

      const initial = await repo.getCompanyDashboard(companyId);
      await send({ type: "snapshot", payload: initial });

      const interval = setInterval(() => {
        void (async () => {
          if (cancelled) {
            clearInterval(interval);
            return;
          }
          try {
            await repo.tick(companyId);
            const dashboard = await repo.getCompanyDashboard(companyId);
            await send({ type: "update", payload: dashboard });
          } catch {
            cancelled = true;
            clearInterval(interval);
          }
        })();
      }, 3000);

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
      logger.info("sse_stream_closed", { companyId });
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
