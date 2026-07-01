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

/* ------------------------------------------------------------------ */
/*  Internal types                                                     */
/* ------------------------------------------------------------------ */

type SimulationState = {
  drift: number;
  offlineTicks: number;
  targetOffset: number;
};

type StoreState = {
  companies: Company[];
  users: AppUser[];
  plans: Plan[];
  sensors: Sensor[];
  readings: Map<string, SensorReading>;
  simulation: Map<string, SimulationState>;
  events: SystemEvent[];
  lastTick: number;
};

/* ------------------------------------------------------------------ */
/*  Provider interface (swap simulated → real IoT later)               */
/* ------------------------------------------------------------------ */

export interface ISensorProvider {
  tick(companyId?: string): void;
  getReading(sensor: Sensor): SensorReading;
}

/* ------------------------------------------------------------------ */
/*  Repository interface                                               */
/* ------------------------------------------------------------------ */

export interface ColdtrackRepository {
  getAdminOverview(): Promise<AdminOverview>;
  getCompanyDashboard(companyId: string): Promise<CompanyDashboard | null>;
  listCompanies(): Promise<Company[]>;
  getCompany(companyId: string): Promise<Company | null>;
  createCompany(input: Omit<Company, "id" | "createdAt">): Promise<Company>;
  updateCompany(companyId: string, patch: Partial<Omit<Company, "id" | "createdAt">>): Promise<Company | null>;
  deleteCompany(companyId: string): Promise<boolean>;
  listUsers(companyId?: string): Promise<AppUser[]>;
  getUser(userId: string): Promise<AppUser | null>;
  createUser(input: Omit<AppUser, "id">): Promise<AppUser>;
  updateUser(userId: string, patch: Partial<Omit<AppUser, "id">>): Promise<AppUser | null>;
  deleteUser(userId: string): Promise<boolean>;
  listSensors(companyId: string): Promise<Sensor[]>;
  getSensor(sensorId: string): Promise<Sensor | null>;
  createSensor(input: Omit<Sensor, "id" | "registeredAt" | "active">): Promise<Sensor>;
  updateSensor(sensorId: string, patch: Partial<Omit<Sensor, "id" | "companyId" | "registeredAt">>): Promise<Sensor | null>;
  deleteSensor(sensorId: string): Promise<boolean>;
  getEvents(companyId?: string, limit?: number): Promise<SystemEvent[]>;
  tick(companyId?: string): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */

const plans: Plan[] = [
  { code: "STARTER", name: "Starter", maxSensors: 12, priceMonthlyUsd: 99 },
  { code: "PRO", name: "Professional", maxSensors: 60, priceMonthlyUsd: 299 },
  { code: "ENTERPRISE", name: "Enterprise", maxSensors: 300, priceMonthlyUsd: 899 },
];

const companies: Company[] = [
  {
    id: "empresa-a",
    name: "Clínica Santa Aurora",
    ruc: "20601845190",
    status: "ACTIVE",
    plan: "PRO",
    contactEmail: "operaciones@santaaurora.pe",
    createdAt: "2026-02-12T14:20:00.000Z",
  },
  {
    id: "empresa-b",
    name: "Laboratorio BioNorte",
    ruc: "20577110233",
    status: "TRIAL",
    plan: "STARTER",
    contactEmail: "calidad@bionorte.pe",
    createdAt: "2026-05-04T09:15:00.000Z",
  },
  {
    id: "empresa-c",
    name: "Banco de Sangre VitalRed",
    ruc: "20490244718",
    status: "ACTIVE",
    plan: "ENTERPRISE",
    contactEmail: "monitoreo@vitalred.pe",
    createdAt: "2025-11-18T12:40:00.000Z",
  },
];

const users: AppUser[] = [
  { id: "u-1", companyId: null, name: "Sebastian Admin", email: "admin@coldtrack.ai", role: "SUPER_ADMIN", status: "ACTIVE" },
  { id: "u-2", companyId: "empresa-a", name: "Dra. Valeria Ríos", email: "valeria@santaaurora.pe", role: "SUPERVISOR", status: "ACTIVE" },
  { id: "u-3", companyId: "empresa-a", name: "Miguel Torres", email: "miguel@santaaurora.pe", role: "TECHNICIAN", status: "ACTIVE" },
  { id: "u-4", companyId: "empresa-b", name: "Andrea Salas", email: "andrea@bionorte.pe", role: "AUDITOR", status: "INVITED" },
  { id: "u-5", companyId: "empresa-c", name: "Luis Paredes", email: "luis@vitalred.pe", role: "ADMIN", status: "ACTIVE" },
];

// No seed sensors — each company registers its own sensors from the UI
const sensors: Sensor[] = [];

/* ------------------------------------------------------------------ */
/*  Helper functions                                                   */
/* ------------------------------------------------------------------ */

function sensor(
  companyId: string,
  code: string,
  name: string,
  location: string,
  productType: string,
  minTemp: number,
  maxTemp: number
): Sensor {
  return {
    id: `${companyId}-${code.toLowerCase()}`,
    companyId,
    code,
    name,
    location,
    productType,
    minTemp,
    maxTemp,
    registeredAt: "2026-06-01T10:00:00.000Z",
    active: true,
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

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/*  Simulated Sensor Provider                                          */
/* ------------------------------------------------------------------ */

class SimulatedSensorProvider implements ISensorProvider {
  constructor(private readonly state: StoreState) {}

  tick(companyId?: string) {
    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.min(10, (now - this.state.lastTick) / 1000 || 3));
    this.state.lastTick = now;

    for (const s of this.state.sensors) {
      if (companyId && s.companyId !== companyId) continue;
      if (!s.active) continue;

      const previous = this.getReading(s);
      const sim = this.state.simulation.get(s.id) ?? {
        drift: 0,
        offlineTicks: 0,
        targetOffset: stableNoise(`${s.id}-target`, 0.4),
      };

      // Occasional signal loss (1.5% chance per tick)
      if (Math.random() < 0.015 && sim.offlineTicks === 0) {
        sim.offlineTicks = 2 + Math.floor(Math.random() * 4);
      }

      // Slow target drift (4% chance per tick)
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
        lastSeenSeconds: signal === 0 ? previous.lastSeenSeconds + Math.round(elapsedSeconds) : Math.round(elapsedSeconds),
        updatedAt: new Date().toISOString(),
      };

      this.state.readings.set(s.id, reading);
      this.state.simulation.set(s.id, sim);
      this.addEventIfNeeded(s, previous.status, reading);
    }
  }

  getReading(s: Sensor) {
    const existing = this.state.readings.get(s.id);
    if (existing) return existing;

    const created = initialReading(s);
    this.state.readings.set(s.id, created);
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

    this.state.events.unshift({
      id: `${Date.now()}-${s.id}`,
      companyId: s.companyId,
      sensorId: s.id,
      severity: reading.status,
      title,
      detail: `${s.name} reporta ${reading.temperature.toFixed(1)}°C en ${s.location}.`,
      createdAt: new Date().toISOString(),
    });
    this.state.events = this.state.events.slice(0, 200);
  }
}

/* ------------------------------------------------------------------ */
/*  In-Memory Repository Implementation                                */
/* ------------------------------------------------------------------ */

class MemoryColdtrackRepository implements ColdtrackRepository {
  private readonly provider: ISensorProvider;

