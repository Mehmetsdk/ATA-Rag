import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { AppShell } from "@/components/layout/app-shell";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardRoutePage() {
  return (
    <AppShell activeNav="dashboard">
      <DashboardPage />
    </AppShell>
  );
}
