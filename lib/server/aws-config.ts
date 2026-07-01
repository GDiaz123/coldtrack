export const awsConfig = {
  region: process.env.AWS_REGION ?? "us-east-1",
  s3Bucket: process.env.AWS_S3_BUCKET ?? "",
  rdsHost: process.env.RDS_HOST ?? "",
  rdsPort: Number(process.env.RDS_PORT ?? 5432),
  rdsDatabase: process.env.RDS_DATABASE ?? "postgres",
  rdsUser: process.env.RDS_USER ?? "postgres",
  rdsIamAuth: process.env.RDS_IAM_AUTH === "true",
};

export function isAwsConfigured() {
  return Boolean(awsConfig.s3Bucket && awsConfig.region);
}

export function isRdsIamConfigured() {
  return awsConfig.rdsIamAuth && Boolean(awsConfig.rdsHost);
}
