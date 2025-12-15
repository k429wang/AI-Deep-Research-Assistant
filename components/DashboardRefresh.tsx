'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component that refreshes the dashboard data when mounted.
 * This ensures the dashboard always shows up-to-date data when navigating back.
 */
export default function DashboardRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Refresh the router to fetch fresh server data
    router.refresh();
  }, [router]);

  return null;
}

