"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Snowflake,
  Loader2,
  KeyRound,
  Mail,
  AlertCircle,
  Info,
  Building2,
  User,
  FileText,
} from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    ruc: "",
    contactEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.detail || data.error || "Error al registrarse");
      }

      const user = data.user;
      if (user.companyId) {
        router.push(`/dashboard/${user.companyId}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
      setLoading(false);
    }
  };

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="flex size-12 items-center justify-center rounded-xl bg-white border border-gray-200 text-sky-600 font-bold shadow-sm">
            <Snowflake className="size-6" />
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-gray-900">COLDTRACK</h1>
          <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
            Registro de Organización
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Crear cuenta</h2>
          <p className="text-xs text-gray-500 mb-5">
            Registre su organización y comience a monitorear la cadena de frío.
          </p>

          {error && (
            <div className="mb-4 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-gray-900 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 outline-none transition"
                    placeholder="Juan Pérez"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-gray-900 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 outline-none transition"
                    placeholder="nombre@organizacion.pe"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 size-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-gray-900 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 outline-none transition"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                Datos de la organización
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 outline-none transition"
                    placeholder="Clínica Santa Aurora"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      RUC
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 size-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        pattern="[0-9]{11}"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-gray-900 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 outline-none transition"
                        placeholder="20123456789"
                        value={form.ruc}
                        onChange={(e) => update("ruc", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Email de contacto
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:border-sky-400 focus:ring-1 focus:ring-sky-100 outline-none transition"
                      placeholder="operaciones@empresa.pe"
                      value={form.contactEmail}
                      onChange={(e) => update("contactEmail", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300 disabled:text-gray-500 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              ¿Ya tiene cuenta?{" "}
              <Link href="/" className="font-semibold text-sky-600 hover:text-sky-700">
                Iniciar sesión
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-sky-50 border border-sky-100 rounded-xl flex gap-2">
            <Info className="size-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-sky-800 leading-relaxed">
              Al registrarse obtendrá un plan Trial Starter con acceso al panel de monitoreo de sensores.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
