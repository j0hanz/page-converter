'use client';

import { useReportWebVitals } from 'next/web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
}

const reportWebVital = (metric: WebVitalMetric) => {
  console.debug('[web-vitals]', metric.name, Math.round(metric.value));
};

export function WebVitals() {
  useReportWebVitals(reportWebVital);
  return null;
}
