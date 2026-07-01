"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Snowflake, Loader2, KeyRound, Mail, AlertCircle, Info } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoCreds, setShowDemoCreds] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Credenciales incorrectas");
      }

      const user = data.user;
      if (user.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (user.companyId) {
        router.push(`/dashboard/${user.companyId}`);
      } else {
        throw new Error("Usuario sin organización asignada");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef8ff_100%)] text-gray-900 flex flex-col justify-center items-center px-4 relative">

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex size-13 items-center justify-center rounded-xl bg-white border border-sky-100 text-sky-600 font-bold shadow-sm">
            <Snowflake className="size-6" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-normal text-gray-950">COLDTRACK</h1>
          <p className="text-xs font-bold tracking-wide text-sky-700 uppercase">
            Control de Cadena de Frío
          </p>
        </div>

        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-900 mb-5">Ingreso al Sistema</h2>

          {error && (
            <div className="mb-4 p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error === "INVALID_CREDENTIALS" ? "Email o contraseña incorrectos" : error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wide text-gray-500 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-gray-400" />
                <input
                  type="email"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm text-gray-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition"
                  placeholder="nombre@organizacion.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wide text-gray-500 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 size-4 text-gray-400" />
                <input
                  type="password"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm text-gray-900 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full py-3 rounded-xl text-sm font-extrabold bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300 disabled:text-gray-500 transition flex items-center justify-center gap-2 shadow-sm shadow-sky-100"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              ¿No tiene cuenta?{" "}
              <Link href="/register" className="font-semibold text-sky-600 hover:text-sky-700">
                Registrarse
              </Link>
            </p>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowDemoCreds(!showDemoCreds)}
              className="flex items-center justify-between w-full text-gray-500 hover:text-gray-800 text-sm font-bold transition"
            >
              <span className="flex items-center gap-1.5">
                <Info className="size-3.5" />
                Credenciales de prueba
              </span>
              <span>{showDemoCreds ? "Ocultar" : "Mostrar"}</span>
            </button>

            {showDemoCreds && (
              <div className="mt-3 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {[
                  { label: "Administrador Global", email: "admin@coldtrack.ai" },
                  { label: "Clínica Santa Aurora", email: "valeria@santaaurora.pe" },
                  { label: "Laboratorio BioNorte", email: "andrea@bionorte.pe" },
                  { label: "Banco de Sangre VitalRed", email: "luis@vitalred.pe" },
                ].map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => fillDemoCredentials(cred.email)}
                    className="w-full text-left p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs transition block"
                  >
                    <p className="font-bold text-gray-700">{cred.label}</p>
                    <p className="text-gray-500 mt-0.5">{cred.email} (pass: password123)</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
