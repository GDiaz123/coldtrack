import {
  type AdminOverview,
  type AppUser,
  type Company,
  type CompanyDashboard,
  type Plan,
  type Sensor,
  type SensorReading,
  type SensorStatus,
  type SensorWithReading,
  type SystemEvent,
  roundMetric,
  statusForTemperature,
} from "@/lib/domain/coldtrack";
import { getPrisma } from "@/lib/server/db";
import { ensureDefaultPlans } from "@/lib/server/default-plans";
import type { Prisma } from "@/app/generated/prisma/client";

type SimulationState = {
  drift: number;
  offlineTicks: number;
  targetOffset: number;
};

function stableNoise(seed: string, scale: number) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return ((hash / 9973) * 2 - 1) * scale;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function countStatuses(sensorList: SensorWithReading[]) {
  return {
    normal: sensorList.filter((s) => s.reading.status === "NORMAL").length,
    warning: sensorList.filter((s) => s.reading.status === "WARNING").length,
    critical: sensorList.filter((s) => s.reading.status === "CRITICAL").length,
    offline: sensorList.filter((s) => s.reading.status === "OFFLINE").length,
  };
}

function initialReading(s: Sensor): SensorReading {
  const midpoint = (s.minTemp + s.maxTemp) / 2;
  const temperature = roundMetric(midpoint + stableNoise(s.id, 1.2));
  const signal = Math.round(82 + stableNoise(`${s.id}-signal`, 8));

  return {
    sensorId: s.id,
    temperature,
    humidity: Math.round(45 + stableNoise(`${s.id}-humidity`, 7)),
    battery: Math.round(82 + stableNoise(`${s.id}-battery`, 11)),
    signal,
    status: statusForTemperature(temperature, s.minTemp, s.maxTemp, signal),
    trend: Array.from({ length: 18 }, (_, index) =>
      roundMetric(temperature + Math.sin(index / 2.2) * 0.25)
    ),
    lastSeenSeconds: 0,
    updatedAt: new Date().toISOString(),
  };
}

