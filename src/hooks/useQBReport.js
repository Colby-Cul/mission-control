import { useState, useEffect, useCallback } from "react";

export function useQBReport(reportName, { companyKey = "cg", startDate, endDate, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    if (!reportName || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ name: reportName, company_key: companyKey });
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`/api/qb/reports?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || `Failed to fetch ${reportName}`);
        setData(null);
      } else {
        setData(json);
        setError(null);
      }
    } catch (err) {
      setError(err.message || "Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reportName, companyKey, startDate, endDate, enabled]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return { data, loading, error, refresh: fetchReport };
}
