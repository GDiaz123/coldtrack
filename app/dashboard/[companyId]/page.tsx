import { ColdtrackDashboard } from "@/components/coldtrack-dashboard";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <ColdtrackDashboard companyId={companyId} />;
}
