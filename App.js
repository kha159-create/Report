
import React, { useState, useMemo } from 'react';
import * as Lucide from 'lucide-react';
import * as Recharts from 'recharts';
import htm from 'htm';
import { MONTHS, DASHBOARD_DATA } from './constants.js';

const html = htm.bind(React.createElement);

// Formatting helpers
const formatSAR = (val) => 
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(val);

const formatNumber = (val) => 
  new Intl.NumberFormat('en-US').format(Math.round(val));

const formatCompactNumber = (val) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
};

const formatPercent = (val) => `${val.toFixed(1)}%`;

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [chartMetric, setChartMetric] = useState('sales');

  const activeData = useMemo(() => {
    if (selectedMonth !== 'All') {
      return DASHBOARD_DATA[selectedMonth];
    }

    const allMonths = Object.keys(DASHBOARD_DATA);
    const yearlyStores = {};
    
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
  
  const comparisonData = useMemo(() => {
    return activeData.stores.map(currentStore => {
      const calcMetric = (curr, prev = 0) => ({
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
      const monthData = DASHBOARD_DATA[m.key];
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
      Object.entries(store.metrics).forEach(([key, m]) => {
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

  return html`
    <div className="min-h-screen pb-12 bg-[#FAFAFA] font-['Inter']">
      <style>${`
        @media print {
          @page { size: A4; margin: 15mm 10mm; }
          body { background: white !important; font-size: 10pt; -webkit-print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .card-break { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8mm !important; box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
                <${Lucide.BarChart3} className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 leading-none tracking-tight">Retail Intel</h1>
                <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.2em] mt-1">2025 Analytics Engine</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick=${handlePrint} className="group flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95">
                <${Lucide.Printer} className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Export PDF
              </button>
              <button onClick=${exportToCSV} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95">
                <${Lucide.Download} className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print-full-width">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-8 items-center justify-between no-print">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Period</label>
            <div className="relative">
              <select 
                value=${selectedMonth}
                onChange=${(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all text-sm font-bold text-slate-700 w-72"
              >
                <option value="All">Full Year 2025 Overview</option>
                ${MONTHS.map(m => html`<option key=${m.key} value=${m.key}>${m.label} 2025</option>`)}
              </select>
              <${Lucide.Calendar} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="bg-orange-50 px-5 py-3 rounded-2xl border border-orange-100 text-orange-700 text-xs font-bold flex items-center gap-2">
            <${Lucide.AlertCircle} className="w-4 h-4" />
            Period: ${selectedMonth === 'All' ? '2025 Total' : selectedMonth}
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <${SummaryCard} title="Global Sales" value=${formatSAR(totalSummary.sales)} icon=${html`<${Lucide.TrendingUp} />`} color="orange" subtitle=${`Target: ${formatSAR(totalSummary.target)}`} />
          <${SummaryCard} title="Achievement" value=${formatPercent(totalSummary.achievement)} icon=${html`<${Lucide.Target} />`} color="emerald" progress=${totalSummary.achievement} />
          <${SummaryCard} title="Footfall" value=${formatNumber(totalSummary.visitors)} icon=${html`<${Lucide.Users} />`} color="indigo" />
        </section>

        <section className="mb-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm card-break">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="h-6 w-1.5 bg-orange-500 rounded-full" /> Performance Trends
            </h2>
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center no-print shadow-inner border border-slate-200">
              ${['sales', 'visitors', 'target'].map(m => html`
                <button key=${m} onClick=${() => setChartMetric(m)} className=${`px-5 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all duration-200 ${chartMetric === m ? 'bg-white text-orange-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                  ${m.toUpperCase()}
                </button>
              `)}
            </div>
          </div>
          <div className="h-[350px] w-full">
            <${Recharts.ResponsiveContainer} width="100%" height="100%">
              <${Recharts.BarChart} data=${yearlyComparisonChartData} margin=${{ top: 10, right: 10, left: 10, bottom: 20 }} barGap=${8}>
                <${Recharts.CartesianGrid} strokeDasharray="3 3" vertical=${false} stroke="#f1f5f9" />
                <${Recharts.XAxis} dataKey="name" axisLine=${false} tickLine=${false} tick=${{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} dy=${10} />
                <${Recharts.YAxis} axisLine=${false} tickLine=${false} tick=${{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} tickFormatter=${formatCompactNumber} />
                <${Recharts.Tooltip} cursor=${{ fill: '#f8fafc' }} contentStyle=${{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <${Recharts.Bar} dataKey="current" fill="#f97316" radius=${[6, 6, 0, 0]} barSize=${22} />
                <${Recharts.Bar} dataKey="previous" fill="#cbd5e1" radius=${[6, 6, 0, 0]} barSize=${22} />
              </${Recharts.BarChart}>
            </${Recharts.ResponsiveContainer}>
          </div>
        </section>

        <section className="space-y-6 mb-16">
          <div className="flex items-center gap-3 mb-2">
             <div className="h-6 w-1.5 bg-slate-900 rounded-full" />
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Branch Performance Cards</h2>
          </div>
          ${activeData.stores.map((store) => html`
            <div key=${store.name} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden card-break hover:border-orange-300 transition-all">
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <${Lucide.Store} className="w-5 h-5 text-orange-600" />
                  <h3 className="text-base font-extrabold text-slate-900">${store.name}</h3>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ACHIEVEMENT</span>
                   <span className=${`px-4 py-1.5 rounded-full text-xs font-black border ${store.achievement >= 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    ${formatPercent(store.achievement)}
                   </span>
                </div>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Sales</span>
                    <p className="text-xl font-black text-slate-900">${formatSAR(store.sales)}</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className=${`h-full ${store.achievement >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style=${{ width: `${Math.min(store.achievement, 100)}%` }} />
                  </div>
                </div>
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Visitors</span>
                   <p className="text-xl font-black text-slate-900">${formatNumber(store.visitors)}</p>
                   <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Conv: ${formatPercent(store.conversionRate)}</p>
                   </div>
                </div>
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ATV</span>
                   <p className="text-xl font-black text-slate-900">${formatSAR(store.atv)}</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Avg Transaction</p>
                </div>
                <div>
                   <span className="text-[10px] font-black text-orange-500 uppercase tracking-wider">SPV</span>
                   <p className="text-xl font-black text-orange-600">${formatSAR(store.salesPerVisitor)}</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Sales Per Visitor</p>
                </div>
              </div>
            </div>
          `)}
        </section>

        <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden card-break">
          <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20"><${Lucide.TableIcon} className="w-5 h-5 text-white" /></div>
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">YoY Growth Analysis (2025 vs 2024)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-200">
                  <th className="px-10 py-5">Branch / KPIs</th>
                  <th className="px-4 py-5 text-center">2025 Value</th>
                  <th className="px-4 py-5 text-center">2024 Value</th>
                  <th className="px-4 py-5 text-center">Absolute Δ</th>
                  <th className="px-10 py-5 text-center">Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                ${comparisonData.map((store) => html`
                  <${React.Fragment} key=${store.name}>
                    <tr className="bg-slate-50/60"><td colSpan="5" className="px-10 py-4 font-black text-orange-600 border-y border-slate-200/50 uppercase tracking-[0.1em] text-[11px]">${store.name}</td></tr>
                    <${ComparisonRow} label="Sales" metric=${store.metrics.sales} isCurrency />
                    <${ComparisonRow} label="Visitors" metric=${store.metrics.visitors} />
                    <${ComparisonRow} label="ATV" metric=${store.metrics.atv} isCurrency />
                    <${ComparisonRow} label="Conversion" metric=${store.metrics.conversionRate} isPercent />
                    <${ComparisonRow} label="SPV" metric=${store.metrics.salesPerVisitor} isCurrency />
                  </${React.Fragment}>
                `)}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  `;
}

function ComparisonRow({ label, metric, isCurrency, isPercent }) {
  const format = (val) => isCurrency ? formatSAR(val) : (isPercent ? formatPercent(val) : formatNumber(val));
  const isPos = metric.pctChange >= 0;
  return html`
    <tr className="hover:bg-orange-50/20 group transition-all">
      <td className="px-10 py-4 font-bold text-slate-600 flex items-center gap-3">
        <${Lucide.ChevronRight} className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-500 transition-colors" />
        ${label}
      </td>
      <td className="px-4 py-4 text-center font-extrabold text-slate-900">${format(metric.current)}</td>
      <td className="px-4 py-4 text-center text-slate-400 font-medium italic">${format(metric.previous)}</td>
      <td className=${`px-4 py-4 text-center font-black ${metric.diff > 0 ? 'text-emerald-600' : metric.diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
         ${metric.diff > 0 ? '+' : ''}${format(metric.diff)}
      </td>
      <td className="px-10 py-4 text-center font-black">
        <div className=${`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isPos ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
          ${isPos ? html`<${Lucide.ArrowUpRight} className="w-3.5 h-3.5" />` : html`<${Lucide.ArrowDownRight} className="w-3.5 h-3.5" />`}
          ${Math.abs(metric.pctChange).toFixed(1)}%
        </div>
      </td>
    </tr>
  `;
}

function SummaryCard({ title, value, icon, subtitle, progress, color }) {
  const bgClass = { orange: 'bg-orange-500', emerald: 'bg-emerald-500', indigo: 'bg-indigo-500' }[color];
  const shadowClass = { orange: 'shadow-orange-200', emerald: 'shadow-emerald-200', indigo: 'shadow-indigo-200' }[color];
  
  return html`
    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300 card-break relative overflow-hidden">
      <div className="flex justify-between items-start mb-8">
        <div className=${`p-3.5 rounded-[1.25rem] text-white shadow-lg ${bgClass} ${shadowClass}`}>${icon}</div>
        ${progress !== undefined && html`<div className="px-4 py-1.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100">${progress.toFixed(0)}% DONE</div>`}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">${title}</p>
        <h4 className="text-2xl font-black text-slate-900 tracking-tight">${value}</h4>
        ${subtitle && html`<p className="text-[11px] text-slate-500 font-bold uppercase mt-1 tracking-tight">${subtitle}</p>`}
      </div>
      ${progress !== undefined && html`
        <div className="mt-8">
           <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div className=${`h-full ${bgClass} transition-all duration-1000`} style=${{ width: `${Math.min(progress, 100)}%` }} />
           </div>
        </div>
      `}
    </div>
  `;
}