function mapCompany(row: {
  id: string;
  name: string;
  ruc: string;
  status: string;
  plan: string;
  contactEmail: string;
  alertPhone?: string | null;
  registrationKey?: string | null;
  createdAt: Date;
}): Company {
  return {
    id: row.id,
    name: row.name,
    ruc: row.ruc,
    status: row.status as Company["status"],
    plan: row.plan as Company["plan"],
    contactEmail: row.contactEmail,
    alertPhone: row.alertPhone ?? null,
    registrationKey: row.registrationKey ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function generateRegistrationKey(name: string) {
  const prefix =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "EMPRESA";
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

function priceLabel(price: number, currency?: string | null) {
  return currency === "PEN" ? `S/ ${price}` : `$${price}`;
}

function mapUser(row: {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
}): AppUser {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    email: row.email,
    role: row.role as AppUser["role"],
    status: row.status as AppUser["status"],
  };
}

function mapSensor(row: {
  id: string;
  companyId: string;
  code: string;
  name: string;
  location: string;
  productType: string;
  minTemp: number;
  maxTemp: number;
  registeredAt: Date;
  active: boolean;
}): Sensor {
  return {
    id: row.id,
    companyId: row.companyId,
    code: row.code,
    name: row.name,
    location: row.location,
    productType: row.productType,
    minTemp: row.minTemp,
    maxTemp: row.maxTemp,
    registeredAt: row.registeredAt.toISOString(),
    active: row.active,
  };
}

export class PrismaColdtrackRepository {
  private readonly readings = new Map<string, SensorReading>();
  private readonly simulation = new Map<string, SimulationState>();
  private events: SystemEvent[] = [];
  private lastTick = Date.now();
  private sensorCache: Sensor[] = [];
  private cacheLoaded = false;

  private async ensureSensorCache() {
    if (this.cacheLoaded) return;
    const rows = await (await getPrisma()).sensor.findMany();
    this.sensorCache = rows.map(mapSensor);
    for (const s of this.sensorCache) {
      if (!this.readings.has(s.id)) {
        this.readings.set(s.id, initialReading(s));
      }
    }
    this.cacheLoaded = true;
  }

  async tick(companyId?: string) {
    await this.ensureSensorCache();
    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.min(10, (now - this.lastTick) / 1000 || 3));
    this.lastTick = now;

    for (const s of this.sensorCache) {
      if (companyId && s.companyId !== companyId) continue;
      if (!s.active) continue;

      const previous = this.getReading(s);
      const sim = this.simulation.get(s.id) ?? {
        drift: 0,
        offlineTicks: 0,
        targetOffset: stableNoise(`${s.id}-target`, 0.4),
      };

      if (Math.random() < 0.015 && sim.offlineTicks === 0) {
        sim.offlineTicks = 2 + Math.floor(Math.random() * 4);
      }

      if (Math.random() < 0.04) {
        sim.targetOffset = clamp(sim.targetOffset + (Math.random() - 0.5) * 0.45, -1.4, 1.4);
      }

      const midpoint = (s.minTemp + s.maxTemp) / 2;
      const target = midpoint + sim.targetOffset;
      sim.drift = sim.drift * 0.88 + (Math.random() - 0.5) * 0.05;

      const recoveredSignal = clamp(previous.signal + 2 + Math.random() * 4, 55, 99);
      const signal =
        sim.offlineTicks > 0
          ? 0
          : Math.round(clamp(recoveredSignal + (Math.random() - 0.5) * 3, 48, 99));
      const temperature =
        signal === 0
          ? previous.temperature
          : roundMetric(previous.temperature + (target - previous.temperature) * 0.08 + sim.drift);
      const humidity =
        signal === 0
          ? previous.humidity
          : Math.round(clamp(previous.humidity + (Math.random() - 0.5) * 1.4, 36, 62));
      const battery = roundMetric(
        clamp(previous.battery - elapsedSeconds * (0.0015 + Math.random() * 0.001), 8, 100)
      );

      if (sim.offlineTicks > 0) sim.offlineTicks -= 1;

      const status = statusForTemperature(temperature, s.minTemp, s.maxTemp, signal);
      const reading: SensorReading = {
        sensorId: s.id,
        temperature,
        humidity,
        battery,
        signal,
        status,
        trend: [...previous.trend.slice(1), temperature],
        lastSeenSeconds:
          signal === 0 ? previous.lastSeenSeconds + Math.round(elapsedSeconds) : Math.round(elapsedSeconds),
        updatedAt: new Date().toISOString(),
      };

      this.readings.set(s.id, reading);
      this.simulation.set(s.id, sim);
      this.addEventIfNeeded(s, previous.status, reading);
    }
  }

  getReading(s: Sensor) {
    const existing = this.readings.get(s.id);
    if (existing) return existing;
    const created = initialReading(s);
    this.readings.set(s.id, created);
    return created;
  }

  private addEventIfNeeded(s: Sensor, previousStatus: SensorStatus, reading: SensorReading) {
    const changed = previousStatus !== reading.status;
    const rareCritical =
      reading.status === "CRITICAL" && Math.random() < 0.22 && previousStatus === "WARNING";
    const recovered = previousStatus !== "NORMAL" && reading.status === "NORMAL";

    if (!changed && !rareCritical) return;

    const title =
      reading.status === "OFFLINE"
        ? "Sensor sin conexión"
        : reading.status === "CRITICAL"
          ? "Desviación crítica detectada"
          : reading.status === "WARNING"
            ? "Sensor en vigilancia preventiva"
            : recovered
              ? "Sensor recuperado"
              : "Lectura actualizada";

    this.events.unshift({
      id: `${Date.now()}-${s.id}`,
      companyId: s.companyId,
      sensorId: s.id,
      severity: reading.status,
      title,
      detail: `${s.name} reporta ${reading.temperature.toFixed(1)}°C en ${s.location}.`,
      createdAt: new Date().toISOString(),
    });
    this.events = this.events.slice(0, 200);
  }

  async getAdminOverview(): Promise<AdminOverview> {
    await this.tick();
    const [companies, users, plans] = await Promise.all([
      (await getPrisma()).company.findMany({ orderBy: { createdAt: "desc" } }),
      (await getPrisma()).user.findMany({ orderBy: { name: "asc" } }),
      (await getPrisma()).plan.findMany(),
    ]);

    const dashboards = (
      await Promise.all(companies.map((c) => this.getCompanyDashboard(c.id)))
    ).filter((d): d is CompanyDashboard => Boolean(d));

    const allSensors = dashboards.flatMap((d) => d.sensors);
    const revenue = companies.reduce((sum, c) => {
      const plan = plans.find((p) => p.code === c.plan);
      return sum + (plan?.priceMonthlyUsd ?? 0);
    }, 0);

    return {
      companies: companies.map(mapCompany),
      users: users.map(mapUser),
      plans: plans.map((p) => ({
        code: p.code,
        name: p.name,
        maxSensors: p.maxSensors,
        priceMonthlyUsd: p.priceMonthlyUsd,
        currency: (p as { currency?: "PEN" | "USD" }).currency ?? "USD",
        priceLabel: priceLabel(p.priceMonthlyUsd, (p as { currency?: string }).currency),
      })) as Plan[],
      events: this.events.slice(0, 20),
      stats: {
        companies: companies.length,
        activeCompanies: companies.filter((c) => c.status === "ACTIVE").length,
        sensors: allSensors.length,
        criticalSensors: allSensors.filter((s) => s.reading.status === "CRITICAL").length,
        monthlyRevenueUsd: revenue,
        avgCompliance: roundMetric(
          dashboards.reduce((sum, d) => sum + d.stats.compliance, 0) / Math.max(dashboards.length, 1)
        ),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async getCompanyDashboard(companyId: string): Promise<CompanyDashboard | null> {
    const companyRow = await (await getPrisma()).company.findUnique({ where: { id: companyId } });
    if (!companyRow) return null;

    await this.ensureSensorCache();
    await this.tick(companyId);

    const company = mapCompany(companyRow);
    const companySensors: SensorWithReading[] = this.sensorCache
      .filter((s) => s.companyId === companyId && s.active)
      .map((s) => ({ ...s, reading: this.getReading(s) }));
    const counts = countStatuses(companySensors);

    return {
      company,
      sensors: companySensors,
      events: this.events.filter((e) => e.companyId === companyId).slice(0, 20),
      stats: {
        ...counts,
        compliance: roundMetric((counts.normal / Math.max(companySensors.length, 1)) * 100),
        avgSignal: Math.round(
          companySensors.reduce((sum, s) => sum + s.reading.signal, 0) /
            Math.max(companySensors.length, 1)
        ),
        avgBattery: Math.round(
          companySensors.reduce((sum, s) => sum + s.reading.battery, 0) /
            Math.max(companySensors.length, 1)
        ),
        risk: Math.min(95, counts.critical * 28 + counts.warning * 12 + counts.offline * 18 + 8),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async listCompanies() {
    const rows = await (await getPrisma()).company.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(mapCompany);
  }

  async getCompany(companyId: string) {
    const row = await (await getPrisma()).company.findUnique({ where: { id: companyId } });
    return row ? mapCompany(row) : null;
  }

  async createCompany(input: Omit<Company, "id" | "createdAt" | "registrationKey"> & { registrationKey?: string | null }) {
    await ensureDefaultPlans(await getPrisma());

    const row = await (await getPrisma()).company.create({
      data: {
        name: input.name,
        ruc: input.ruc,
        status: input.status,
        plan: input.plan,
        contactEmail: input.contactEmail,
        alertPhone: input.alertPhone,
        registrationKey: input.registrationKey ?? generateRegistrationKey(input.name),
      },
    });
    return mapCompany(row);
  }

  async updateCompany(companyId: string, patch: Partial<Omit<Company, "id" | "createdAt">>) {
    try {
      const row = await (await getPrisma()).company.update({
        where: { id: companyId },
        data: patch as Prisma.CompanyUpdateInput,
      });
      return mapCompany(row);
    } catch {
      return null;
    }
  }

  async deleteCompany(companyId: string) {
    try {
      await (await getPrisma()).company.delete({ where: { id: companyId } });
      this.sensorCache = this.sensorCache.filter((s) => s.companyId !== companyId);
      this.events = this.events.filter((e) => e.companyId !== companyId);
      return true;
    } catch {
      return false;
    }
  }

  async listUsers(companyId?: string) {
    const rows = await (await getPrisma()).user.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { name: "asc" },
    });
    return rows.map(mapUser);
  }

  async getUser(userId: string) {
    const row = await (await getPrisma()).user.findUnique({ where: { id: userId } });
    return row ? mapUser(row) : null;
  }

  async createUser(input: Omit<AppUser, "id"> & { password?: string }) {
    const { hashPassword } = await import("@/lib/server/auth");
    const row = await (await getPrisma()).user.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        email: input.email.toLowerCase(),
        role: input.role,
        status: input.status,
        passwordHash: await hashPassword(input.password ?? "password123"),
      },
    });
    return mapUser(row);
  }

  async updateUser(userId: string, patch: Partial<Omit<AppUser, "id">>) {
    try {
      const row = await (await getPrisma()).user.update({
        where: { id: userId },
        data: patch as Prisma.UserUpdateInput,
      });
      return mapUser(row);
    } catch {
      return null;
    }
  }

  async deleteUser(userId: string) {
    try {
      await (await getPrisma()).user.delete({ where: { id: userId } });
      return true;
    } catch {
      return false;
    }
  }

  async listSensors(companyId: string) {
    await this.ensureSensorCache();
    return this.sensorCache.filter((s) => s.companyId === companyId);
  }

  async getSensor(sensorId: string) {
    await this.ensureSensorCache();
    return this.sensorCache.find((s) => s.id === sensorId) ?? null;
  }

  async createSensor(input: Omit<Sensor, "id" | "registeredAt" | "active">) {
    const prisma = await getPrisma();
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) throw new Error("COMPANY_NOT_FOUND");
    const plan = await prisma.plan.findUnique({ where: { code: company.plan } });
    const currentSensors = await prisma.sensor.count({ where: { companyId: input.companyId, active: true } });
    if (plan && currentSensors >= plan.maxSensors) {
      throw new Error("PLAN_SENSOR_LIMIT_REACHED");
    }

    const row = await prisma.sensor.create({
      data: {
        companyId: input.companyId,
        code: input.code,
        name: input.name,
        location: input.location,
        productType: input.productType,
        minTemp: input.minTemp,
        maxTemp: input.maxTemp,
      },
    });

    const sensor = mapSensor(row);
    this.sensorCache.push(sensor);
    this.readings.set(sensor.id, initialReading(sensor));
    return sensor;
  }

  async updateSensor(
    sensorId: string,
    patch: Partial<Omit<Sensor, "id" | "companyId" | "registeredAt">>
  ) {
    try {
      const row = await (await getPrisma()).sensor.update({
        where: { id: sensorId },
        data: patch,
      });
      const sensor = mapSensor(row);
      const index = this.sensorCache.findIndex((s) => s.id === sensorId);
      if (index >= 0) this.sensorCache[index] = sensor;
      return sensor;
    } catch {
      return null;
    }
  }

  async deleteSensor(sensorId: string) {
    try {
      await (await getPrisma()).sensor.delete({ where: { id: sensorId } });
      this.sensorCache = this.sensorCache.filter((s) => s.id !== sensorId);
      this.readings.delete(sensorId);
      this.simulation.delete(sensorId);
      return true;
    } catch {
      return false;
    }
  }

  async getEvents(companyId?: string, limit = 20) {
    const filtered = companyId
      ? this.events.filter((e) => e.companyId === companyId)
      : this.events;
    return filtered.slice(0, limit);
  }
}

const globalForPrismaRepo = globalThis as typeof globalThis & {
  prismaColdtrackRepository?: PrismaColdtrackRepository;
};

export function getPrismaColdtrackRepository() {
  if (!globalForPrismaRepo.prismaColdtrackRepository) {
    globalForPrismaRepo.prismaColdtrackRepository = new PrismaColdtrackRepository();
  }
  return globalForPrismaRepo.prismaColdtrackRepository;
}
