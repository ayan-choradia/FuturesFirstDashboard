import React, { useState } from 'react';
import { DailyRate, MonthlyContract, Scenario } from '../types';
import { Calendar as CalendarIcon, Grid, Activity, BarChart2, Download, TrendingUp } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import * as XLSX from 'xlsx';

interface Props {
  dailyRates: DailyRate[];
  contracts: MonthlyContract[];
  scenario: Scenario;
}

const Dashboard: React.FC<Props> = ({ dailyRates, contracts, scenario }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'charts' | 'calendar'>('matrix');
  const [curveMonthA, setCurveMonthA] = useState<number>(0); // Jan
  const [curveMonthB, setCurveMonthB] = useState<number>(1); // Feb

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Matrix
    const matrixData = contracts.map(c => ({
      Month: c.monthName,
      'Avg Rate (%)': c.avgRate.toFixed(4),
      'Outright Price': c.outright.toFixed(4),
      '1M Spread': c.spread1M !== undefined ? c.spread1M.toFixed(4) : '-'
    }));
    const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matrix');

    // Sheet 2: Daily Build
    const dailyData = dailyRates.map(r => ({
      Date: r.date,
      Type: r.dayType,
      'Is Turn': r.isTurn ? 'Yes' : 'No',
      'Base Rate (%)': r.baseRate,
      'Turn Premium (%)': r.turnPremium,
      'Final Rate (%)': r.finalRate
    }));
    const wsDaily = XLSX.utils.json_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Rates');

    XLSX.writeFile(wb, `${scenario.name.replace(/\s+/g, '_')}_2026.xlsx`);
  };

  // Calendar Heatmap Logic
  const renderCalendar = () => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {months.map(m => {
          const monthDate = new Date(2026, m, 1);
          const daysInMonth = new Date(2026, m + 1, 0).getDate();
          const startDay = monthDate.getDay();
          const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
          const monthRates = dailyRates.filter(r => new Date(r.date).getMonth() === m);

          return (
            <div key={m} className="bg-slate-900 border border-slate-800 rounded-lg p-2 shadow-sm">
              <h4 className="text-center font-bold text-slate-300 mb-2">{monthDate.toLocaleDateString('en-US', { month: 'long' })}</h4>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-1 text-slate-500">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {days.map(d => {
                  const dateStr = `2026-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const rate = monthRates.find(r => r.date === dateStr);
                  const isMeeting = rate?.isMeetingDate;
                  const isTurn = rate?.isTurn;
                  const isHoliday = rate?.dayType === 'Holiday';
                  const isWeekend = rate?.dayType === 'Weekend';

                  let bgClass = "bg-slate-800 text-slate-400";
                  if (isMeeting) bgClass = "bg-red-900/40 text-red-400 font-bold border border-red-900/50";
                  else if (isHoliday) bgClass = "bg-slate-700 text-slate-500";
                  else if (isTurn) bgClass = "bg-indigo-900/40 text-indigo-400 font-semibold border border-indigo-900/50";
                  else if (isWeekend) bgClass = "text-slate-600 bg-slate-900";
                  
                  return (
                    <div key={d} className={`h-6 flex items-center justify-center rounded cursor-default group relative ${bgClass}`}>
                      {d}
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-32 bg-slate-700 text-white text-[10px] p-2 rounded shadow-lg pointer-events-none border border-slate-600">
                        <div className="font-bold border-b border-slate-600 mb-1 pb-1">{dateStr}</div>
                        Rate: {rate?.finalRate.toFixed(3)}%<br/>
                        Base: {rate?.baseRate.toFixed(3)}%<br/>
                        Turn: {(rate?.turnPremium || 0).toFixed(3)}%<br/>
                        {isMeeting && <span className="text-red-300">Fed Meeting</span>}
                        {isHoliday && <span className="text-slate-300">Holiday</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getComparisonData = () => {
    const cA = contracts[curveMonthA];
    const cB = contracts[curveMonthB];
    if (!cA || !cB) return [];
    return [
      { name: cA.monthName, price: cA.outright, fill: '#6366f1' },
      { name: cB.monthName, price: cB.outright, fill: '#ec4899' }
    ];
  };

  return (
    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 h-full flex flex-col">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >
            <Grid className="w-4 h-4" /> Matrix
          </button>
          <button 
             onClick={() => setActiveTab('charts')}
             className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'charts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >
            <Activity className="w-4 h-4" /> Charts
          </button>
          <button 
             onClick={() => setActiveTab('calendar')}
             className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >
            <CalendarIcon className="w-4 h-4" /> Calendar
          </button>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-900 rounded-lg px-3 py-2 transition-all">
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        
        {/* MATRIX VIEW */}
        {activeTab === 'matrix' && (
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Rate (%)</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-indigo-400 uppercase tracking-wider">Outright Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-purple-400 uppercase tracking-wider">1M Spread</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-800">
                  {contracts.map((c, idx) => (
                    <tr key={c.month} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{c.monthName} '26</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-300">{c.avgRate.toFixed(4)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-indigo-300">{c.outright.toFixed(4)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-purple-300">
                        {c.spread1M !== undefined ? c.spread1M.toFixed(4) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CURVE ANALYSIS */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Curve Analysis
                </h3>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 font-bold">Month A</label>
                      <select 
                        value={curveMonthA} 
                        onChange={(e) => setCurveMonthA(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded p-1 focus:ring-indigo-500"
                      >
                         {contracts.map(c => <option key={c.month} value={c.month}>{c.monthName}</option>)}
                      </select>
                   </div>
                   <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 font-bold">Month B</label>
                      <select 
                        value={curveMonthB} 
                        onChange={(e) => setCurveMonthB(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded p-1 focus:ring-indigo-500"
                      >
                         {contracts.map(c => <option key={c.month} value={c.month}>{c.monthName}</option>)}
                      </select>
                   </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Outright Comparison */}
                <div className="h-64">
                   <h4 className="text-sm font-semibold text-slate-400 mb-4 text-center">Outright Price Comparison</h4>
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={getComparisonData()}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                       <XAxis dataKey="name" stroke="#94a3b8" />
                       <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                       <ReTooltip 
                         contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                         itemStyle={{ color: '#f1f5f9' }}
                       />
                       <Bar dataKey="price" />
                     </BarChart>
                   </ResponsiveContainer>
                </div>

                {/* Spread History */}
                <div className="h-64">
                   <h4 className="text-sm font-semibold text-slate-400 mb-4 text-center">1M Spread Curve (Jan-Dec)</h4>
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={contracts.filter(c => c.spread1M !== undefined)}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                       <XAxis dataKey="monthName" stroke="#94a3b8" />
                       <YAxis stroke="#94a3b8" />
                       <ReTooltip 
                         contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                       />
                       <Line type="monotone" dataKey="spread1M" stroke="#d946ef" strokeWidth={3} dot={{r:4, fill: '#d946ef'}} activeDot={{r:6}} />
                     </LineChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHARTS VIEW */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rate Path */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Projected Rate Path 2026</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyRates.filter((_, i) => i % 5 === 0)}> 
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="date" tickFormatter={(t) => t.substring(5)} minTickGap={30} style={{ fontSize: '10px' }} stroke="#94a3b8" />
                    <YAxis domain={['auto', 'auto']} style={{ fontSize: '10px' }} stroke="#94a3b8" />
                    <ReTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                    <Line type="stepAfter" dataKey="finalRate" stroke="#6366f1" strokeWidth={2} dot={false} name="Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

             {/* Hikes/Cuts */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Cumulative Meeting Actions</h3>
               <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scenario.meetings}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', {month:'short'})} style={{ fontSize: '10px' }} stroke="#94a3b8" />
                    <YAxis style={{ fontSize: '10px' }} stroke="#94a3b8" />
                    <ReTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }} />
                    <Bar dataKey="hikeBps" fill="#6366f1" name="Change (bps)">
                      {scenario.meetings.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hikeBps > 0 ? '#ef4444' : entry.hikeBps < 0 ? '#22c55e' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {activeTab === 'calendar' && renderCalendar()}

      </div>
    </div>
  );
};

export default Dashboard;