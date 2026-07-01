"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Filter,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LineChart,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Users,
  Wifi,
  Wrench,
  Zap,
  Plus,
  Trash2,
  Loader2,
  X,
  LogOut,
} from "lucide-react";
import { useCompanyDashboard } from "@/lib/hooks/use-company-dashboard";
import { useAuth } from "@/lib/hooks/use-auth";
import type { AppUser } from "@/lib/domain/coldtrack";

type Status = "Normal" | "Vigilancia" | "Critico";
type View =
  | "Dashboard"
  | "Equipos"
  | "Gestión de Sensores"
  | "Alertas"
  | "Trazabilidad"
  | "Analitica IA"
  | "Auditorias"
  | "Usuarios"
  | "Ajustes";

type Equipment = {
  id: string;
  name: string;
  site: string;
  category: string;
  temp: number;
  humidity: number;
  battery: number;
  signal: number;
  min: number;
  max: number;
  status: Status;
  trend: number[];
  lastSeen: number;
};

type Event = {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: Status;
};

type Stats = {
  normal: number;
  warning: number;
  critical: number;
  compliance: number;
  avgSignal: number;
  avgResponse: number;
};

const navItems: { label: View; icon: LucideIcon }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Equipos", icon: Snowflake },
  { label: "Gestión de Sensores", icon: Wrench },
  { label: "Alertas", icon: Bell },
  { label: "Trazabilidad", icon: ClipboardCheck },
  { label: "Analitica IA", icon: LineChart },
  { label: "Auditorias", icon: ShieldCheck },
  { label: "Usuarios", icon: Users },
  { label: "Ajustes", icon: Settings },
];

const auditRows = [
  ["VAC-2026-184", "Vacunas influenza", "Centro de vacunacion", "Completo", "98.4%"],
  ["BIO-7712-A", "Muestras PCR", "Laboratorio central", "En revision", "92.1%"],
  ["HEM-4480", "Hemoderivados", "Banco de sangre", "Completo", "99.2%"],
  ["REA-2026-31", "Reactivos", "Laboratorio clinico", "Observado", "86.7%"],
];

function statusClasses(status: Status) {
  return {
    Normal: "border-slate-200 bg-slate-50 text-slate-700",
    Vigilancia: "border-amber-250 bg-amber-50 text-amber-700",
    Critico: "border-rose-250 bg-rose-50 text-rose-750",
  }[status];
}

function formatTemp(value: number) {
  return `${value.toFixed(1)} °C`;
}

