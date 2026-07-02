"use client";

import React, { useState } from "react";
import { useAdminDashboard } from "@/lib/hooks/use-admin-dashboard";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Building2,
  Users,
  Settings,
  Bell,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  Search,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  CreditCard,
  LogOut,
} from "lucide-react";
import type { Company, AppUser, PlanCode, CompanyStatus, UserRole } from "@/lib/domain/coldtrack";

type AdminView = "Dashboard" | "Empresas" | "Usuarios" | "Planes" | "Eventos" | "Configuración";

export function AdminDashboard() {
  const { loading: authLoading, logout } = useAuth("SUPER_ADMIN");
  const {
    data,
    loading,
    error,
    createCompany,
    updateCompany,
    deleteCompany,
    createUser,
    updateUser,
    deleteUser,
  } = useAdminDashboard();

  const [activeView, setActiveView] = useState<AdminView>("Dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    ruc: "",
    status: "ACTIVE" as CompanyStatus,
    plan: "STARTER" as PlanCode,
    contactEmail: "",
    alertPhone: "",
    registrationKey: "",
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "SUPERVISOR" as UserRole,
    status: "ACTIVE" as "ACTIVE" | "INVITED" | "DISABLED",
    companyId: "" as string,
  });

  const [actionError, setActionError] = useState<string | null>(null);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto size-12 animate-spin text-gray-500" />
          <p className="mt-4 text-gray-500 font-medium">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900 p-6">
        <div className="max-w-md text-center bg-white border border-gray-200 rounded-2xl p-8 shadow-xl">
          <AlertTriangle className="mx-auto size-16 text-rose-500 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-gray-800">Error de conexión</h3>
          <p className="mt-2 text-gray-500 leading-relaxed">
            No se pudo establecer conexión con el servidor. Por favor, intente recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-200 transition rounded-xl font-semibold shadow-lg text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { stats, companies, users: userList, events, plans } = data;
  const billablePlans = plans.filter((plan) => plan.code === "STARTER" || plan.code === "PRO");
  const planLabels: Record<string, string> = {
    STARTER: "Basico - S/ 1200",
    PRO: "Premium - $1600",
  };

  const handleOpenCompanyModal = (company: Company | null = null) => {
    setActionError(null);
    if (company) {
      setSelectedCompany(company);
      setCompanyForm({
        name: company.name,
        ruc: company.ruc,
        status: company.status,
        plan: company.plan,
        contactEmail: company.contactEmail,
        alertPhone: company.alertPhone ?? "",
        registrationKey: company.registrationKey ?? "",
      });
    } else {
      setSelectedCompany(null);
      setCompanyForm({
        name: "",
        ruc: "",
        status: "ACTIVE",
        plan: "STARTER",
        contactEmail: "",
        alertPhone: "",
        registrationKey: "",
      });
    }
    setShowCompanyModal(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (selectedCompany) {
        await updateCompany(selectedCompany.id, companyForm);
      } else {
        await createCompany(companyForm);
      }
      setShowCompanyModal(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al guardar empresa");
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (confirm("¿Está seguro de eliminar esta empresa? Todos los sensores y usuarios asociados serán eliminados.")) {
      try {
        await deleteCompany(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar empresa");
      }
    }
  };

  const handleOpenUserModal = (user: AppUser | null = null) => {
    setActionError(null);
    if (user) {
      setSelectedUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        companyId: user.companyId || "",
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        name: "",
        email: "",
        role: "SUPERVISOR",
        status: "ACTIVE",
        companyId: "",
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const payload = {
        ...userForm,
        companyId: userForm.companyId === "" ? null : userForm.companyId,
      };

      if (selectedUser) {
        await updateUser(selectedUser.id, payload);
      } else {
        await createUser(payload);
      }
      setShowUserModal(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al guardar usuario");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este usuario?")) {
      try {
        await deleteUser(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al eliminar usuario");
      }
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">Crítico</span>;
      case "WARNING":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Advertencia</span>;
      case "OFFLINE":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-500/20 text-gray-500 border border-slate-500/30">Desconectado</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Normal</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white backdrop-blur-xl flex flex-col justify-between p-5 shrink-0 hidden md:flex">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-gray-200 text-white font-bold text-xl">
              C
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">COLDTRACK</p>
              <h1 className="text-base font-extrabold tracking-tight">Administración</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveView("Dashboard")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                activeView === "Dashboard"
                  ? "bg-sky-600 text-white border border-sky-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              }`}
            >
              <TrendingUp className="size-4.5" />
              Panel General
            </button>
            <button
              onClick={() => setActiveView("Empresas")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                activeView === "Empresas"
                  ? "bg-sky-600 text-white border border-sky-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              }`}
            >
              <Building2 className="size-4.5" />
              Empresas
            </button>
            <button
              onClick={() => setActiveView("Usuarios")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                activeView === "Usuarios"
                  ? "bg-sky-600 text-white border border-sky-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              }`}
            >
              <Users className="size-4.5" />
              Usuarios
            </button>
            <button
              onClick={() => setActiveView("Planes")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                activeView === "Planes"
                  ? "bg-sky-600 text-white border border-sky-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              }`}
            >
              <CreditCard className="size-4.5" />
              Planes de Servicio
            </button>
            <button
              onClick={() => setActiveView("Eventos")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                activeView === "Eventos"
                  ? "bg-sky-600 text-white border border-sky-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              }`}
            >
              <Bell className="size-4.5" />
              Logs de Control
            </button>
            <button
              onClick={() => setActiveView("Configuración")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                activeView === "Configuración"
                  ? "bg-sky-600 text-white border border-sky-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
              }`}
            >
              <Settings className="size-4.5" />
              Configuración
            </button>
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-xs font-semibold">Sistema en línea</p>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Sincronización activa.</p>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-white hover:bg-gray-100 hover:text-white border border-gray-200 text-gray-500 transition"
          >
            <LogOut className="size-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Administración del Sistema</span>
              <span>/</span>
              <span className="text-gray-800 font-medium">{activeView}</span>
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-300">
                Sincronizado {new Date(data.updatedAt).toLocaleTimeString("es-PE")}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
              {activeView === "Dashboard" ? "Panel de Control" : activeView}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile View Indicators */}
            <div className="flex md:hidden gap-1 overflow-x-auto py-1 max-w-xs scrollbar-none">
              {(["Dashboard", "Empresas", "Usuarios", "Planes", "Eventos"] as AdminView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setActiveView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                    activeView === v ? "bg-sky-600 text-white" : "bg-white text-gray-500"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <label className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 w-64 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-100 transition">
              <Search className="size-4 shrink-0" />
              <input
                className="w-full bg-transparent text-gray-800 outline-none placeholder:text-gray-400 text-xs"
                placeholder="Buscar empresas, RUC, correos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>

            {activeView === "Empresas" && (
              <button
                onClick={() => handleOpenCompanyModal()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 px-4 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="size-4" />
                Registrar Empresa
              </button>
            )}

            {activeView === "Usuarios" && (
              <button
                onClick={() => handleOpenUserModal()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 px-4 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="size-4" />
                Agregar Usuario
              </button>
            )}

            <button
              onClick={logout}
              className="md:hidden inline-flex size-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-white"
              title="Cerrar sesión"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </header>

        {/* View Layouts */}
        <div className="p-6 space-y-6">
          {activeView === "Dashboard" && (
            <>
              {/* KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group hover:border-gray-300 transition duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition duration-300">
                    <Building2 className="size-24 text-gray-900" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Total Empresas</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-white">{stats.companies}</p>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                    {stats.activeCompanies} activas en red
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group hover:border-gray-300 transition duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition duration-300">
                    <Zap className="size-24 text-gray-900" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Sensores Registrados</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-white">{stats.sensors}</p>
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold flex items-center gap-1">
                    <AlertTriangle className="size-3" /> {stats.criticalSensors} desviaciones activas
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group hover:border-gray-300 transition duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition duration-300">
                    <DollarSign className="size-24 text-gray-900" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Ingresos del Servicio</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-white">${stats.monthlyRevenueUsd}</p>
                  <p className="text-[10px] text-emerald-400 mt-1 font-semibold">Facturación mensual</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden group hover:border-gray-300 transition duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition duration-300">
                    <ShieldCheck className="size-24 text-gray-900" />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Cumplimiento de Rangos</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-white">{stats.avgCompliance}%</p>
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${stats.avgCompliance}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Main dashboard content */}
              <div className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr]">
                {/* Recent companies */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-sm">Empresas Registradas</h3>
                    <button
                      onClick={() => setActiveView("Empresas")}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition"
                    >
                      Ver todas <ArrowRight className="size-3" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead>
                        <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                          <th className="pb-3">Razón Social</th>
                          <th className="pb-3">Plan</th>
                          <th className="pb-3">RUC</th>
                          <th className="pb-3">Email de Contacto</th>
                          <th className="pb-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {companies.slice(0, 5).map((comp) => (
                          <tr key={comp.id} className="hover:bg-gray-200/30 transition duration-150">
                            <td className="py-3 font-semibold text-gray-800">{comp.name}</td>
                            <td className="py-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                {comp.plan}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">{comp.ruc}</td>
                            <td className="py-3 text-gray-500">{comp.contactEmail}</td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  comp.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : comp.status === "TRIAL"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}
                              >
                                {comp.status === "ACTIVE"
                                  ? "Activo"
                                  : comp.status === "TRIAL"
                                    ? "Prueba"
                                    : "Suspendido"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Events list */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 text-sm mb-4">Eventos Recientes</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {events.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-xs">
                        No hay eventos registrados recientemente.
                      </div>
                    ) : (
                      events.map((ev) => (
                        <div key={ev.id} className="flex gap-3 border-l-2 border-gray-200 pl-3 py-1">
                          <div className="shrink-0 text-[10px] font-bold text-gray-400">
                            {new Date(ev.createdAt).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-800">{ev.title}</p>
                              {getSeverityBadge(ev.severity)}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{ev.detail}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Empresas view */}
          {activeView === "Empresas" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-sm">Empresas Registradas</h3>
                <span className="text-xs text-gray-400">{companies.length} en total</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                      <th className="pb-3 px-2">Nombre</th>
                      <th className="pb-3 px-2">RUC</th>
                      <th className="pb-3 px-2">Plan</th>
                      <th className="pb-3 px-2">Correo de Contacto</th>
                      <th className="pb-3 px-2">Fecha de Registro</th>
                      <th className="pb-3 px-2">Estado</th>
                      <th className="pb-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {companies
                      .filter((c) =>
                        searchTerm
                          ? c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.ruc.includes(searchTerm) ||
                            c.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
                          : true
                      )
                      .map((comp) => (
                        <tr key={comp.id} className="hover:bg-gray-200/30 transition duration-150">
                          <td className="py-3.5 px-2 font-semibold text-gray-800">
                            <div>{comp.name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">ID: {comp.id}</div>
                          </td>
                          <td className="py-3.5 px-2 text-gray-500">{comp.ruc}</td>
                          <td className="py-3.5 px-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-slate-850">
                              {comp.plan}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-gray-500">{comp.contactEmail}</td>
                          <td className="py-3.5 px-2 text-gray-500">
                            {new Date(comp.createdAt).toLocaleDateString("es-PE")}
                          </td>
                          <td className="py-3.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                comp.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : comp.status === "TRIAL"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {comp.status === "ACTIVE"
                                ? "Activo"
                                : comp.status === "TRIAL"
                                  ? "Prueba"
                                  : "Suspendido"}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenCompanyModal(comp)}
                                className="p-1.5 hover:bg-gray-100 hover:text-white rounded-lg text-gray-500 transition"
                                title="Editar"
                              >
                                <Edit className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCompany(comp.id)}
                                className="p-1.5 hover:bg-rose-950/30 hover:text-rose-400 rounded-lg text-gray-500 transition"
                                title="Eliminar"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Usuarios view */}
          {activeView === "Usuarios" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-sm">Lista de Usuarios</h3>
                <span className="text-xs text-gray-400">{userList.length} usuarios</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                      <th className="pb-3 px-2">Nombre</th>
                      <th className="pb-3 px-2">Email</th>
                      <th className="pb-3 px-2">Organización</th>
                      <th className="pb-3 px-2">Rol</th>
                      <th className="pb-3 px-2">Estado</th>
                      <th className="pb-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {userList
                      .filter((u) =>
                        searchTerm
                          ? u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email.toLowerCase().includes(searchTerm.toLowerCase())
                          : true
                      )
                      .map((user) => {
                        const userCompany = companies.find((c) => c.id === user.companyId);
                        return (
                          <tr key={user.id} className="hover:bg-gray-200/30 transition duration-150">
                            <td className="py-3.5 px-2 font-semibold text-gray-800">{user.name}</td>
                            <td className="py-3.5 px-2 text-gray-500">{user.email}</td>
                            <td className="py-3.5 px-2 font-medium text-gray-700">
                              {userCompany ? (
                                <span className="text-gray-700 font-semibold">{userCompany.name}</span>
                              ) : (
                                <span className="text-gray-400 italic">Administrador del Sistema</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  user.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : user.status === "INVITED"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}
                              >
                                {user.status === "ACTIVE"
                                  ? "Activo"
                                  : user.status === "INVITED"
                                    ? "Invitado"
                                    : "Deshabilitado"}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenUserModal(user)}
                                  className="p-1.5 hover:bg-gray-100 hover:text-white rounded-lg text-gray-500 transition"
                                  title="Editar"
                                >
                                  <Edit className="size-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1.5 hover:bg-rose-950/30 hover:text-rose-400 rounded-lg text-gray-500 transition"
                                  title="Eliminar"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Planes view */}
          {activeView === "Planes" && (
            <div className="grid gap-6 md:grid-cols-2">
              {billablePlans.map((p) => (
                <div
                  key={p.code}
                  className="bg-white border border-gray-200 rounded-2xl p-6 relative flex flex-col justify-between hover:border-gray-300 hover:shadow-xl transition duration-300"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                        Licencia de Servicio
                      </span>
                      <CreditCard className="size-5 text-gray-500" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">{p.name}</h4>
                    <p className="mt-1 text-gray-400 text-xs">Monitoreo de cadena de frío inteligente</p>
                    <div className="mt-4 flex items-baseline text-gray-900">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {p.priceLabel ?? planLabels[p.code] ?? `$${p.priceMonthlyUsd}`}
                      </span>
                      <span className="ml-1 text-xs text-gray-400 font-semibold">/mes</span>
                    </div>

                    <ul className="mt-6 space-y-3 text-xs text-gray-500">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        Hasta <span className="font-bold text-gray-800">{p.maxSensors}</span> sensores de temperatura
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        Historial de logs de control en vivo
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        Notificaciones automáticas
                      </li>
                    </ul>
                  </div>

                  <button className="mt-8 w-full py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white border border-sky-600 transition">
                    Detalles de Facturación
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Eventos view */}
          {activeView === "Eventos" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-sm">Historial General de Logs</h3>
                <span className="text-xs text-gray-400">Eventos de red globales</span>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-xs">
                    No hay eventos registrados recientemente.
                  </div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="flex gap-4 border-l-2 border-gray-300 pl-4 py-2 hover:bg-gray-100/20 rounded-r-lg transition">
                      <div className="shrink-0 text-xs font-bold text-gray-400">
                        {new Date(ev.createdAt).toLocaleString("es-PE")}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{ev.title}</p>
                          {getSeverityBadge(ev.severity)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ev.detail}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                          <span>Empresa: <strong className="text-gray-500">{ev.companyId}</strong></span>
                          {ev.sensorId && <span>Sensor ID: <strong className="text-gray-500">{ev.sensorId}</strong></span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Configuración view */}
          {activeView === "Configuración" && (
            <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl p-5 space-y-6">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Ajustes Generales del Sistema</h3>
                <p className="text-gray-400 text-xs mt-1">Configuración del motor de red, almacenamiento y alertas de Coldtrack.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50/40">
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">Transmisión de Datos en Vivo</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Permite la variación y generación continua de telemetría de sensores.</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-700"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50/40">
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">Notificaciones en Alertas Críticas</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Enviar notificaciones a los supervisores de las empresas cuando hay desviaciones críticas.</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-700"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50/40">
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">Retención de Logs de Auditoría</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5">Días que se mantendrán los eventos y trazas térmicas en memoria.</p>
                  </div>
                  <select className="bg-gray-100 border border-gray-300 text-gray-800 rounded-lg text-xs p-1 px-2 focus:ring-1 focus:ring-slate-700 outline-none">
                    <option value="30">30 días</option>
                    <option value="60">60 días</option>
                    <option value="90">90 días</option>
                    <option value="365">1 año</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
              <h3 className="font-bold text-gray-800 text-sm">
                {selectedCompany ? "Editar Empresa" : "Registrar Nueva Empresa"}
              </h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-gray-500 hover:text-gray-800 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-5 space-y-4">
              {actionError && (
                <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                  placeholder="Ej. Clínica Santa Aurora S.A.C."
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    RUC
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                    placeholder="20XXXXXXXXX"
                    value={companyForm.ruc}
                    onChange={(e) => setCompanyForm({ ...companyForm, ruc: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Correo de Contacto
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                    placeholder="admin@empresa.com"
                    value={companyForm.contactEmail}
                    onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Plan
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                    value={companyForm.plan}
                    onChange={(e) => setCompanyForm({ ...companyForm, plan: e.target.value as PlanCode })}
                  >
                    <option value="STARTER">Basico - S/ 1200/mes</option>
                    <option value="PRO">Premium - $1600/mes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                    value={companyForm.status}
                    onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.value as CompanyStatus })}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="TRIAL">Prueba (Trial)</option>
                    <option value="SUSPENDED">Suspendido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Telefono de Alertas
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                    placeholder="+51900111222"
                    value={companyForm.alertPhone}
                    onChange={(e) => setCompanyForm({ ...companyForm, alertPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Key de Registro
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none uppercase"
                    placeholder="EMPRESA-2026"
                    value={companyForm.registrationKey}
                    onChange={(e) => setCompanyForm({ ...companyForm, registrationKey: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-slate-750 text-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-950 hover:bg-slate-350 transition"
                >
                  {selectedCompany ? "Actualizar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
              <h3 className="font-bold text-gray-800 text-sm">
                {selectedUser ? "Editar Usuario" : "Registrar Usuario"}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-500 hover:text-gray-800 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              {actionError && (
                <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                  placeholder="Ej. Juan Pérez"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Email institucional
                </label>
                <input
                  type="email"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                  placeholder="juan.perez@santaaurora.pe"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Empresa Vinculada
                </label>
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                  value={userForm.companyId}
                  onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                >
                  <option value="">Administrador General</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Rol
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="TECHNICIAN">Técnico</option>
                    <option value="AUDITOR">Auditor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:border-gray-300 outline-none"
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value as "ACTIVE" | "INVITED" | "DISABLED" })}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INVITED">Invitado</option>
                    <option value="DISABLED">Deshabilitado</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-slate-750 text-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-950 hover:bg-slate-350 transition"
                >
                  {selectedUser ? "Actualizar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
