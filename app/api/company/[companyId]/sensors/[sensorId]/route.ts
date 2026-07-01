import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string; sensorId: string }> }
) {
  const { companyId, sensorId } = await params;
  const auth = await requireAuth({ companyId, companyRoles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"] });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();

  const sensor = await repo.getSensor(sensorId);
  if (!sensor || sensor.companyId !== companyId) {
    return Response.json({ error: "SENSOR_NOT_FOUND" }, { status: 404 });
  }

  const body = await request.json();
  const updated = await repo.updateSensor(sensorId, body);
  logger.info("sensor_updated", { companyId, sensorId });
  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string; sensorId: string }> }
) {
  const { companyId, sensorId } = await params;
  const auth = await requireAuth({ companyId, companyRoles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"] });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();

  const sensor = await repo.getSensor(sensorId);
  if (!sensor || sensor.companyId !== companyId) {
    return Response.json({ error: "SENSOR_NOT_FOUND" }, { status: 404 });
  }

  await repo.deleteSensor(sensorId);
  logger.info("sensor_deleted", { companyId, sensorId });
  return Response.json({ ok: true });
}
