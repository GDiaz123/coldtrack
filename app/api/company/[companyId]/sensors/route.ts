import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const repo = await getColdtrackRepository();

  if (!(await repo.getCompany(companyId))) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  const sensorList = await repo.listSensors(companyId);
  return Response.json(sensorList);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const repo = await getColdtrackRepository();

  if (!(await repo.getCompany(companyId))) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { code, name, location, productType, minTemp, maxTemp } = body;

    if (!code || !name || !location || !productType || minTemp == null || maxTemp == null) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const sensor = await repo.createSensor({
      companyId,
      code,
      name,
      location,
      productType,
      minTemp: Number(minTemp),
      maxTemp: Number(maxTemp),
    });

    logger.info("sensor_created", { companyId, sensorId: sensor.id, code });
    return Response.json(sensor, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    logger.error("sensor_create_failed", { companyId, error: message });
    return Response.json({ error: message }, { status: 400 });
  }
}
