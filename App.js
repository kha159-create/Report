
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
          conversion: calcMetric(currentStore.conversionRate, currentStore.conversionRateLY),
          spv: calcMetric(currentStore.salesPerVisitor, currentStore.salesPerVisitorLY),
        }
      };
    });
  }, [activeData]);

  const yearlyComparisonChartData = useMemo(() => {
    return MONTHS.map(m => {
      const monthData = DASHBOARD_DATA[m.key];
      if (chartMetric === 'sales') {
        return { name: m.label, current: monthData.totalSales, previous: monthData.totalSalesLY };
      } else if (chartMetric === 'visitors') {
        const currentV = monthData.stores.reduce((acc, s) => acc + s.visitors, 0);
        const previousV = monthData.stores.reduce((acc, s) => acc + s.visitorsLY, 0);
        return { name: m.label, current: currentV, previous: previousV };
      } else {
        return { name: m.label, current: monthData.totalSales, previous: monthData.areaTarget };
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

  const handlePrint = () => window.print();

  return html`
    <div className="min-h-screen pb-16 bg-[#F8FAFC] font-['Inter'] text-slate-900 overflow-x-hidden">
      <style>${`
        @media print {
          @page { size: A4; margin: 15mm 10mm; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-full { width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .card-break { break-inside: avoid; page-break-inside: avoid; border: 1px solid #e2e8f0 !important; }
        }
        .magic-shadow { box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); }
        .magic-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -15px rgba(249, 115, 22, 0.1); }
        .glass-header { backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.9); }
      `}</style>

      <!-- Glass Navigation -->
      <header className="glass-header border-b border-slate-200/60 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-2xl shadow-xl shadow-orange-500/30">
              <${Lucide.BarChart3} className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Retail Intel Pro</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">2025 Live Analytics</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick=${handlePrint} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm">
              <${Lucide.Printer} className="w-4 h-4" />
              Print Report
            </button>
            <button className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-slate-900/10">
              <${Lucide.Download} className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 print-full">
        <!-- Dashboard Filters -->
        <div className="bg-white p-2 rounded-[2rem] border border-slate-200/60 mb-10 flex flex-wrap items-center gap-2 no-print magic-shadow">
          <div className="flex-1 min-w-[300px] flex items-center gap-3 pl-6">
            <${Lucide.Calendar} className="text-slate-400 w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Analysis Period</span>
              <select 
                value=${selectedMonth}
                onChange=${(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-extrabold text-slate-800 cursor-pointer pr-8"
              >
                <option value="All">Full Year 2025 Portfolio</option>
                ${MONTHS.map(m => html`<option key=${m.key} value=${m.key}>${m.label} 2025</option>`)}
              </select>
            </div>
          </div>
          <div className="bg-slate-50 px-8 py-4 rounded-[1.5rem] flex items-center gap-4 border border-slate-100/50">
             <div className="bg-orange-500/10 p-2 rounded-lg"><${Lucide.Target} className="text-orange-600 w-4 h-4" /></div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Status</p>
                <p className="text-xs font-extrabold text-slate-800">${selectedMonth === 'All' ? 'Annual Cumulative' : 'Monthly Performance'}</p>
             </div>
          </div>
        </div>

        <!-- KPI Scorecards -->
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <${SummaryCard} 
            title="Total Revenue" 
            value=${formatSAR(totalSummary.sales)} 
            icon=${html`<${Lucide.TrendingUp} className="w-6 h-6" />`} 
            color="orange" 
            subtitle=${`Target: ${formatSAR(totalSummary.target)}`}
            progress=${totalSummary.achievement}
          />
          <${SummaryCard} 
            title="Avg Achievement" 
            value=${formatPercent(totalSummary.achievement)} 
            icon=${html`<${Lucide.Target} className="w-6 h-6" />`} 
            color="emerald" 
            progress=${totalSummary.achievement}
            subtitle="Global Sales Target"
          />
          <${SummaryCard} 
            title="Visitor Traffic" 
            value=${formatNumber(totalSummary.visitors)} 
            icon=${html`<${Lucide.Users} className="w-6 h-6" />`} 
            color="indigo" 
            subtitle="Walk-in Customers"
          />
        </section>

        <!-- Dynamic Trends Section -->
        <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 mb-12 magic-shadow card-break">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-6 w-1.5 bg-orange-500 rounded-full" />
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Performance Trajectory</h2>
              </div>
              <p className="text-lg font-black text-slate-900">${chartMetric.toUpperCase()} TREND 2025</p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50 no-print">
              ${['sales', 'visitors', 'target'].map(m => html`
                <button key=${m} onClick=${() => setChartMetric(m)} className=${`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${chartMetric === m ? 'bg-white text-orange-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}>
                  ${m.toUpperCase()}
                </button>
              `)}
            </div>
          </div>

          <div className="h-[400px] w-full">
            <${Recharts.ResponsiveContainer} width="100%" height="100%">
              <${Recharts.BarChart} data=${yearlyComparisonChartData} margin=${{ top: 20, right: 0, left: -20, bottom: 0 }} barGap=${12}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity=${0.9}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity=${1}/>
                  </linearGradient>
                </defs>
                <${Recharts.CartesianGrid} strokeDasharray="6 6" vertical=${false} stroke="#E2E8F0" />
                <${Recharts.XAxis} dataKey="name" axisLine=${false} tickLine=${false} tick=${{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy=${15} />
                <${Recharts.YAxis} axisLine=${false} tickLine=${false} tick=${{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} tickFormatter=${formatCompactNumber} />
                <${Recharts.Tooltip} cursor=${{ fill: '#F8FAFC' }} contentStyle=${{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '20px' }} />
                <${Recharts.Bar} dataKey="current" fill="url(#colorCurrent)" radius=${[10, 10, 10, 10]} barSize=${24} />
                <${Recharts.Bar} dataKey="previous" fill="#E2E8F0" radius=${[10, 10, 10, 10]} barSize=${24} />
              </${Recharts.BarChart}>
            </${Recharts.ResponsiveContainer}>
          </div>
        </section>

        <!-- Branch Intelligence Cards -->
        <div className="flex items-center gap-3 mb-8">
          <div className="h-6 w-1.5 bg-slate-900 rounded-full" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Branch Profile Intelligence</h2>
        </div>
        
        <section className="grid grid-cols-1 gap-8 mb-16">
          ${activeData.stores.map((store) => html`
            <div key=${store.name} className="bg-white rounded-[2.5rem] border border-slate-200/60 overflow-hidden magic-shadow magic-card-hover transition-all duration-500 card-break">
              <!-- Card Header -->
              <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-center gap-5">
                  <div className="bg-slate-900 p-3 rounded-2xl shadow-lg">
                    <${Lucide.Store} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">${store.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Performance Snapshot</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Achievement</span>
                  <div className=${`px-5 py-2 rounded-full text-xs font-black border-2 ${store.achievement >= 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    ${formatPercent(store.achievement)}
                  </div>
                </div>
              </div>
              
              <!-- Card Metrics Grid -->
              <div className="p-10 grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Gross Sales</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">${formatSAR(store.sales)}</p>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className=${`h-full rounded-full transition-all duration-1000 ${store.achievement >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style=${{ width: `${Math.min(store.achievement, 100)}%` }} />
                  </div>
                </div>
                
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Footfall</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">${formatNumber(store.visitors)}</p>
                  <div className="flex items-center gap-2 mt-3 text-emerald-600 font-black text-[10px] bg-emerald-50 w-fit px-3 py-1 rounded-lg">
                    <${Lucide.MousePointer2} className="w-3 h-3" />
                    CONV: ${formatPercent(store.conversionRate)}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Average Basket (ATV)</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">${formatSAR(store.atv)}</p>
                  <div className="flex items-center gap-2 mt-3 text-indigo-600 font-black text-[10px] bg-indigo-50 w-fit px-3 py-1 rounded-lg">
                    <${Lucide.Wallet} className="w-3 h-3" />
                    AVG TRANS
                  </div>
                </div>

                <div className="bg-orange-50/30 p-6 rounded-[1.5rem] border border-orange-100/50">
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em]">Efficiency (SPV)</span>
                  <p className="text-2xl font-black text-orange-600 mt-1">${formatSAR(store.salesPerVisitor)}</p>
                  <p className="text-[9px] text-orange-400 font-bold uppercase mt-2">Revenue Per Visitor</p>
                </div>
              </div>
            </div>
          `)}
        </section>

        <!-- Growth Analysis Advanced Table -->
        <section className="bg-white rounded-[3rem] border border-slate-200/60 overflow-hidden magic-shadow card-break">
          <div className="px-12 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <${Lucide.TableIcon} className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">YoY Performance Index</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">2025 vs 2024 Variance Report</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200">
                  <th className="px-12 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Store / KPI Matrix</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Current (2025)</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Previous (2024)</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Absolute Δ</th>
                  <th className="px-12 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Growth %</th>
                </tr>
              </thead>
              <tbody>
                ${comparisonData.map((store) => html`
                  <${React.Fragment} key=${store.name}>
                    <tr className="bg-slate-50/40 border-y border-slate-100">
                      <td colSpan="5" className="px-12 py-5 font-black text-orange-600 uppercase tracking-widest text-[11px]">${store.name}</td>
                    </tr>
                    <${TableMetricRow} label="Gross Sales" metric=${store.metrics.sales} isCurrency />
                    <${TableMetricRow} label="Traffic Count" metric=${store.metrics.visitors} />
                    <${TableMetricRow} label="Avg Transaction Value (ATV)" metric=${store.metrics.atv} isCurrency />
                    <${TableMetricRow} label="Conversion Ratio" metric=${store.metrics.conversion} isPercent />
                    <${TableMetricRow} label="Sales Per Visitor (SPV)" metric=${store.metrics.spv} isCurrency />
                  </${React.Fragment}>
                `)}
              </tbody>
            </table>
          </div>
        </section>
        
        <footer className="mt-20 text-center pb-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">© 2025 Retail Intel Systems | Confidential Enterprise Data</p>
        </footer>
      </main>
    </div>
  `;
}

function TableMetricRow({ label, metric, isCurrency, isPercent }) {
  const format = (v) => isCurrency ? formatSAR(v) : (isPercent ? formatPercent(v) : formatNumber(v));
  const isPos = metric.pctChange >= 0;
  return html`
    <tr className="group hover:bg-orange-50/20 transition-all border-b border-slate-50 last:border-0">
      <td className="px-12 py-5">
        <div className="flex items-center gap-4">
          <${Lucide.ChevronRight} className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-500 transition-colors" />
          <span className="text-[13px] font-bold text-slate-600">${label}</span>
        </div>
      </td>
      <td className="px-6 py-5 text-center text-sm font-black text-slate-800">${format(metric.current)}</td>
      <td className="px-6 py-5 text-center text-xs font-medium text-slate-400 italic">${format(metric.previous)}</td>
      <td className=${`px-6 py-5 text-center text-xs font-black ${metric.diff > 0 ? 'text-emerald-500' : metric.diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
        ${metric.diff > 0 ? '+' : ''}${format(metric.diff)}
      </td>
      <td className="px-12 py-5 flex justify-center">
        <div className=${`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border-2 text-[11px] font-black ${isPos ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'}`}>
          ${isPos ? html`<${Lucide.ArrowUpRight} className="w-3.5 h-3.5" />` : html`<${Lucide.ArrowDownRight} className="w-3.5 h-3.5" />`}
          ${Math.abs(metric.pctChange).toFixed(1)}%
        </div>
      </td>
    </tr>
  `;
}

function SummaryCard({ title, value, icon, subtitle, progress, color }) {
  const themes = {
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/20',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20'
  };
  
  return html`
    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 magic-shadow magic-card-hover transition-all duration-300 card-break">
      <div className="flex justify-between items-start mb-8">
        <div className=${`p-4 rounded-2xl text-white bg-gradient-to-br shadow-xl ${themes[color]}`}>
          ${icon}
        </div>
        ${progress !== undefined && html`
          <div className="px-5 py-2 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
            ${progress.toFixed(0)}% Done
          </div>
        `}
      </div>
      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">${title}</span>
        <h4 className="text-3xl font-black text-slate-900 tracking-tighter">${value}</h4>
        ${subtitle && html`<p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">${subtitle}</p>`}
      </div>
      ${progress !== undefined && html`
        <div className="mt-8 pt-8 border-t border-slate-50">
           <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
             <span>Market Reach</span>
             <span>${progress.toFixed(1)}%</span>
           </div>
           <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
             <div className=${`h-full rounded-full bg-gradient-to-r ${themes[color]} transition-all duration-1000 shadow-sm`} style=${{ width: `${Math.min(progress, 100)}%` }} />
           </div>
        </div>
      `}
    </div>
  `;
}
