
export interface StoreMetrics {
  name: string;
  sales: number;
  salesLY: number;
  salesTarget: number;
  achievement: number;
  visitors: number;
  visitorsLY: number;
  atv: number;
  atvLY: number;
  transactions: number;
  transactionsLY: number;
  conversionRate: number;
  conversionRateLY: number;
  salesPerVisitor: number;
  salesPerVisitorLY: number;
}

export interface ComparisonMetric {
  current: number;
  previous: number;
  diff: number;
  pctChange: number;
}

export interface StoreComparison {
  name: string;
  metrics: {
    sales: ComparisonMetric;
    visitors: ComparisonMetric;
    atv: ComparisonMetric;
    transactions: ComparisonMetric;
    conversionRate: ComparisonMetric;
    salesPerVisitor: ComparisonMetric;
  };
}

export interface MonthlyData {
  month: string;
  totalSales: number;
  totalSalesLY: number;
  areaTarget: number;
  stores: StoreMetrics[];
}

export type MonthKey = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec' | 'All';
