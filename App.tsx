
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Target, 
  BarChart3, 
  Calendar,
  Table as TableIcon,
  Download,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Printer,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { MONTHS, DASHBOARD_DATA } from './constants';
import { MonthKey, StoreComparison, ComparisonMetric, MonthlyData, StoreMetrics } from './types';

// Formatting helpers
const formatSAR = (val: number) => 
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(val);

const formatNumber = (val: number) => 
  new Intl.NumberFormat('en-US').format(Math.round(val));

const formatCompactNumber = (val: number) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
};

const formatPercent = (val: number) => `${val.toFixed(1)}%`;

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>('All');
  const [chartMetric, setChartMetric] = useState<'sales' | 'visitors' | 'target'>('sales');

  const activeData = useMemo((): MonthlyData => {
    if (selectedMonth !== 'All') {
      return DASHBOARD_DATA[selectedMonth];
    }

    const allMonths = Object.keys(DASHBOARD_DATA) as Exclude<MonthKey, 'All'>[];
    const yearlyStores: Record<string, StoreMetrics> = {};
    
    let totalSales = 0;
    let totalSalesLY = 0;
    let areaTarget = 0;

    allMonths.forEach(mKey => {
      const monthData = DASHBOARD_DATA[mKey];
      totalSales += monthData.totalSales;
      totalSalesLY += monthData.totalSalesLY;
      areaTarget += monthData.areaTarget;

      monthData.stores.forEach(s => {
        if (!yearlyStores[s.name]) {
          yearlyStores[s.name] = { ...s };
        } else {
          const existing = yearlyStores[s.name];
          existing.sales += s.sales;
          existing.salesLY += s.salesLY;
          existing.salesTarget += s.salesTarget;
          existing.visitors += s.visitors;
          existing.visitorsLY += s.visitorsLY;
          existing.transactions += s.transactions;
          existing.transactionsLY += s.transactionsLY;
          existing.salesPerVisitor += s.salesPerVisitor; // This will be averaged later or recalculated
          existing.salesPerVisitorLY += s.salesPerVisitorLY;
        }
      });
    });

    const stores = Object.values(yearlyStores).map(s => ({
      ...s,
      achievement: s.salesTarget > 0 ? (s.sales / s.salesTarget) * 100 : 0,
      atv: s.transactions > 0 ? s.sales / s.transactions : 0,
      atvLY: s.transactionsLY > 0 ? s.salesLY / s.transactionsLY : 0,
      conversionRate: s.visitors > 0 ? (s.transactions / s.visitors) * 100 : 0,
      conversionRateLY: s.visitorsLY > 0 ? (s.transactionsLY / s.visitorsLY) * 100 : 0,
      // Recalculate true Yearly SPV to avoid average of averages
      salesPerVisitor: s.visitors > 0 ? s.sales / s.visitors : 0,
      salesPerVisitorLY: s.visitorsLY > 0 ? s.salesLY / s.visitorsLY : 0,
    }));

    return {
      month: 'Yearly Total',
      totalSales,
      totalSalesLY,
      areaTarget,
      stores
    };
  }, [selectedMonth]);
  
  const comparisonData = useMemo((): StoreComparison[] => {
    return activeData.stores.map(currentStore => {
      const calcMetric = (curr: number, prev: number = 0): ComparisonMetric => ({
        current: curr,
        previous: prev,
        diff: curr - prev,
        pctChange: prev !== 0 ? ((curr - prev) / prev) * 100 : 0
      });

      return {
        name: currentStore.name,
        metrics: {
          sales: calcMetric(currentStore.sales, currentStore.salesLY),
          visitors: calcMetric(currentStore.visitors, currentStore.visitorsLY),
          atv: calcMetric(currentStore.atv, currentStore.atvLY),
          transactions: calcMetric(currentStore.transactions, currentStore.transactionsLY),
          conversionRate: calcMetric(currentStore.conversionRate, currentStore.conversionRateLY),
          salesPerVisitor: calcMetric(currentStore.salesPerVisitor, currentStore.salesPerVisitorLY),
        }
      };
    });
  }, [activeData]);

  const yearlyComparisonChartData = useMemo(() => {
    return MONTHS.map(m => {
      const monthData = DASHBOARD_DATA[m.key as Exclude<MonthKey, 'All'>];
      if (chartMetric === 'sales') {
        return {
          name: m.label,
          current: monthData.totalSales,
          previous: monthData.totalSalesLY,
        };
      } else if (chartMetric === 'visitors') {
        const currentVisitors = monthData.stores.reduce((acc, s) => acc + s.visitors, 0);
        const previousVisitors = monthData.stores.reduce((acc, s) => acc + s.visitorsLY, 0);
        return {
          name: m.label,
          current: currentVisitors,
          previous: previousVisitors,
        };
      } else {
        const currentSales = monthData.totalSales;
        const targetSales = monthData.areaTarget;
        return {
          name: m.label,
          current: currentSales,
          previous: targetSales,
        };
      }
    });
  }, [chartMetric]);

  const totalSummary = useMemo(() => {
    const sales = activeData.stores.reduce((acc, s) => acc + s.sales, 0);
    const target = activeData.stores.reduce((acc, s) => acc + s.salesTarget, 0);
    const visitors = activeData.stores.reduce((acc, s) => acc + s.visitors, 0);
    const achievement = target > 0 ? (sales / target) * 100 : 0;
    return { sales, target, visitors, achievement };
  }, [activeData]);

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Store,Period,Metric,Current (2025),Previous (2024),Difference,Change%\n";
    comparisonData.forEach(store => {
      (Object.entries(store.metrics) as [string, ComparisonMetric][]).forEach(([key, m]) => {
        csvContent += `${store.name},${selectedMonth === 'All' ? 'Full Year' : selectedMonth},${key},${m.current},${m.previous},${m.diff},${m.pctChange.toFixed(2)}%\n`;
      });
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Store_Performance_${selectedMonth}_2025.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen pb-12 bg-[#FAFAFA]">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          .card-break { break-inside: avoid; margin-bottom: 5mm !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
          .print-grid-4 { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; }
        }
      `}</style>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
              <BarChart3 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Retail Intel <span className="text-orange-500">2025</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md">
              <Printer className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 print-full-width">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-6 items-center justify-between no-print">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Report Period</label>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value as MonthKey)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-sm font-bold text-slate-700 w-64"
            >
              <option value="All">Full Year 2025</option>
              {MONTHS.map(m => (
                <option key={m.key} value={m.key}>{m.label} 2025</option>
              ))}
            </select>
          </div>
          <div className="bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 text-orange-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Period: {selectedMonth === 'All' ? '2025 Total' : selectedMonth}
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard title="Global Sales" value={formatSAR(totalSummary.sales)} icon={<TrendingUp />} color="orange" subtitle={`Target: ${formatSAR(totalSummary.target)}`} />
          <SummaryCard title="Achievement" value={formatPercent(totalSummary.achievement)} icon={<Target />} color="emerald" progress={totalSummary.achievement} />
          <SummaryCard title="Visitors" value={formatNumber(totalSummary.visitors)} icon={<Users />} color="indigo" />
        </section>

        <section className="mb-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm card-break">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-4 bg-orange-500 rounded-full" /> Performance Trend
            </h2>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center no-print">
              {(['sales', 'visitors', 'target'] as const).map(m => (
                <button key={m} onClick={() => setChartMetric(m)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${chartMetric === m ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 uppercase'}`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyComparisonChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} tickFormatter={formatCompactNumber} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="current" fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="previous" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 mb-12">
          {activeData.stores.map((store) => (
            <div key={store.name} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden card-break hover:border-orange-300 transition-colors">
              <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm">{store.name}</h3>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-100">
                  {formatPercent(store.achievement)} ACH
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 print-grid-4">
                <MetricBox label="Sales" value={formatSAR(store.sales)} subValue={`Target: ${formatSAR(store.salesTarget)}`} />
                <MetricBox label="Visitors" value={formatNumber(store.visitors)} subValue={`Conv: ${formatPercent(store.conversionRate)}`} />
                <MetricBox label="ATV" value={formatSAR(store.atv)} />
                <MetricBox label="SPV" value={formatSAR(store.salesPerVisitor)} color="orange" />
              </div>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-break">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Growth Analysis Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 font-black uppercase border-b border-slate-200">
                  <th className="px-6 py-4">Branch / KPI</th>
                  <th className="px-4 py-4 text-center">2025 Value</th>
                  <th className="px-4 py-4 text-center">2024 Value</th>
                  <th className="px-4 py-4 text-center">Difference</th>
                  <th className="px-6 py-4 text-center">Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData.map((store) => (
                  <React.Fragment key={store.name}>
                    <tr className="bg-orange-50/20"><td colSpan={5} className="px-6 py-2 font-black text-orange-600 uppercase text-[10px]">{store.name}</td></tr>
                    <ComparisonRow label="Sales" metric={store.metrics.sales} isCurrency />
                    <ComparisonRow label="Visitors" metric={store.metrics.visitors} />
                    <ComparisonRow label="ATV" metric={store.metrics.atv} isCurrency />
                    <ComparisonRow label="SPV" metric={store.metrics.salesPerVisitor} isCurrency />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricBox({ label, value, subValue, color }: any) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
      <p className={`text-lg font-black ${color === 'orange' ? 'text-orange-600' : 'text-slate-900'}`}>{value}</p>
      {subValue && <p className="text-[10px] text-slate-500 font-bold">{subValue}</p>}
    </div>
  );
}

function ComparisonRow({ label, metric, isCurrency }: { label: string; metric: ComparisonMetric; isCurrency?: boolean }) {
  const format = (val: number) => isCurrency ? formatSAR(val) : formatNumber(val);
  const isPos = metric.diff >= 0;
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-3 font-bold text-slate-600 flex items-center gap-2"><ChevronRight className="w-3 h-3 text-slate-300" />{label}</td>
      <td className="px-4 py-3 text-center font-black text-slate-900">{format(metric.current)}</td>
      <td className="px-4 py-3 text-center text-slate-400 font-medium italic">{format(metric.previous)}</td>
      <td className={`px-4 py-3 text-center font-extrabold ${metric.diff > 0 ? 'text-emerald-600' : metric.diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
        {metric.diff > 0 ? '+' : ''}{format(metric.diff)}
      </td>
      <td className="px-6 py-3 text-center">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-black text-[10px] ${isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(metric.pctChange).toFixed(1)}%
        </span>
      </td>
    </tr>
  );
}

function SummaryCard({ title, value, icon, subtitle, progress, color }: any) {
  const themes: any = {
    orange: 'bg-orange-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm card-break">
      <div className="flex justify-between items-start mb-4">
        <div className={`${themes[color]} p-2 rounded-lg text-white shadow-lg`}>{icon}</div>
        {progress !== undefined && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">{progress.toFixed(0)}% ACH</span>}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-xl font-black text-slate-900">{value}</h4>
      {subtitle && <p className="text-[10px] text-slate-500 font-bold mt-1">{subtitle}</p>}
      {progress !== undefined && (
        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
          <div className={`${themes[color]} h-full transition-all duration-1000`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
