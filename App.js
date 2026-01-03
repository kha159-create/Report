
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

// Shorten branch names for the UI cards
const shortenBranchName = (name) => {
  if (name.includes('Al-Noor Mall Madinah')) return 'Noor Mall';
  if (name.includes('Al-Jouf Center')) return 'Jouf';
  // Standard split for others like "17-Arar Othaim Mall" -> "Arar Othaim Mall"
  const parts = name.split('-');
  return parts[1] ? parts[1].trim() : name;
};

// Performance Pulse Indicator (comparison vs 2024)
const PulseIndicator = ({ current, previous, prevValueFormatted = "" }) => {
  if (!previous || previous === 0) return null;
  const pctChange = ((current - previous) / previous) * 100;
  const isPos = pctChange >= 0;
  
  return html`
    <div className="flex flex-col items-end gap-1">
      <div className=${`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black tracking-tight ${isPos ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
        ${isPos ? html`<${Lucide.TrendingUp} className="w-3 h-3" />` : html`<${Lucide.TrendingDown} className="w-3 h-3" />`}
        ${Math.abs(pctChange).toFixed(1)}%
      </div>
      ${prevValueFormatted && html`<span className="text-[9px] text-slate-400 font-bold whitespace-nowrap uppercase tracking-tighter">2024: ${prevValueFormatted}</span>`}
    </div>
  `;
};

export default function App() {
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState(null); 
  const [chartMetric, setChartMetric] = useState('sales');

  const branchNames = useMemo(() => {
    const names = new Set();
    Object.values(DASHBOARD_DATA).forEach(m => m.stores.forEach(s => names.add(s.name)));
    return Array.from(names).sort();
  }, []);

  const viewData = useMemo(() => {
    const allMonths = selectedMonth === 'All' ? Object.keys(DASHBOARD_DATA) : [selectedMonth];
    
    let totalSales = 0, totalSalesLY = 0, totalTarget = 0, totalVisitors = 0, totalVisitorsLY = 0, totalTransactions = 0, totalTransactionsLY = 0;

    const monthlyTrends = allMonths.map(mKey => {
      const mData = DASHBOARD_DATA[mKey];
      const stores = selectedBranch ? mData.stores.filter(s => s.name === selectedBranch) : mData.stores;
      
      const sales = stores.reduce((acc, s) => acc + s.sales, 0);
      const salesLY = stores.reduce((acc, s) => acc + s.salesLY, 0);
      const target = selectedBranch ? stores.reduce((acc, s) => acc + s.salesTarget, 0) : mData.areaTarget;
      const visitors = stores.reduce((acc, s) => acc + s.visitors, 0);
      const visitorsLY = stores.reduce((acc, s) => acc + s.visitorsLY, 0);
      const transactions = stores.reduce((acc, s) => acc + s.transactions, 0);
      const transactionsLY = stores.reduce((acc, s) => acc + s.transactionsLY, 0);

      totalSales += sales;
      totalSalesLY += salesLY;
      totalTarget += target;
      totalVisitors += visitors;
      totalVisitorsLY += visitorsLY;
      totalTransactions += transactions;
      totalTransactionsLY += transactionsLY;

      let trendVal = 0, prevVal = 0;
      if (chartMetric === 'sales') { trendVal = sales; prevVal = salesLY; }
      else if (chartMetric === 'visitors') { trendVal = visitors; prevVal = visitorsLY; }
      else if (chartMetric === 'target') { trendVal = sales; prevVal = target; }

      return {
        name: MONTHS.find(m => m.key === mKey)?.label.substring(0, 3) || mKey,
        current: trendVal,
        previous: prevVal
      };
    });

    return {
      totalSales, totalSalesLY, totalTarget, totalVisitors, totalVisitorsLY,
      achievement: totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0,
      atv: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      atvLY: totalTransactionsLY > 0 ? totalSalesLY / totalTransactionsLY : 0,
      conv: totalVisitors > 0 ? (totalTransactions / totalVisitors) * 100 : 0,
      convLY: totalVisitorsLY > 0 ? (totalTransactionsLY / totalVisitorsLY) * 100 : 0,
      spv: totalVisitors > 0 ? totalSales / totalVisitors : 0,
      spvLY: totalVisitorsLY > 0 ? totalSalesLY / totalVisitorsLY : 0,
      trends: monthlyTrends
    };
  }, [selectedMonth, selectedBranch, chartMetric]);

  const matrixEntities = useMemo(() => {
    const allMonths = selectedMonth === 'All' ? Object.keys(DASHBOARD_DATA) : [selectedMonth];
    const targetBranches = selectedBranch ? [selectedBranch] : branchNames;

    return targetBranches.map(name => {
      let sales = 0, salesLY = 0, visitors = 0, visitorsLY = 0, trans = 0, transLY = 0, target = 0;
      allMonths.forEach(mKey => {
        const store = DASHBOARD_DATA[mKey].stores.find(s => s.name === name);
        if (store) {
          sales += store.sales; salesLY += store.salesLY;
          visitors += store.visitors; visitorsLY += store.visitorsLY;
          trans += store.transactions; transLY += store.transactionsLY;
          target += store.salesTarget;
        }
      });
      
      const calcRow = (curr, prev) => ({
        current: curr,
        previous: prev,
        delta: curr - prev,
        growth: prev !== 0 ? ((curr - prev) / prev) * 100 : 0
      });

      return {
        name,
        rows: [
          { id: 'sales', label: 'Sales', ...calcRow(sales, salesLY), isCurrency: true },
          { id: 'traffic', label: 'Traffic', ...calcRow(visitors, visitorsLY), isCurrency: false },
          { id: 'atv', label: 'ATV', ...calcRow(trans > 0 ? sales / trans : 0, transLY > 0 ? salesLY / transLY : 0), isCurrency: true },
          { id: 'conversion', label: 'Conversion', ...calcRow(visitors > 0 ? (trans / visitors) * 100 : 0, visitorsLY > 0 ? (transLY / visitorsLY) * 100 : 0), isPercent: true },
          { id: 'spv', label: 'SPV', ...calcRow(visitors > 0 ? sales / visitors : 0, visitorsLY > 0 ? salesLY / visitorsLY : 0), isCurrency: true }
        ]
      };
    });
  }, [selectedMonth, selectedBranch, branchNames]);

  return html`
    <div className="min-h-screen pb-12 bg-[#F8FAFC] font-['Inter'] text-slate-900 overflow-x-hidden text-sm">
      <style>${`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; font-size: 11px; }
          .no-print { display: none !important; }
          .card-break { break-inside: avoid; border: 1px solid #e2e8f0 !important; }
        }
        .magic-shadow { box-shadow: 0 10px 30px -10px rgba(0,0,0,0.06); }
        .transition-soft { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print shadow-sm h-16">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg shadow-md">
              <${Lucide.BarChart3} className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">Khaleel Insights</h1>
              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mt-1">2025 Area Report</p>
            </div>
          </div>
          <button onClick=${() => window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-soft flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
            <${Lucide.Printer} className="w-4 h-4" />
            Print Analysis
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 print-full">
        
        <!-- SECTION 1: Branch Selector Grid -->
        <div className="mb-8 no-print">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="h-4 w-1 bg-orange-500 rounded-full" />
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Branch Focus</h2>
          </div>
          <div className="grid gap-3" style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            <button 
              onClick=${() => setSelectedBranch(null)} 
              className=${`flex flex-col p-4 rounded-2xl border transition-soft text-left relative min-h-[90px] ${selectedBranch === null ? 'bg-[#0f172a] border-[#0f172a] shadow-xl text-white' : 'bg-white border-slate-200 hover:border-orange-300 shadow-sm'}`}
            >
              <span className="text-[11px] font-black uppercase tracking-tight leading-tight mb-2 whitespace-normal break-words">Area Aggregate</span>
              <span className="text-[9px] font-bold opacity-40 mt-auto uppercase tracking-wider">Total Portfolio</span>
            </button>
            ${branchNames.map(name => {
              const displayShort = shortenBranchName(name);
              return html`
                <button 
                  key=${name} 
                  onClick=${() => setSelectedBranch(name)} 
                  className=${`flex flex-col p-4 rounded-2xl border transition-soft text-left relative min-h-[90px] ${selectedBranch === name ? 'bg-[#0f172a] border-[#0f172a] shadow-xl text-white' : 'bg-white border-slate-200 hover:border-orange-300 shadow-sm'}`}
                >
                  <span className="text-[11px] font-black uppercase tracking-tight leading-snug whitespace-normal break-words block w-full mb-2">${displayShort}</span>
                  <span className="text-[9px] font-bold opacity-40 mt-auto uppercase tracking-wider">Branch Detail</span>
                </button>
              `;
            })}
          </div>
        </div>

        <!-- SECTION 2: Timeline selection -->
        <div className="mb-8 no-print flex items-center justify-between bg-white px-8 py-4 rounded-2xl border border-slate-200/60 magic-shadow">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <${Lucide.Calendar} className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Fiscal Perspective</h3>
              <p className="text-sm font-black text-slate-700 mt-2 uppercase tracking-tight">Report Cycle Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Selected Period:</span>
            <select 
              value=${selectedMonth}
              onChange=${(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-2.5 outline-none text-xs font-black text-slate-800 cursor-pointer shadow-sm focus:ring-4 focus:ring-orange-500/10 transition-soft min-w-[200px]"
            >
              <option value="All">Full Year 2025 Overview</option>
              ${MONTHS.map(m => html`<option key=${m.key} value=${m.key}>${m.label} 2025</option>`)}
            </select>
          </div>
        </div>

        <!-- SECTION 3: Summary Cards -->
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <${SummaryCard} 
            title="Gross Sales" 
            value=${formatSAR(viewData.totalSales)} 
            icon=${html`<${Lucide.TrendingUp} className="w-5 h-5" />`} 
            color="orange" 
            subtitle=${`Quota vs ${formatSAR(viewData.totalTarget)}`}
            pulse=${html`<${PulseIndicator} current=${viewData.totalSales} previous=${viewData.totalSalesLY} prevValueFormatted=${formatSAR(viewData.totalSalesLY)} />`}
            progress=${viewData.achievement}
          />
          
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 magic-shadow card-break flex flex-col justify-between hover:border-indigo-200 transition-soft">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl text-white bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                <${Lucide.Zap} className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">Efficiency Matrix</span>
            </div>
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ATV (Avg Receipt)</p>
                  <p className="text-lg font-black text-slate-900 italic mt-2 tracking-tighter">${formatSAR(viewData.atv)}</p>
                </div>
                <${PulseIndicator} current=${viewData.atv} previous=${viewData.atvLY} />
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Store Conversion</p>
                  <p className="text-lg font-black text-slate-900 italic mt-2 tracking-tighter">${formatPercent(viewData.conv)}</p>
                </div>
                <${PulseIndicator} current=${viewData.conv} previous=${viewData.convLY} />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Per Visitor Value (SPV)</p>
                  <p className="text-lg font-black text-orange-600 italic mt-2 tracking-tighter">${formatSAR(viewData.spv)}</p>
                </div>
                <${PulseIndicator} current=${viewData.spv} previous=${viewData.spvLY} />
              </div>
            </div>
          </div>

          <${SummaryCard} 
            title="Portfolio Traffic" 
            value=${formatNumber(viewData.totalVisitors)} 
            icon=${html`<${Lucide.Users} className="w-5 h-5" />`} 
            color="indigo" 
            subtitle=${`Total Customer Engagements`}
            pulse=${html`<${PulseIndicator} current=${viewData.totalVisitors} previous=${viewData.totalVisitorsLY} prevValueFormatted=${formatNumber(viewData.totalVisitorsLY)} />`}
          />
        </section>

        <!-- SECTION 4: Chart -->
        <section className="bg-white p-8 rounded-[2rem] border border-slate-200/60 mb-10 magic-shadow card-break">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-1 bg-orange-500 rounded-full" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Growth Trajectory</h2>
              </div>
              <p className="text-base font-black text-slate-900 uppercase italic tracking-tight">${selectedBranch || 'Total Portfolio Analysis'}</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl no-print">
              ${['sales', 'visitors', 'target'].map(m => html`
                <button 
                  key=${m} 
                  onClick=${() => setChartMetric(m)} 
                  className=${`px-5 py-2 rounded-lg text-[10px] font-black tracking-widest transition-soft ${chartMetric === m ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  ${m.toUpperCase()}
                </button>
              `)}
            </div>
          </div>
          <div className="h-[320px] w-full">
            <${Recharts.ResponsiveContainer} width="100%" height="100%">
              <${Recharts.BarChart} data=${viewData.trends} margin=${{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <${Recharts.CartesianGrid} strokeDasharray="4 4" vertical=${false} stroke="#F1F5F9" />
                <${Recharts.XAxis} dataKey="name" axisLine=${false} tickLine=${false} tick=${{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} dy=${10} />
                <${Recharts.YAxis} axisLine=${false} tickLine=${false} tick=${{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} tickFormatter=${formatCompactNumber} />
                <${Recharts.Tooltip} cursor=${{ fill: '#F8FAFC' }} contentStyle=${{ borderRadius: '16px', border: 'none', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.1)', padding: '16px', fontSize: '11px', fontWeight: 'bold' }} />
                <${Recharts.Legend} verticalAlign="top" align="right" iconType="circle" wrapperStyle=${{ paddingBottom: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }} />
                <${Recharts.Bar} name="2025 Actual" dataKey="current" fill="#f97316" radius=${[5, 5, 5, 5]} barSize=${20} />
                <${Recharts.Bar} name="2024 Comparison" dataKey="previous" fill="#0f172a" radius=${[5, 5, 5, 5]} barSize=${20} />
              </${Recharts.BarChart}>
            </${Recharts.ResponsiveContainer}>
          </div>
        </section>

        <!-- SECTION 5: Matrix Table -->
        <section className="bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden magic-shadow card-break transition-soft">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#0f172a] flex items-center justify-center shadow-lg">
                <${Lucide.LayoutList} className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase italic leading-none">Growth Intelligence Matrix</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Detail YOY Assessment</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-[#FAFBFC]">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">KPI Dimension</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">2025 Current</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">2024 Previous</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Variance Δ</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Growth %</th>
                </tr>
              </thead>
              <tbody>
                ${matrixEntities.map(entity => html`
                  <${React.Fragment} key=${entity.name}>
                    <tr className="bg-white border-b border-slate-50/50">
                      <td colSpan="5" className="px-8 py-4 text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] italic bg-orange-50/10 border-l-4 border-l-orange-500">
                        ${entity.name}
                      </td>
                    </tr>
                    ${entity.rows.map(row => {
                      const formatVal = (v) => row.isCurrency ? formatSAR(v) : (row.isPercent ? formatPercent(v) : formatNumber(v));
                      const isPositive = row.growth >= 0;
                      return html`
                        <tr key=${row.id} className="group hover:bg-slate-50 transition-soft border-b border-slate-50/30 last:border-slate-100">
                          <td className="px-8 py-4 flex items-center gap-3">
                             <${Lucide.ChevronRight} className="w-4 h-4 text-slate-200 group-hover:text-orange-500" />
                             <span className="text-[12px] font-bold text-slate-600 group-hover:text-slate-900 transition-soft tracking-tight">${row.label}</span>
                          </td>
                          <td className="px-4 py-4 text-center text-[13px] font-black text-slate-900 italic tracking-tight">${formatVal(row.current)}</td>
                          <td className="px-4 py-4 text-center text-[12px] font-medium italic text-slate-600">${formatVal(row.previous)}</td>
                          <td className=${`px-4 py-4 text-center text-[13px] font-black ${row.delta >= 0 ? 'text-emerald-500' : 'text-rose-600'}`}>
                            ${row.delta > 0 ? '+' : ''}${formatVal(row.delta)}
                          </td>
                          <td className="px-8 py-4 text-center">
                             <div className=${`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                               ${isPositive ? html`<${Lucide.TrendingUp} className="w-3.5 h-3.5" />` : html`<${Lucide.TrendingDown} className="w-3.5 h-3.5" />`}
                               ${Math.abs(row.growth).toFixed(1)}%
                             </div>
                          </td>
                        </tr>
                      `;
                    })}
                  </${React.Fragment}>
                `)}
              </tbody>
            </table>
          </div>
        </section>
        
        <footer className="mt-12 text-center pb-6 opacity-30">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">© 2025 Area Intelligence Dashboard | Private Executive Access</p>
        </footer>
      </main>
    </div>
  `;
}

function SummaryCard({ title, value, icon, subtitle, progress, color, pulse }) {
  const themes = {
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/10',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/10',
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/10'
  };
  return html`
    <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 magic-shadow card-break flex flex-col justify-between hover:border-orange-200 transition-soft">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className=${`p-3.5 rounded-2xl text-white bg-gradient-to-br shadow-lg ${themes[color]}`}>${icon}</div>
          ${pulse}
        </div>
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">${title}</span>
          <div>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight italic leading-tight">${value}</h4>
            ${subtitle && html`<p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 opacity-60 leading-none">${subtitle}</p>`}
          </div>
        </div>
      </div>
      ${progress !== undefined && html`
        <div className="mt-6 pt-6 border-t border-slate-50">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                <div className=${`h-full rounded-full bg-gradient-to-r ${themes[color]} transition-soft`} style=${{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <div className="px-3 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 italic whitespace-nowrap uppercase tracking-widest leading-none">
                ${progress.toFixed(0)}% Achieved
              </div>
           </div>
        </div>
      `}
    </div>
  `;
}
