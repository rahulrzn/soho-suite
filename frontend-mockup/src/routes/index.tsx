import { createFileRoute } from "@tanstack/react-router";

import { mockDashboardKpis, mockHealthScore, mockInsights, mockRevenueTrend, mockStockAlerts, mockTopCategories } from "@/soho/mocks/dashboard";
import { mockActivity } from "@/soho/mocks/workspace-admin";
import { mockBusiness, mockCurrentUser } from "@/soho/mocks/workspace";
import { DashboardScreen } from "@/soho/screens/dashboard-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Soho Suite" },
      { name: "description", content: "Business health score, revenue trends and key metrics for your small business." },
      { property: "og:title", content: "Dashboard · Soho Suite" },
      { property: "og:description", content: "Business health score, revenue trends and key metrics for your small business." },
    ],
  }),
  component: DashboardPage,
});

/** Route = container: supplies data to the presentational screen. Replace mocks with real data here. */
function DashboardPage() {
  return (
    <DashboardScreen
      userFirstName={mockCurrentUser.name.split(" ")[0]}
      businessName={mockBusiness.name}
      dateLabel="Wednesday, November 4"
      health={mockHealthScore}
      kpis={mockDashboardKpis}
      revenueTrend={mockRevenueTrend}
      insights={mockInsights}
      topCategories={mockTopCategories}
      stockAlerts={mockStockAlerts}
      recentActivity={mockActivity}
    />
  );
}
