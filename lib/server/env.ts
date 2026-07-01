export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appName: process.env.APP_NAME ?? "COLDTRACK AI+",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultCompanyId: process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ?? "empresa-a",
  logLevel: process.env.LOG_LEVEL ?? "info",
  sensorProvider: process.env.SENSOR_PROVIDER ?? "simulated",
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
};