  constructor(private readonly state: StoreState) {
    this.provider = new SimulatedSensorProvider(state);
  }

  /* ── Simulation ─────────────────────────────────────── */

  async tick(companyId?: string) {
    this.provider.tick(companyId);
  }

  async getAdminOverview(): Promise<AdminOverview> {
    await this.tick();
    const dashboards = (
      await Promise.all(this.state.companies.map((c) => this.getCompanyDashboard(c.id)))
    ).filter((d): d is CompanyDashboard => Boolean(d));
    const allSensors = dashboards.flatMap((d) => d.sensors);
    const revenue = this.state.companies.reduce((sum, c) => {
      const plan = this.state.plans.find((p) => p.code === c.plan);
      return sum + (plan?.priceMonthlyUsd ?? 0);
    }, 0);

    return {
      companies: this.state.companies,
      users: this.state.users,
      plans: this.state.plans,
      events: this.state.events.slice(0, 20),
      stats: {
        companies: this.state.companies.length,
        activeCompanies: this.state.companies.filter((c) => c.status === "ACTIVE").length,
        sensors: allSensors.length,
        criticalSensors: allSensors.filter((s) => s.reading.status === "CRITICAL").length,
        monthlyRevenueUsd: revenue,
        avgCompliance: roundMetric(
          dashboards.reduce((sum, d) => sum + d.stats.compliance, 0) /
            Math.max(dashboards.length, 1)
        ),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async getCompanyDashboard(companyId: string): Promise<CompanyDashboard | null> {
    const company = this.state.companies.find((c) => c.id === companyId);
    if (!company) return null;

    await this.tick(companyId);
    const companySensors: SensorWithReading[] = this.state.sensors
      .filter((s) => s.companyId === companyId && s.active)
      .map((s) => ({ ...s, reading: this.provider.getReading(s) }));
    const counts = countStatuses(companySensors);

    return {
      company,
      sensors: companySensors,
      events: this.state.events.filter((e) => e.companyId === companyId).slice(0, 20),
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

  /* ── Companies ──────────────────────────────────────── */

  async listCompanies() {
    return [...this.state.companies];
  }

  async getCompany(companyId: string) {
    return this.state.companies.find((c) => c.id === companyId) ?? null;
  }

  async createCompany(input: Omit<Company, "id" | "createdAt">) {
    const company: Company = {
      ...input,
      id: generateId("company"),
      createdAt: new Date().toISOString(),
    };
    this.state.companies.push(company);
    return company;
  }

  async updateCompany(companyId: string, patch: Partial<Omit<Company, "id" | "createdAt">>) {
    const index = this.state.companies.findIndex((c) => c.id === companyId);
    if (index === -1) return null;
    this.state.companies[index] = { ...this.state.companies[index], ...patch };
    return this.state.companies[index];
  }

  async deleteCompany(companyId: string) {
    const index = this.state.companies.findIndex((c) => c.id === companyId);
    if (index === -1) return false;
    this.state.companies.splice(index, 1);
    // Clean up related data
    this.state.users = this.state.users.filter((u) => u.companyId !== companyId);
    const removedSensors = this.state.sensors.filter((s) => s.companyId === companyId);
    this.state.sensors = this.state.sensors.filter((s) => s.companyId !== companyId);
    for (const s of removedSensors) {
      this.state.readings.delete(s.id);
      this.state.simulation.delete(s.id);
    }
    this.state.events = this.state.events.filter((e) => e.companyId !== companyId);
    return true;
  }

  /* ── Users ──────────────────────────────────────────── */

  async listUsers(companyId?: string) {
    if (companyId) return this.state.users.filter((u) => u.companyId === companyId);
    return [...this.state.users];
  }

  async getUser(userId: string) {
    return this.state.users.find((u) => u.id === userId) ?? null;
  }

  async createUser(input: Omit<AppUser, "id">) {
    const user: AppUser = { ...input, id: generateId("u") };
    this.state.users.push(user);
    return user;
  }

  async updateUser(userId: string, patch: Partial<Omit<AppUser, "id">>) {
    const index = this.state.users.findIndex((u) => u.id === userId);
    if (index === -1) return null;
    this.state.users[index] = { ...this.state.users[index], ...patch };
    return this.state.users[index];
  }

  async deleteUser(userId: string) {
    const index = this.state.users.findIndex((u) => u.id === userId);
    if (index === -1) return false;
    this.state.users.splice(index, 1);
    return true;
  }

  /* ── Sensors ────────────────────────────────────────── */

  async listSensors(companyId: string) {
    return this.state.sensors.filter((s) => s.companyId === companyId);
  }

  async getSensor(sensorId: string) {
    return this.state.sensors.find((s) => s.id === sensorId) ?? null;
  }

  async createSensor(input: Omit<Sensor, "id" | "registeredAt" | "active">) {
    const company = this.state.companies.find((c) => c.id === input.companyId);
    if (!company) throw new Error("COMPANY_NOT_FOUND");

    const s: Sensor = {
      ...input,
      id: `${input.companyId}-${input.code.toLowerCase()}-${Date.now()}`,
      registeredAt: new Date().toISOString(),
      active: true,
    };

    this.state.sensors.push(s);
    this.state.readings.set(s.id, initialReading(s));
    return s;
  }

  async updateSensor(sensorId: string, patch: Partial<Omit<Sensor, "id" | "companyId" | "registeredAt">>) {
    const index = this.state.sensors.findIndex((s) => s.id === sensorId);
    if (index === -1) return null;
    this.state.sensors[index] = { ...this.state.sensors[index], ...patch };
    return this.state.sensors[index];
  }

  async deleteSensor(sensorId: string) {
    const index = this.state.sensors.findIndex((s) => s.id === sensorId);
    if (index === -1) return false;
    this.state.sensors.splice(index, 1);
    this.state.readings.delete(sensorId);
    this.state.simulation.delete(sensorId);
    return true;
  }

  /* ── Events ─────────────────────────────────────────── */

  async getEvents(companyId?: string, limit = 20) {
    const filtered = companyId
      ? this.state.events.filter((e) => e.companyId === companyId)
      : this.state.events;
    return filtered.slice(0, limit);
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton factory                                                  */
/* ------------------------------------------------------------------ */

function createState(): StoreState {
  const readings = new Map<string, SensorReading>();
  for (const item of sensors) readings.set(item.id, initialReading(item));

  return {
    companies: [...companies],
    users: [...users],
    plans: [...plans],
    sensors: [...sensors],
    readings,
    simulation: new Map(),
    events: [],
    lastTick: Date.now(),
  };
}

const globalForColdtrack = globalThis as typeof globalThis & {
  coldtrackRepository?: ColdtrackRepository;
};

export async function getColdtrackRepository(): Promise<ColdtrackRepository> {
  const { isDatabaseConfigured } = await import("@/lib/server/rds-connection");
  const { isDatabaseAvailable } = await import("@/lib/server/database-health");

  if (isDatabaseConfigured() && (await isDatabaseAvailable())) {
    const { getPrismaColdtrackRepository } = await import("@/lib/server/prisma-coldtrack-repository");
    return getPrismaColdtrackRepository();
  }

  if (!globalForColdtrack.coldtrackRepository) {
    globalForColdtrack.coldtrackRepository = new MemoryColdtrackRepository(createState());
  }

  return globalForColdtrack.coldtrackRepository;
}
