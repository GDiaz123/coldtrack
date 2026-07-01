import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { awsConfig, isAwsConfigured } from "@/lib/server/aws-config";

function getS3Client() {
  return new S3Client({ region: awsConfig.region });
}

export type ReportMetadata = {
  key: string;
  fileName: string;
  companyId: string;
  createdAt: string;
  sizeBytes?: number;
};

export async function uploadReport(params: {
  companyId: string;
  fileName: string;
  content: string | Buffer;
  contentType?: string;
}) {
  if (!isAwsConfigured()) {
    throw new Error("AWS_S3_NOT_CONFIGURED");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `reports/${params.companyId}/${timestamp}-${safeName}`;

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: key,
      Body: params.content,
      ContentType: params.contentType ?? "application/json",
      Metadata: {
        companyId: params.companyId,
        generatedAt: new Date().toISOString(),
      },
    })
  );

  return { key, bucket: awsConfig.s3Bucket };
}

export async function listCompanyReports(companyId: string): Promise<ReportMetadata[]> {
  if (!isAwsConfigured()) {
    throw new Error("AWS_S3_NOT_CONFIGURED");
  }

  const prefix = `reports/${companyId}/`;
  const client = getS3Client();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: awsConfig.s3Bucket,
      Prefix: prefix,
    })
  );

  return (response.Contents ?? [])
    .filter((item) => item.Key && item.Key !== prefix)
    .map((item) => ({
      key: item.Key!,
      fileName: item.Key!.replace(prefix, ""),
      companyId,
      createdAt: item.LastModified?.toISOString() ?? new Date().toISOString(),
      sizeBytes: item.Size,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReportDownloadUrl(key: string, expiresInSeconds = 300) {
  if (!isAwsConfigured()) {
    throw new Error("AWS_S3_NOT_CONFIGURED");
  }

  const client = getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function getReportContent(key: string) {
  if (!isAwsConfigured()) {
    throw new Error("AWS_S3_NOT_CONFIGURED");
  }

  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: key,
    })
  );

  return response.Body?.transformToString("utf-8") ?? "";
}