export function ColdtrackDashboard({ companyId }: { companyId: string }) {
  const { user: authUser, loading: authLoading, logout } = useAuth(undefined, companyId);
  const { data, loading, error, registerSensor, deleteSensor } = useCompanyDashboard(companyId);

  const [view, setView] = useState<View>("Dashboard");
  const [companyUsers, setCompanyUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Sensor Form state
  const [showAddSensor, setShowAddSensor] = useState(false);
  const [sensorForm, setSensorForm] = useState({
    code: "",
    name: "",
    location: "",
    productType: "Medicamentos",
    minTemp: 2,
    maxTemp: 8,
  });
  const [sensorActionError, setSensorActionError] = useState<string | null>(null);

  // Fetch company users when view is "Usuarios"
  useEffect(() => {
    if (view === "Usuarios" && !authLoading && authUser) {
      queueMicrotask(() => {
        setUsersLoading(true);
        fetch(`/api/admin/users?companyId=${companyId}`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Failed to load users");
          })
          .then((data) => setCompanyUsers(data))
          .catch((err) => console.error("Error loading users:", err))
          .finally(() => setUsersLoading(false));
      });
    }
  }, [view, companyId, authLoading, authUser]);

  // Map backend sensors to dashboard equipment structure
  const equipment: Equipment[] = useMemo(() => {
    if (!data?.sensors) return [];
    return data.sensors.map((s) => {
      let uiStatus: Status = "Normal";
      if (s.reading.status === "CRITICAL" || s.reading.status === "OFFLINE") {
        uiStatus = "Critico";
      } else if (s.reading.status === "WARNING") {
        uiStatus = "Vigilancia";
      }

      return {
        id: s.id,
        name: s.name,
        site: s.location,
        category: s.productType,
        temp: s.reading.temperature,
        humidity: s.reading.humidity,
        battery: s.reading.battery,
        signal: s.reading.signal,
        min: s.minTemp,
        max: s.maxTemp,
        status: uiStatus,
        trend: s.reading.trend || [],
        lastSeen: s.reading.lastSeenSeconds,
      };
    });
  }, [data]);

  // Map backend events to dashboard event structure
  const events: Event[] = useMemo(() => {
    if (!data?.events) return [];
    return data.events.map((e) => {
      let uiStatus: Status = "Normal";
      if (e.severity === "CRITICAL" || e.severity === "OFFLINE") {
        uiStatus = "Critico";
      } else if (e.severity === "WARNING") {
        uiStatus = "Vigilancia";
      }

      return {
        id: e.id,
        time: new Date(e.createdAt).toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        title: e.title,
        detail: e.detail,
        tone: uiStatus,
      };
    });
  }, [data]);

  // Map backend stats to dashboard stats structure
  const stats: Stats = useMemo(() => {
    if (!data?.stats) {
      return { normal: 0, warning: 0, critical: 0, compliance: 100, avgSignal: 100, avgResponse: 5 };
    }
    return {
      normal: data.stats.normal,
      warning: data.stats.warning + data.stats.offline,
      critical: data.stats.critical,
      compliance: data.stats.compliance,
      avgSignal: data.stats.avgSignal,
      avgResponse: Math.max(3, 9 - data.stats.critical - Math.round((data.stats.warning + data.stats.offline) / 2)),
    };
  }, [data]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto size-12 animate-spin text-slate-800" />
          <p className="mt-4 text-slate-600 font-medium">Estableciendo conexión segura...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
          <AlertTriangle className="mx-auto size-16 text-rose-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-900">Error de conexión</h3>
          <p className="mt-2 text-slate-500 leading-relaxed">
            No se pudo obtener información para la empresa seleccionada.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-600 text-white transition rounded-xl font-semibold shadow-md text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const criticalEquipment = equipment.filter((item) => item.status !== "Normal");
  const title = view === "Analitica IA" ? "Riesgo preventivo y tendencias" : view;
  const companyName = data.company.name;
  const planName = data.company.plan;

  const handleRegisterSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSensorActionError(null);
    try {
      await registerSensor(sensorForm);
      setShowAddSensor(false);
      setSensorForm({
        code: "",
        name: "",
        location: "",
        productType: "Medicamentos",
        minTemp: 2,
        maxTemp: 8,
      });
    } catch (err) {
      setSensorActionError(err instanceof Error ? err.message : "Error al registrar el sensor");
    }
  };

  const handleDeleteSensor = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este sensor permanentemente?")) {
      try {
        await deleteSensor(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar sensor");
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950 flex flex-col">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:flex flex-col justify-between">
          <div>
            <Brand companyName={companyName} planName={planName} />
            <nav className="mt-8 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setView(item.label)}
                  className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition ${
                    view === item.label
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-slate-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-slate-600" />
                </span>
                <Wifi className="size-4" />
                <p className="text-xs font-bold uppercase tracking-wider">Red IoT Conectada</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {equipment.length} sensores activos transmitiendo. Señal promedio: {stats.avgSignal}%.
              </p>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-250 text-slate-600 transition border border-slate-200"
            >
              <LogOut className="size-4" />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex min-w-0 flex-1 flex-col">
          <Header
            title={title}
            view={view}
            companyName={companyName}
            updatedAt={new Date(data.updatedAt).toLocaleTimeString("es-PE")}
            onLogout={logout}
          />

          {/* Mobile navigation */}
          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setView(item.label)}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold ${
                    view === item.label
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic views */}
          <div className="ct-fade-in flex-1">
            {view === "Dashboard" && (
              <DashboardView
                equipment={equipment}
                events={events}
                criticalEquipment={criticalEquipment}
                stats={stats}
              />
            )}
            {view === "Equipos" && <EquipmentView equipment={equipment} />}
            {view === "Gestión de Sensores" && (
              <SensorsManagementView
                equipment={equipment}
                onAddClick={() => {
                  setSensorActionError(null);
                  setShowAddSensor(true);
                }}
                onDeleteClick={handleDeleteSensor}
              />
            )}
            {view === "Alertas" && (
              <AlertsView equipment={criticalEquipment} events={events} />
            )}
            {view === "Trazabilidad" && <TraceabilityView equipment={equipment} />}
            {view === "Analitica IA" && (
              <AnalyticsView equipment={equipment} stats={stats} />
            )}
            {view === "Auditorias" && <AuditsView />}
            {view === "Usuarios" && <UsersView users={companyUsers} loading={usersLoading} />}
            {view === "Ajustes" && <SettingsView />}
          </div>
        </section>
      </div>

      {/* Sensor Modal */}
      {showAddSensor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-600/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-900">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Sensor IoT</h3>
              <button
                onClick={() => setShowAddSensor(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSensor} className="p-5 space-y-4">
              {sensorActionError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{sensorActionError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Código de Sensor
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-800 outline-none"
                    placeholder="Ej. RF-09"
                    value={sensorForm.code}
                    onChange={(e) => setSensorForm({ ...sensorForm, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Tipo de Producto
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-800 outline-none"
                    value={sensorForm.productType}
                    onChange={(e) => setSensorForm({ ...sensorForm, productType: e.target.value })}
                  >
                    <option value="Medicamentos">Medicamentos (2°C a 8°C)</option>
                    <option value="Vacunas">Vacunas (2°C a 8°C)</option>
                    <option value="Reactivos">Reactivos (8°C a 12°C)</option>
                    <option value="Hemoderivados">Hemoderivados (-80°C a -70°C)</option>
                    <option value="Muestras biológicas">Muestras biológicas (-25°C a -18°C)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Nombre descriptivo del Equipo
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-800 outline-none"
                  placeholder="Ej. Congelador Vertical Almacén B"
                  value={sensorForm.name}
                  onChange={(e) => setSensorForm({ ...sensorForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Ubicación física / Sede
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-800 outline-none"
                  placeholder="Ej. Laboratorio Central - Piso 2"
                  value={sensorForm.location}
                  onChange={(e) => setSensorForm({ ...sensorForm, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Temp. Mínima (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-800 outline-none"
                    value={sensorForm.minTemp}
                    onChange={(e) => setSensorForm({ ...sensorForm, minTemp: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Temp. Máxima (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-slate-800 outline-none"
                    value={sensorForm.maxTemp}
                    onChange={(e) => setSensorForm({ ...sensorForm, maxTemp: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSensor(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition shadow-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Brand({ companyName, planName }: { companyName: string; planName: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex size-11 items-center justify-center rounded-lg bg-sky-600 text-white border border-slate-250">
        <Snowflake className="size-6 text-slate-200" />
      </div>
      <div>
        <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">
          COLDTRACK
        </p>
        <h1 className="text-sm font-extrabold text-slate-950 truncate max-w-[170px]" title={companyName}>
          {companyName}
        </h1>
        <span className="inline-block mt-0.5 px-1 py-0.2 text-[8px] font-extrabold bg-slate-100 text-slate-600 rounded uppercase border border-slate-200">
          PLAN {planName}
        </span>
      </div>
    </div>
  );
}

function Header({
  title,
  view,
  companyName,
  updatedAt,
  onLogout,
}: {
  title: string;
  view: View;
  companyName: string;
  updatedAt: string;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur xl:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Building2 className="size-3.5" />
            {companyName}
            <span>/</span>
            {view}
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
              <span className="size-1.5 rounded-full bg-slate-400" />
              Sincronizado {updatedAt}
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row items-center">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:w-72">
            <Search className="size-4 shrink-0" />
            <input
              className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400 text-xs"
              placeholder="Buscar equipo, lote o sede"
            />
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Filter className="size-4" />
            Filtros
          </button>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700">
            <Download className="size-4" />
            Exportar
          </button>
          <button
            onClick={onLogout}
            className="lg:hidden inline-flex size-10 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800"
            title="Cerrar sesión"
          >
            <LogOut className="size-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function DashboardView({
  equipment,
  events,
  criticalEquipment,
  stats,
}: {
  equipment: Equipment[];
  events: Event[];
  criticalEquipment: Equipment[];
  stats: Stats;
}) {
  const risk = Math.min(92, Math.max(9, stats.critical * 21 + stats.warning * 9));

  return (
    <>
      <div className="grid gap-4 px-4 py-5 xl:grid-cols-4 xl:px-8">
        <section className="rounded-lg border border-rose-200 bg-white p-4 shadow-sm xl:col-span-2">
          <SectionTitle
            icon={AlertTriangle}
            title="Alertas activas"
            tone="text-rose-700"
            subtitle="Incidentes que pueden comprometer medicamentos, vacunas o muestras biologicas."
            action="Ver protocolo"
          />
          <div className="mt-4 grid gap-3">
            {criticalEquipment.length ? (
              criticalEquipment.map((item) => <AlertCard key={item.id} item={item} />)
            ) : (
              <div className="py-8 text-center border border-dashed border-slate-200 bg-slate-50 rounded-xl">
                <CheckCircle2 className="mx-auto size-8 text-slate-600" />
                <p className="mt-2 text-xs font-bold text-slate-800">Cero desviaciones activas</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Todos los equipos operan dentro de parámetros de seguridad.</p>
              </div>
            )}
          </div>
        </section>

        <SystemHealth stats={stats} />
        <PredictiveRisk risk={risk} equipment={equipment} />
      </div>

      <KpiStrip stats={stats} equipment={equipment} />

      <div className="grid gap-4 px-4 pb-8 xl:grid-cols-[1.7fr_1fr] xl:px-8">
        <EquipmentTable equipment={equipment.slice(0, 5)} compact />
        <SidePanel events={events} />
      </div>
    </>
  );
}

function EquipmentView({ equipment }: { equipment: Equipment[] }) {
  return (
    <div className="grid gap-4 px-4 py-5 xl:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Sensores activos" value={`${equipment.length}`} icon={Wifi} tone="cyan" />
        <MetricCard
          label="Promedio bateria"
          value={equipment.length ? `${Math.round(equipment.reduce((sum, item) => sum + item.battery, 0) / equipment.length)}%` : "0%"}
          icon={Zap}
          tone="amber"
        />
        <MetricCard label="Equipos calibrados" value="98%" icon={Gauge} tone="emerald" />
      </div>
      <EquipmentTable equipment={equipment} />
    </div>
  );
}

function SensorsManagementView({
  equipment,
  onAddClick,
  onDeleteClick,
}: {
  equipment: Equipment[];
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 px-4 py-5 xl:px-8">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
          <div>
            <h3 className="font-bold text-slate-950">Registro y Calibración de Sensores</h3>
            <p className="text-xs text-slate-500 mt-1">
              Agregue o remueva dispositivos de monitoreo en frío para los lotes sensibles de su empresa.
            </p>
          </div>
          <button
            onClick={onAddClick}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700 transition"
          >
            <Plus className="size-4" />
            Registrar Sensor
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-3 px-3">Sensor</th>
                <th className="py-3 px-3">Ubicación</th>
                <th className="py-3 px-3">Lote a Proteger</th>
                <th className="py-3 px-3">Umbral Térmico</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipment.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No hay sensores registrados para esta organización. Use el botón superior para agregar el primero.
                  </td>
                </tr>
              ) : (
                equipment.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition duration-150">
                    <td className="py-3.5 px-3 font-semibold text-slate-950">
                      <div>{item.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">ID: {item.id}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">{item.site}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-medium">
                      {formatTemp(item.min)} a {formatTemp(item.max)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => onDeleteClick(item.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition"
                        title="Eliminar sensor"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AlertsView({
  equipment,
  events,
}: {
  equipment: Equipment[];
  events: Event[];
}) {
  return (
    <div className="grid gap-4 px-4 py-5 xl:grid-cols-[1.35fr_1fr] xl:px-8">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle
          icon={Bell}
          title="Bandeja de alertas"
          tone="text-rose-700"
          subtitle="Priorizacion automatica por severidad, producto sensible y tiempo fuera de rango."
        />
        <div className="mt-4 grid gap-3">
          {equipment.length ? (
            equipment.map((item) => <AlertCard key={item.id} item={item} />)
          ) : (
            <EmptyState title="Sin alertas activas" detail="Todos los equipos estan dentro de los rangos configurados." />
          )}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-bold text-slate-950">Linea de eventos</h3>
        <EventList events={events} />
      </section>
    </div>
  );
}

function TraceabilityView({ equipment }: { equipment: Equipment[] }) {
  return (
    <div className="grid gap-4 px-4 py-5 xl:grid-cols-[1.2fr_1fr] xl:px-8">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-950">Lotes y cadena de custodia</h3>
          <p className="mt-1 text-sm text-slate-500">Trazabilidad preparada para auditoria, exportacion y firma digital.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Ubicacion</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Cumplimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditRows.map((row) => (
                <tr key={row[0]} className="hover:bg-slate-50">
                  {row.map((cell, index) => (
                    <td key={cell} className={`px-4 py-4 ${index === 0 ? "font-semibold text-slate-950" : "text-slate-600"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-bold text-slate-950">Ruta termica del lote VAC-2026-184</h3>
        <div className="mt-5 space-y-4">
          {["Ingreso validado", "Almacenamiento estable", "Apertura controlada", "Despacho programado"].map((step, index) => (
            <div key={step} className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">{index + 1}</div>
              <div>
                <p className="font-semibold text-slate-950">{step}</p>
                <p className="text-sm text-slate-500">
                  {equipment[index]?.name ?? "Equipo validado"} - lectura dentro de politica.
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AnalyticsView({
  equipment,
  stats,
}: {
  equipment: Equipment[];
  stats: Stats;
}) {
  const ranked = [...equipment].sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 5);

  return (
    <div className="grid gap-4 px-4 py-5 xl:grid-cols-[1.4fr_1fr] xl:px-8">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle
          icon={Activity}
          title="Modelo preventivo de desviaciones"
          tone="text-slate-700"
          subtitle="Análisis de riesgo operativo basado en tendencia, señal, batería y distancia al rango."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {ranked.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.site}</p>
                </div>
                <span className="text-2xl font-bold text-slate-700">{riskScore(item)}%</span>
              </div>
              <MiniTrend values={item.trend} status={item.status} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-bold text-slate-950">Recomendaciones de Control</h3>
        <div className="mt-4 grid gap-3">
          {[
            `${stats.critical} equipos requieren revisión preventiva.`,
            "Ajustar umbral de escalamiento para vacunas a 6 minutos.",
            "Programar calibración preventiva periódica.",
            "Mantener gateway LTE secundario activo durante despacho.",
          ].map((item) => (
            <div key={item} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm font-medium text-slate-900">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AuditsView() {
  return (
    <div className="grid gap-4 px-4 py-5 xl:grid-cols-3 xl:px-8">
      <MetricCard label="Reportes listos" value="18" icon={ClipboardCheck} tone="emerald" />
      <MetricCard label="Hallazgos abiertos" value="4" icon={AlertTriangle} tone="amber" />
      <MetricCard label="Cumplimiento mensual" value="96.8%" icon={ShieldCheck} tone="cyan" />
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm xl:col-span-3">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-950">Auditorias recientes</h3>
        </div>
        <div className="grid divide-y divide-slate-100">
          {auditRows.map((row) => (
            <div key={row[0]} className="grid gap-3 p-4 md:grid-cols-5 md:items-center">
              <p className="font-semibold text-slate-950">{row[0]}</p>
              <p className="text-sm text-slate-600">{row[1]}</p>
              <p className="text-sm text-slate-600">{row[2]}</p>
              <StatusBadge status={row[3] === "Observado" ? "Vigilancia" : "Normal"} label={row[3]} />
              <p className="text-sm font-bold text-slate-950">{row[4]}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UsersView({ users, loading }: { users: AppUser[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Loader2 className="mx-auto size-8 animate-spin text-slate-700" />
        <p className="mt-2 text-xs font-semibold">Cargando lista de usuarios...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 px-4 py-5 xl:grid-cols-[1.4fr_1fr] xl:px-8">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-bold text-slate-950">Usuarios de la organización</h3>
        </div>
        <div className="grid divide-y divide-slate-100">
          {users.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">No hay usuarios asignados a esta empresa.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="grid gap-2 p-4 md:grid-cols-4 md:items-center">
                <div>
                  <p className="font-semibold text-slate-950">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.email}</p>
                </div>
                <p className="text-sm text-slate-600">{user.role}</p>
                <p className="text-sm text-slate-600">ID: {user.id}</p>
                <StatusBadge
                  status={user.status === "INVITED" ? "Vigilancia" : user.status === "ACTIVE" ? "Normal" : "Critico"}
                  label={user.status === "ACTIVE" ? "Activo" : user.status === "INVITED" ? "Invitado" : "Deshabilitado"}
                />
              </div>
            ))
          )}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-bold text-slate-950">Roles configurados</h3>
        <div className="mt-4 grid gap-3">
          {["Administrador", "Supervisor", "Tecnico", "Auditor"].map((role) => (
            <div key={role} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span className="font-semibold text-slate-700">{role}</span>
              <LockKeyhole className="size-4 text-slate-400" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="grid gap-4 px-4 py-5 xl:grid-cols-3 xl:px-8">
      {[
        ["Rangos termicos", "Define limites por producto, equipo y sede."],
        ["Escalamiento", "Configura tiempos, responsables y canales."],
        ["Integraciones IoT", "Gateways, sensores, APIs y webhooks."],
        ["Seguridad", "Sesiones, MFA, auditoria y politicas."],
        ["Notificaciones", "Correo, SMS, WhatsApp y tablero NOC."],
        ["Reportes", "Plantillas, frecuencia y exportaciones."],
      ].map(([title, detail]) => (
        <section key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-950">{title}</h3>
            <Settings className="size-4 text-slate-400" />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
          <button className="mt-4 h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Configurar
          </button>
        </section>
      ))}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  tone,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone: string;
  action?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className={`flex items-center gap-2 ${tone}`}>
          <Icon className="size-5" />
          <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
        </div>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action ? (
        <button className="inline-flex h-9 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700">
          {action}
        </button>
      ) : null}
    </div>
  );
}

function AlertCard({ item }: { item: Equipment }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{item.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="size-3.5" />
            {item.site}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className={`text-xl font-bold ${item.status === "Critico" ? "text-rose-700" : item.status === "Vigilancia" ? "text-amber-700" : "text-slate-700"}`}>
              {formatTemp(item.temp)}
            </p>
            <p className="text-xs text-slate-500">
              Limite: {formatTemp(item.min)} a {formatTemp(item.max)}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </div>
    </article>
  );
}

function SystemHealth({ stats }: { stats: Stats }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Estado general</p>
          <p className="mt-1 text-3xl font-bold">{stats.compliance}%</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
          <Gauge className="size-6" />
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-650 transition-all duration-700" style={{ width: `${stats.compliance}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <StateBox value={stats.normal} label="Normal" tone="emerald" />
        <StateBox value={stats.warning} label="Vigilancia" tone="amber" />
        <StateBox value={stats.critical} label="Critico" tone="rose" />
      </div>
    </section>
  );
}

function PredictiveRisk({ risk, equipment }: { risk: number; equipment: Equipment[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Riesgo predictivo</p>
          <p className="mt-1 text-3xl font-bold">{risk}%</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
          <Activity className="size-6" />
        </div>
      </div>
      <div className="mt-6 flex h-28 items-end gap-2">
        {equipment.slice(0, 7).map((item) => (
          <div key={item.id} className="flex flex-1 flex-col gap-2">
            <div
              className="rounded-t bg-slate-500 transition-all duration-700"
              style={{ height: `${Math.max(18, riskScore(item))}%` }}
            />
            <p className="text-center text-[10px] text-slate-400 truncate w-8 mx-auto" title={item.name}>{item.name.split(" ").pop()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function KpiStrip({
  stats,
  equipment,
}: {
  stats: Stats;
  equipment: Equipment[];
}) {
  const items = [
    { label: "Equipos monitoreados", value: `${equipment.length}`, delta: `${equipment.length} sensores`, icon: Snowflake, tone: "cyan" },
    { label: "Dentro de rango", value: `${stats.compliance}%`, delta: `${stats.normal} activos`, icon: CheckCircle2, tone: "emerald" },
    { label: "Alertas activas", value: `${stats.critical}`, delta: `${stats.warning} en vigilancia`, icon: AlertTriangle, tone: "rose" },
    { label: "Tiempo respuesta", value: `0${stats.avgResponse}m`, delta: "SLA dinamico", icon: Zap, tone: "amber" },
  ];

  return (
    <div className="grid gap-4 px-4 pb-6 xl:grid-cols-4 xl:px-8">
      {items.map((item) => (
        <MetricCard key={item.label} {...item} />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone: string;
  }) {
  const styles: Record<string, string> = {
    cyan: "text-slate-700 bg-slate-50 border-slate-200",
    emerald: "text-slate-700 bg-slate-50 border-slate-200",
    rose: "text-slate-700 bg-slate-50 border-slate-200",
    amber: "text-slate-700 bg-slate-50 border-slate-200",
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          {delta ? <p className="mt-1 text-xs text-slate-500 font-medium">{delta}</p> : null}
        </div>
        <div className={`flex size-11 items-center justify-center rounded-lg border ${styles[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </section>
  );
}

// Compact option maps if table is condensed
function EquipmentTable({
  equipment,
  compact = false,
}: {
  equipment: Equipment[];
  compact?: boolean;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-slate-950">Equipos con telemetria reciente</h3>
          <p className="mt-1 text-sm text-slate-500">Temperatura, humedad, bateria, senal y estado operacional.</p>
        </div>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Todas las sedes
          <ChevronDown className="size-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Equipo</th>
              <th className="px-4 py-3 font-semibold">Temperatura</th>
              <th className="px-4 py-3 font-semibold">Tendencia</th>
              <th className="px-4 py-3 font-semibold">Humedad</th>
              <th className="px-4 py-3 font-semibold">Bateria</th>
              <th className="px-4 py-3 font-semibold">Senal</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {equipment.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                  No hay telemetría reciente. Registre sensores primero.
                </td>
              </tr>
            ) : (
              equipment.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.site} - {item.category}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <Thermometer className="size-4 text-slate-700" />
                      {formatTemp(item.temp)}
                    </span>
                  </td>
                  <td className="px-4 py-4"><MiniTrend values={item.trend} status={item.status} compact /></td>
                  <td className="px-4 py-4 text-slate-600">{item.humidity}%</td>
                  <td className="px-4 py-4 text-slate-600">{Math.round(item.battery)}%</td>
                  <td className="px-4 py-4 text-slate-600">{item.signal}%</td>
                  <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {compact ? null : (
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Frecuencia de telemetría: 3s. Conexión LTE/GSM estable.
        </div>
      )}
    </section>
  );
}

function SidePanel({ events }: { events: Event[] }) {
  return (
    <aside className="grid gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-bold text-slate-950">Acciones rapidas</h3>
        <div className="mt-4 grid gap-2">
          {[
            { label: "Registrar inspeccion", icon: ClipboardCheck },
            { label: "Programar mantenimiento", icon: Wrench },
            { label: "Validar lote sensible", icon: PackageCheck },
            { label: "Crear reporte de auditoria", icon: CalendarClock },
          ].map((action) => (
            <button key={action.label} className="flex h-11 items-center justify-between rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <action.icon className="size-4 text-slate-500" />
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-950">Eventos recientes</h3>
          <Gauge className="size-5 text-slate-400" />
        </div>
        <EventList events={events.slice(0, 5)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
            <FlaskConical className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Métricas Preventivas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control preventivo por equipo, lote y ubicacion.</p>
          </div>
        </div>
      </section>
    </aside>
  );
}

function EventList({ events }: { events: Event[] }) {
  return (
    <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-1">
      {events.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-4">Sin eventos recientes.</p>
      ) : (
        events.map((event) => (
          <div key={event.id} className="flex gap-3">
            <div className="w-12 shrink-0 text-xs font-semibold text-slate-500">{event.time}</div>
            <div className={`border-l pl-3 ${event.tone === "Critico" ? "border-rose-350" : event.tone === "Vigilancia" ? "border-amber-350" : "border-slate-350"}`}>
              <p className="text-xs font-semibold text-slate-950">{event.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{event.detail}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex min-w-20 items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold ${statusClasses(status)}`}>
      {label ?? status}
    </span>
  );
}

function StateBox({ value, label, tone }: { value: number; label: string; tone: string }) {
  const styles: Record<string, string> = {
    emerald: "bg-slate-50 text-slate-700 border border-slate-200",
    amber: "bg-slate-50 text-slate-700 border border-slate-200",
    rose: "bg-slate-50 text-slate-700 border border-slate-200",
  };

  return (
    <div className={`rounded-lg p-2 ${styles[tone]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-slate-500 font-semibold">{label}</p>
    </div>
  );
}

function MiniTrend({
  values,
  status,
  compact = false,
}: {
  values: number[];
  status: Status;
  compact?: boolean;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const color =
    status === "Critico"
      ? "bg-rose-600"
      : status === "Vigilancia"
        ? "bg-amber-500"
        : "bg-slate-600";

  return (
    <div className={`flex items-end gap-1 ${compact ? "h-8 w-28" : "mt-4 h-20"}`}>
      {values.map((value, index) => {
        const pct = max === min ? 45 : ((value - min) / (max - min)) * 70 + 18;
        return (
          <span
            key={`${value}-${index}`}
            className={`w-full rounded-t transition-all duration-700 ${color}`}
            style={{ height: `${pct}%`, opacity: 0.55 + index / values.length / 2 }}
          />
        );
      })}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-350 bg-slate-50 p-8 text-center">
      <CheckCircle2 className="mx-auto size-8 text-slate-600" />
      <h3 className="mt-3 font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function riskScore(item: Equipment) {
  const outOfRange =
    item.temp < item.min ? item.min - item.temp : item.temp > item.max ? item.temp - item.max : 0;
  const statusLoad = item.status === "Critico" ? 45 : item.status === "Vigilancia" ? 24 : 8;
  const signalLoad = Math.max(0, 90 - item.signal) * 0.35;
  const batteryLoad = Math.max(0, 65 - item.battery) * 0.25;
  return Math.min(98, Math.round(statusLoad + outOfRange * 8 + signalLoad + batteryLoad));
}
