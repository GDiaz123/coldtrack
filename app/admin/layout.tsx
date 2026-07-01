import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super Admin | COLDTRACK AI+",
  description: "Panel de control global para administración de la plataforma SaaS Coldtrack.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50 text-gray-900">{children}</div>;
}
