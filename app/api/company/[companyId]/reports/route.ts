import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { isAwsConfigured } from "@/lib/server/aws-config";
import { getReportDownloadUrl, listCompanyReports, uploadReport } from "@/lib/server/s3-reports";
import { logger } from "@/lib/server/logger";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;

  if (!isAwsConfigured()) {
    return Response.json({ error: "AWS_S3_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const reports = await listCompanyReports(companyId);
    const withUrls = await Promise.all(
      reports.map(async (report) => ({
        ...report,
        downloadUrl: await getReportDownloadUrl(report.key),
      }))
    );
    return Response.json(withUrls);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    logger.error("reports_list_failed", { companyId, error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const repo = await getColdtrackRepository();

  if (!(await repo.getCompany(companyId))) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  if (!isAwsConfigured()) {
    return Response.json({ error: "AWS_S3_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const dashboard = await repo.getCompanyDashboard(companyId);
    if (!dashboard) {
      return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      company: dashboard.company,
      stats: dashboard.stats,
      sensors: dashboard.sensors.map((s) => ({
        id: s.id,
        name: s.name,
        location: s.location,
        status: s.reading.status,
        temperature: s.reading.temperature,
        humidity: s.reading.humidity,
        battery: s.reading.battery,
        signal: s.reading.signal,
      })),
      events: dashboard.events,
    };

    const fileName = `auditoria-${companyId}.json`;
    const uploaded = await uploadReport({
      companyId,
      fileName,
      content: JSON.stringify(report, null, 2),
      contentType: "application/json",
    });

    logger.info("report_uploaded", { companyId, key: uploaded.key });

    return Response.json(
      {
        ok: true,
        key: uploaded.key,
        bucket: uploaded.bucket,
        downloadUrl: await getReportDownloadUrl(uploaded.key),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    logger.error("report_upload_failed", { companyId, error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
