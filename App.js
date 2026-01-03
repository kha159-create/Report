
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

// Component for the "Performance Pulse" indicator
const PulseIndicator = ({ current, previous, label = "", prevValueFormatted = "" }) => {
  if (!previous || previous === 0) return null;
  const pctChange = ((current - previous) / previous) * 100;
  const isPos = pctChange >= 0;
  
  return html`
    <div className=${`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-tight ${isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
      ${isPos ? html`<${Lucide.TrendingUp} className="w-3 h-3" />` : html`<${Lucide.TrendingDown} className="w-3 h-3" />`}
      ${Math.abs(pctChange).toFixed(1)}%
      ${label && html`<span className="opacity-60 ml-1">${label}</span>`}
      ${prevValueFormatted && html`<span className="opacity-40 ml-1 font-bold"> (LY: ${prevValueFormatted})</span>`}
    </div>
  `;
};

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [chartMetric, setChartMetric] = useState('sales');

  const activeData = useMemo(() => {
    if (selectedMonth !== 'All') {
      const monthData = DASHBOARD_DATA[selectedMonth];
      const totalVisitorsLY = monthData.stores.reduce((acc, s) => acc + s.visitorsLY, 0);
      const totalTransactions = monthData.stores.reduce((acc, s) => acc + s.transactions, 0);
      const totalVisitors = monthData.stores.reduce((acc, s) => acc + s.visitors, 0);
      return { ...monthData, totalVisitorsLY, totalTransactions, totalVisitors };
    }

    const allMonths = Object.keys(DASHBOARD_DATA);
    const yearlyStores = {};
    
    let totalSales = 0;
    let totalSalesLY = 0;
    let areaTarget = 0;
    let totalVisitorsLY = 0;
    let totalVisitors = 0;
    let totalTransactions = 0;

    allMonths.forEach(mKey => {
      const monthData = DASHBOARD_DATA[mKey];
      totalSales += monthData.totalSales;
      totalSalesLY += monthData.totalSalesLY;
      areaTarget += monthData.areaTarget;

      monthData.stores.forEach(s => {
        totalVisitorsLY += s.visitorsLY;
        totalVisitors += s.visitors;
        totalTransactions += s.transactions;
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
      totalVisitorsLY,
      totalVisitors,
      totalTransactions,
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

  const totalSummary = useMemo(() => {
    const sales = activeData.stores.reduce((acc, s) => acc + s.sales, 0);
    const target = activeData.stores.reduce((acc, s) => acc + s.salesTarget, 0);
    const visitors = activeData.stores.reduce((acc, s) => acc + s.visitors, 0);
    const transactions = activeData.stores.reduce((acc, s) => acc + s.transactions, 0);
    
    const achievement = target > 0 ? (sales / target) * 100 : 0;
    const atv = transactions > 0 ? sales / transactions : 0;
    const conv = visitors > 0 ? (transactions / visitors) * 100 : 0;
    const spv = visitors > 0 ? sales / visitors : 0;

    return { sales, target, visitors, achievement, atv, conv, spv };
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
      `}</style>

      <!-- Navigation Header -->
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl shadow-xl shadow-orange-500/20">
              <${Lucide.BarChart3} className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Khaleel Area Report</h1>
              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-0.5">2025 Analytics Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick=${handlePrint} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">
              <${Lucide.Printer} className="w-4 h-4" />
              Print Report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 print-full">
        <!-- Period Selector -->
        <div className="bg-white p-2 rounded-[2rem] border border-slate-200/60 mb-10 flex flex-wrap items-center gap-2 no-print magic-shadow">
          <div className="flex-1 min-w-[300px] flex items-center gap-3 pl-6">
            <${Lucide.Calendar} className="text-slate-400 w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Report Period</span>
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
        </div>

        <!-- Summary KPI Cards -->
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <${SummaryCard} 
            title="Total Sales" 
            value=${formatSAR(totalSummary.sales)} 
            icon=${html`<${Lucide.TrendingUp} className="w-6 h-6" />`} 
            color="orange" 
            subtitle=${`Target: ${formatSAR(totalSummary.target)}`}
            progress=${totalSummary.achievement}
            pulse=${html`<${PulseIndicator} current=${activeData.totalSales} previous=${activeData.totalSalesLY} label="vs LY" prevValueFormatted=${formatSAR(activeData.totalSalesLY)} />`}
          />
          <${SummaryCard} 
            title="Visitor Traffic" 
            value=${formatNumber(totalSummary.visitors)} 
            icon=${html`<${Lucide.Users} className="w-6 h-6" />`} 
            color="indigo" 
            subtitle=${`Walk-in Customers`}
            pulse=${html`<${PulseIndicator} current=${activeData.totalVisitors} previous=${activeData.totalVisitorsLY} label="vs LY" prevValueFormatted=${formatNumber(activeData.totalVisitorsLY)} />`}
          />
          <${SummaryCard} 
            title="Regional KPIs" 
            value="Area Performance"
            icon=${html`<${Lucide.Zap} className="w-6 h-6" />`} 
            color="emerald" 
            isKPIList
            kpis=${[
              { label: 'Avg ATV', val: formatSAR(totalSummary.atv) },
              { label: 'Avg CONV', val: formatPercent(totalSummary.conv) },
              { label: 'Avg SPV', val: formatSAR(totalSummary.spv) }
            ]}
          />
        </section>

        <!-- Trend Chart Section -->
        <section className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 mb-12 magic-shadow card-break">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-6 w-1.5 bg-orange-500 rounded-full" />
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Performance Trajectory</h2>
              </div>
              <p className="text-lg font-black text-slate-900 uppercase">${chartMetric} TREND 2025</p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50 no-print">
              ${['sales', 'visitors', 'target'].map(m => html`
                <button key=${m} onClick=${() => setChartMetric(m)} className=${`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${chartMetric === m ? 'bg-white text-orange-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>
                  ${m.toUpperCase()}
                </button>
              `)}
            </div>
          </div>

          <div className="h-[400px] w-full">
            <${Recharts.ResponsiveContainer} width="100%" height="100%">
              <${Recharts.BarChart} data=${MONTHS.map(m => {
                const monthData = DASHBOARD_DATA[m.key];
                return {
                  name: m.label,
                  current: chartMetric === 'sales' ? monthData.totalSales : (chartMetric === 'visitors' ? monthData.stores.reduce((acc, s) => acc + s.visitors, 0) : monthData.totalSales),
                  previous: chartMetric === 'sales' ? monthData.totalSalesLY : (chartMetric === 'visitors' ? monthData.stores.reduce((acc, s) => acc + s.visitorsLY, 0) : monthData.areaTarget)
                };
              })} margin=${{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <${Recharts.CartesianGrid} strokeDasharray="6 6" vertical=${false} stroke="#E2E8F0" />
                <${Recharts.XAxis} dataKey="name" axisLine=${false} tickLine=${false} tick=${{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy=${15} />
                <${Recharts.YAxis} axisLine=${false} tickLine=${false} tick=${{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} tickFormatter=${formatCompactNumber} />
                <${Recharts.Tooltip} 
                  cursor=${{ fill: '#F8FAFC' }} 
                  contentStyle=${{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', padding: '20px' }}
                  formatter=${(value) => (chartMetric === 'sales' || chartMetric === 'target' ? formatSAR(value) : formatNumber(value))}
                />
                <${Recharts.Bar} dataKey="current" name="2025" fill="#f97316" radius=${[10, 10, 10, 10]} barSize=${24} />
                <${Recharts.Bar} dataKey="previous" name="2024" fill="#1e293b" radius=${[10, 10, 10, 10]} barSize=${24} />
              </${Recharts.BarChart}>
            </${Recharts.ResponsiveContainer}>
          </div>
        </section>

        <!-- Branch Intelligence Cards -->
        <div className="flex items-center gap-3 mb-8">
          <div className="h-6 w-1.5 bg-slate-900 rounded-full" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Branch Performance Detail</h2>
        </div>
        
        <section className="grid grid-cols-1 gap-8 mb-16">
          ${activeData.stores.map((store) => html`
            <div key=${store.name} className="bg-white rounded-[2.5rem] border border-slate-200/60 overflow-hidden magic-shadow magic-card-hover transition-all duration-500 card-break">
              <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-5">
                  <div className="bg-slate-900 p-3 rounded-2xl shadow-lg">
                    <${Lucide.Store} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">${store.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Performance Profile</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Achievement</span>
                   <span className=${`px-4 py-1.5 rounded-full text-xs font-black border ${store.achievement >= 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                    ${formatPercent(store.achievement)}
                   </span>
                </div>
              </div>
              
              <div className="p-10 grid grid-cols-1 md:grid-cols-4 gap-12">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gross Sales</span>
                    <${PulseIndicator} current=${store.sales} previous=${store.salesLY} />
                  </div>
                  <p className="text-2xl font-black text-slate-900">${formatSAR(store.sales)}</p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                    <div className=${`h-full rounded-full ${store.achievement >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style=${{ width: `${Math.min(store.achievement, 100)}%` }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Traffic</span>
                    <${PulseIndicator} current=${store.visitors} previous=${store.visitorsLY} />
                  </div>
                  <p className="text-2xl font-black text-slate-900">${formatNumber(store.visitors)}</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                    <${Lucide.MousePointer2} className="w-3 h-3" />
                    Conv: ${formatPercent(store.conversionRate)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Trans (ATV)</span>
                    <${PulseIndicator} current=${store.atv} previous=${store.atvLY} />
                  </div>
                  <p className="text-2xl font-black text-slate-900">${formatSAR(store.atv)}</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency (SPV)</span>
                  <p className="text-2xl font-black text-orange-600 mt-1">${formatSAR(store.salesPerVisitor)}</p>
                </div>
              </div>
            </div>
          `)}
        </section>

        <!-- Detailed Growth Analysis Table -->
        <section className="bg-white rounded-[3rem] border border-slate-200/60 overflow-hidden magic-shadow card-break">
          <div className="px-12 py-8 border-b border-slate-100 flex items-center gap-5 bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <${Lucide.TableIcon} className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">YoY Growth Analysis Table</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200">
                  <th className="px-12 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Branch / KPI Matrix</th>
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
                      <td colSpan="5" className="px-12 py-4 font-black text-orange-600 uppercase tracking-widest text-[11px]">${store.name}</td>
                    </tr>
                    <${TableMetricRow} label="Sales" metric=${store.metrics.sales} isCurrency />
                    <${TableMetricRow} label="Traffic" metric=${store.metrics.visitors} />
                    <${TableMetricRow} label="ATV" metric=${store.metrics.atv} isCurrency />
                    <${TableMetricRow} label="Conversion" metric=${store.metrics.conversion} isPercent />
                    <${TableMetricRow} label="SPV" metric=${store.metrics.spv} isCurrency />
                  </${React.Fragment}>
                `)}
              </tbody>
            </table>
          </div>
        </section>
        
        <footer className="mt-20 text-center pb-10 border-t border-slate-100 pt-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">© 2026 Khaleel Area Management Portfolio | Confidential</p>
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
      <td className="px-12 py-5 flex items-center gap-4 text-sm font-bold text-slate-600">
        <${Lucide.ChevronRight} className="w-3.5 h-3.5 text-slate-300" />
        ${label}
      </td>
      <td className="px-6 py-5 text-center text-sm font-black text-slate-800">${format(metric.current)}</td>
      <td className="px-6 py-5 text-center text-xs font-medium text-slate-400 italic">${format(metric.previous)}</td>
      <td className=${`px-6 py-5 text-center text-xs font-black ${metric.diff > 0 ? 'text-emerald-500' : metric.diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
        ${metric.diff > 0 ? '+' : ''}${format(metric.diff)}
      </td>
      <td className="px-12 py-5 flex justify-center">
        <div className=${`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[11px] font-black ${isPos ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
          ${isPos ? html`<${Lucide.ArrowUpRight} className="w-3.5 h-3.5" />` : html`<${Lucide.ArrowDownRight} className="w-3.5 h-3.5" />`}
          ${Math.abs(metric.pctChange).toFixed(1)}%
        </div>
      </td>
    </tr>
  `;
}

function SummaryCard({ title, value, icon, subtitle, progress, color, isKPIList, kpis, pulse }) {
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
        <div className="flex flex-col items-end gap-2">
          ${pulse}
        </div>
      </div>
      
      <div className="space-y-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">${title}</span>
        
        ${isKPIList ? html`
          <div className="grid grid-cols-1 gap-3 pt-2">
            ${kpis.map(kpi => html`
              <div key=${kpi.label} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">${kpi.label}</span>
                <span className="text-sm font-black text-slate-900">${kpi.val}</span>
              </div>
            `)}
          </div>
        ` : html`
          <div>
            <h4 className="text-3xl font-black text-slate-900 tracking-tighter">${value}</h4>
            ${subtitle && html`<p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-1 leading-relaxed">${subtitle}</p>`}
          </div>
        `}
      </div>

      ${progress !== undefined && !isKPIList && html`
        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-4">
           <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
             <div className=${`h-full rounded-full bg-gradient-to-r ${themes[color]} transition-all duration-1000 shadow-sm`} style=${{ width: `${Math.min(progress, 100)}%` }} />
           </div>
           <div className="px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest whitespace-nowrap">
              ${progress.toFixed(0)}% Done
           </div>
        </div>
      `}
    </div>
  `;
}
