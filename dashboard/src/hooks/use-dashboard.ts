"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "@/lib/api/dashboard-client";
import { DashboardApiError } from "@/lib/api/dashboard-errors";
import type { DashboardData, DashboardErrorCode } from "@/types/dashboard";

export type DashboardState = {
  data: DashboardData | null;
  isLoading: boolean;
  errorCode: DashboardErrorCode | null;
  errorMessage: string | null;
};

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: true,
    errorCode: null,
    errorMessage: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      errorCode: null,
      errorMessage: null,
    }));

    try {
      const data = await fetchDashboard({ signal: controller.signal });
      if (controller.signal.aborted) return;

      setState({
        data,
        isLoading: false,
        errorCode: null,
        errorMessage: null,
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      const apiError =
        error instanceof DashboardApiError
          ? error
          : new DashboardApiError("unknown", "Something went wrong while loading dashboard data.");

      setState({
        data: null,
        isLoading: false,
        errorCode: apiError.code,
        errorMessage: apiError.message,
      });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}
