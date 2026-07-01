import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Empresa | COLDTRACK AI+",
  description: "Monitoreo inteligente de cadena de frío y telemetría de sensores por empresa.",
};

export default function CompanyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#f6f8fb] text-slate-950">{children}</div>;
}
