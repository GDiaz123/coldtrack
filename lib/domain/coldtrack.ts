export type CompanyStatus = "ACTIVE" | "SUSPENDED" | "TRIAL";
export type PlanCode = "STARTER" | "PRO" | "ENTERPRISE";
export type SensorStatus = "NORMAL" | "WARNING" | "CRITICAL" | "OFFLINE";
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SUPERVISOR" | "TECHNICIAN" | "AUDITOR";

export type Company = {
  id: string;
  name: string;
  ruc: string;
  status: CompanyStatus;
  plan: PlanCode;
  contactEmail: string;
  alertPhone: string | null;
  registrationKey: string | null;
  createdAt: string;
};

export type AppUser = {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "INVITED" | "DISABLED";
};

export type Plan = {
  code: PlanCode;
  name: string;
  maxSensors: number;
  priceMonthlyUsd: number;
  currency: "PEN" | "USD";
  priceLabel: string;
};

export type Sensor = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  location: string;
  productType: string;
  minTemp: number;
  maxTemp: number;
  registeredAt: string;
  active: boolean;
};

export type SensorReading = {
  sensorId: string;
  temperature: number;
  humidity: number;
  battery: number;
  signal: number;
  status: SensorStatus;
  trend: number[];
  lastSeenSeconds: number;
  updatedAt: string;
};

export type SensorWithReading = Sensor & {
  reading: SensorReading;
};

export type SystemEvent = {
  id: string;
  companyId: string;
  sensorId: string | null;
  severity: SensorStatus;
  title: string;
  detail: string;
  createdAt: string;
};

export type CompanyDashboard = {
  company: Company;
  sensors: SensorWithReading[];
  events: SystemEvent[];
  stats: {
    normal: number;
    warning: number;
    critical: number;
    offline: number;
    compliance: number;
    avgSignal: number;
    avgBattery: number;
    risk: number;
  };
  updatedAt: string;
};

export type AdminOverview = {
  companies: Company[];
  users: AppUser[];
  plans: Plan[];
  events: SystemEvent[];
  stats: {
    companies: number;
    activeCompanies: number;
    sensors: number;
    criticalSensors: number;
    monthlyRevenueUsd: number;
    avgCompliance: number;
  };
  updatedAt: string;
};

export function statusForTemperature(
  temperature: number,
  minTemp: number,
  maxTemp: number,
  signal: number
): SensorStatus {
  if (signal <= 0) return "OFFLINE";

  const tolerance = Math.max((maxTemp - minTemp) * 0.18, 0.8);
  if (temperature < minTemp - tolerance || temperature > maxTemp + tolerance) {
    return "CRITICAL";
  }
  if (temperature < minTemp || temperature > maxTemp || signal < 55) {
    return "WARNING";
  }

  return "NORMAL";
}

export function roundMetric(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
