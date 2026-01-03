
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
  ChevronRight
} from 'lucide-react';
import { MONTHS, DASHBOARD_DATA } from './constants';
import { MonthKey, StoreComparison, ComparisonMetric, MonthlyData, StoreMetrics } from './types';

// Formatting helpers
const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(val);

const formatNumber = (val: number) => 
  new Intl.NumberFormat('en-US').format(Math.round(val));

const formatPercent = (val: number) => `${val.toFixed(1)}%`;

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>('All');

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
          @page {
            size: A4;
            margin: 15mm 10mm;
          }
          body {
            background: white !important;
            font-size: 10pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .card-break {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 8mm !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
          }
          header { display: none !important; }
          .print-header {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f97316;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .print-header h1 {
            color: #f97316;
            font-size: 22pt;
            font-weight: 800;
            margin: 0;
          }
          .print-header p {
            color: #64748b;
            font-size: 10pt;
            margin: 0;
          }
          .grid-3 {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
          }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 0.5pt solid #e2e8f0 !important; }
          .bg-orange-50 { background-color: #fff7ed !important; }
          .bg-orange-500 { background-color: #f97316 !important; }
          .text-orange-600 { color: #ea580c !important; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
                <BarChart3 className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 leading-none">Retail Intel</h1>
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-1">2025 Analytics Engine</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="group flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Export to PDF
              </button>
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print-full-width">
        {/* PDF Only Header */}
        <div className="print-header">
          <div>
            <h1>Retail Performance Report</h1>
            <p>Generated for: {selectedMonth === 'All' ? 'Year 2025 (Full)' : `${selectedMonth} 2025`}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Date: {new Date().toLocaleDateString()}</p>
            <p className="text-orange-600 font-extrabold text-lg">CONFIDENTIAL</p>
          </div>
        </div>

        {/* Filters and Context */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-8 items-center justify-between no-print">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Report Period</label>
            <div className="relative group">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as MonthKey)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all text-sm font-bold text-slate-700 w-72"
              >
                <option value="All">Full Year 2025 Overview</option>
                {MONTHS.map(m => (
                  <option key={m.key} value={m.key}>{m.label} 2025</option>
                ))}
              </select>
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-orange-500" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-orange-50/50 px-5 py-3 rounded-2xl border border-orange-100/50 text-orange-700 text-xs font-bold animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-2 bg-orange-500 rounded-lg shadow-sm">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-400 font-medium uppercase text-[9px] tracking-tighter">Reporting Active</p>
              <p className="text-sm">Period: {selectedMonth === 'All' ? '2025 Total' : selectedMonth}</p>
            </div>
          </div>
        </div>

        {/* GLOBAL KPIs Summary */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-6 w-1.5 bg-orange-500 rounded-full" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Executive KPIs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 grid-3">
            <SummaryCard 
              title="Global Gross Sales" 
              value={formatCurrency(totalSummary.sales)} 
              icon={<TrendingUp className="w-5 h-5" />}
              subtitle={`Annual Target: ${formatCurrency(totalSummary.target)}`}
              color="orange"
            />
            <SummaryCard 
              title="Target Achievement" 
              value={formatPercent(totalSummary.achievement)} 
              icon={<Target className="w-5 h-5" />}
              progress={totalSummary.achievement}
              color="emerald"
            />
            <SummaryCard 
              title="Customer Footfall" 
              value={formatNumber(totalSummary.visitors)} 
              icon={<Users className="w-5 h-5" />}
              color="indigo"
            />
          </div>
        </section>

        {/* BRANCH BREAKDOWN */}
        <section className="space-y-6 mb-16">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-6 w-1.5 bg-slate-900 rounded-full" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Branch Performance Detail</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {activeData.stores.map((store) => (
              <div key={store.name} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden card-break hover:border-orange-200 transition-colors">
                {/* Branch Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500/10 p-2 rounded-xl">
                      <Store className="w-4 h-4 text-orange-600" />
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900">{store.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Achievement</span>
                    <span className={`text-sm font-black ${store.achievement >= 100 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {formatPercent(store.achievement)}
                    </span>
                  </div>
                </div>
                
                {/* Branch Metrics */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 grid-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Revenue</span>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(store.sales)}</p>
                    <div className="w-full h-1 bg-slate-100 rounded-full mt-2">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(store.achievement, 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Visitors</span>
                    <p className="text-lg font-black text-slate-900">{formatNumber(store.visitors)}</p>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      Conv: {formatPercent(store.conversionRate)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">ATV</span>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(store.atv)}</p>
                    <p className="text-[10px] text-slate-400 font-bold">Transaction Value</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparative Analysis Table */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden card-break">
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                <TableIcon className="w-4 h-4 text-white" />
              </div>
              YoY Growth Analysis (2025 vs 2024)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-200">
                  <th className="px-8 py-5">Branch / KPIs</th>
                  <th className="px-4 py-5 text-center">2025 Value</th>
                  <th className="px-4 py-5 text-center">2024 Value</th>
                  <th className="px-4 py-5 text-center">Δ Absolute</th>
                  <th className="px-8 py-5 text-center">Δ Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData.map((store) => (
                  <React.Fragment key={store.name}>
                    <tr className="bg-slate-50/40">
                      <td colSpan={5} className="px-8 py-3 font-black text-orange-600 border-y border-slate-200 bg-orange-50/30 uppercase tracking-widest text-[10px]">
                        {store.name}
                      </td>
                    </tr>
                    <ComparisonRow label="Net Revenue" metric={store.metrics.sales} isCurrency />
                    <ComparisonRow label="Customer Traffic" metric={store.metrics.visitors} />
                    <ComparisonRow label="Conversion %" metric={store.metrics.conversionRate} isPercent />
                    <ComparisonRow label="Basket Size (ATV)" metric={store.metrics.atv} isCurrency />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer for PDF */}
        <footer className="mt-12 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden print:block border-t border-slate-100 pt-8">
          © 2025 Retail Intelligence Systems | Confidential Internal Document
        </footer>
      </main>
    </div>
  );
}

function ComparisonRow({ label, metric, isCurrency, isPercent }: { label: string; metric: ComparisonMetric; isCurrency?: boolean; isPercent?: boolean; }) {
  const format = (val: number) => {
    if (isCurrency) return formatCurrency(val);
    if (isPercent) return formatPercent(val);
    return formatNumber(val);
  };
  const isPositive = metric.pctChange >= 0;
  return (
    <tr className="hover:bg-orange-50/10 transition-all">
      <td className="px-8 py-4 font-bold text-slate-600 flex items-center gap-2">
        <ChevronRight className="w-3 h-3 text-orange-400" />
        {label}
      </td>
      <td className="px-4 py-4 text-center font-black text-slate-900">{format(metric.current)}</td>
      <td className="px-4 py-4 text-center text-slate-400 font-medium italic">{format(metric.previous)}</td>
      <td className={`px-4 py-4 text-center font-extrabold ${metric.diff > 0 ? 'text-emerald-600' : metric.diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
        {metric.diff > 0 ? '+' : ''}{format(metric.diff)}
      </td>
      <td className="px-8 py-4 text-center font-black">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${isPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(metric.pctChange).toFixed(1)}%
        </div>
      </td>
    </tr>
  );
}

function SummaryCard({ title, value, icon, subtitle, progress, color }: any) {
  const colors: any = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-500 text-white shadow-orange-200', progress: 'bg-orange-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-500 text-white shadow-emerald-200', progress: 'bg-emerald-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-500 text-white shadow-indigo-200', progress: 'bg-indigo-500' },
  };
  
  const theme = colors[color];

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden card-break`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl shadow-lg ${theme.icon}`}>
          {icon}
        </div>
        {progress !== undefined && (
          <div className={`px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100`}>
             {progress.toFixed(0)}% Done
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        {subtitle && <p className="text-xs text-slate-500 font-bold">{subtitle}</p>}
      </div>
      
      {progress !== undefined && (
        <div className="mt-6">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter mb-1.5 text-slate-400">
            <span>Achievement Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${theme.progress} transition-all duration-1000 shadow-sm`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
