import CsrDonationsDashboard from "@/app/components/CsrDonationsDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  getCsrAdminInitialData,
  type CommunityUpdate,
  type CsrDashboardSummary as DataCsrDashboardSummary,
  type DonationDrive,
  type DonationImpactStats,
  type DonationRequest,
  type RestorationStory,
} from "@/lib/csr-data";

export const dynamic = "force-dynamic";

export default async function CsrDonationsAdminPage() {
  const user = await requireAdminUser("/admin/csr-donations");

  let requests: DonationRequest[] = [];
  let drives: DonationDrive[] = [];
  let stories: RestorationStory[] = [];
  let updates: CommunityUpdate[] = [];
  let impactStats: DonationImpactStats | null = null;
  let summary: DataCsrDashboardSummary = {
    donationRequestsReceived: 0,
    upcomingDonationDrives: 0,
    pairsCollected: 0,
    pairsRestored: 0,
    pairsDonated: 0,
    publishedCommunityUpdates: 0,
  };
  let initialLoadError: string | null = null;

  try {
    const initial = await getCsrAdminInitialData();
    requests = initial.requests;
    drives = initial.drives;
    stories = initial.stories;
    updates = initial.updates;
    impactStats =
      initial.impactStats.updatedAt === new Date(0).toISOString()
        ? null
        : initial.impactStats;
    summary = initial.summary;
  } catch {
    initialLoadError =
      "We could not load CSR records. Confirm the D1 migration has been applied and try again.";
  }

  return (
    <CsrDonationsDashboard
      initialRequests={requests}
      initialDrives={drives}
      initialStories={stories}
      initialUpdates={updates}
      initialImpactStats={impactStats}
      initialSummary={summary}
      ownerName={user.displayName}
      initialLoadError={initialLoadError}
    />
  );
}
