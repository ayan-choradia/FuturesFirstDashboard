import React, { useState, useEffect, useMemo } from 'react';
import { Scenario, DailyRate, MonthlyContract, Holiday } from './types';
import { DEFAULT_MEETINGS, FALLBACK_HOLIDAYS_2026 } from './constants';
import { generateDailyRates, calculateContracts } from './utils/analytics';
import ScenarioControls from './components/ScenarioControls';
import Dashboard from './components/Dashboard';
import ComparisonView from './components/ComparisonView';
import { TrendingUp, GitCompare } from 'lucide-react';

const DEFAULT_SCENARIO: Scenario = {
  id: 'default',
  name: 'Base Case 2026',
  baseSofr: 4.30,
  baseEffr: 4.30,
  meetings: DEFAULT_MEETINGS,
  turns: {
    monthEnd: 5,
    quarterEnd: 10,
    yearEnd: 25
  }
};

const App: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>(FALLBACK_HOLIDAYS_2026);
  const [currentScenario, setCurrentScenario] = useState<Scenario>(DEFAULT_SCENARIO);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([DEFAULT_SCENARIO]);
  const [showComparison, setShowComparison] = useState(false);

  // 1. Fetch Holidays on Mount
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await fetch('https://date.nager.at/api/v3/publicholidays/2026/US');
        if (res.ok) {
          const data = await res.json();
          setHolidays(data);
        } else {
          console.warn("Holiday API failed, using fallback.");
        }
      } catch (e) {
        console.warn("Holiday API error, using fallback.", e);
      }
    };
    fetchHolidays();
  }, []);

  // 2. Calculation Engine (Memoized for performance)
  const dailyRates = useMemo<DailyRate[]>(() => {
    return generateDailyRates(currentScenario, holidays);
  }, [currentScenario, holidays]);

  const contracts = useMemo<MonthlyContract[]>(() => {
    return calculateContracts(dailyRates);
  }, [dailyRates]);

  // 3. Handlers
  const handleSaveScenario = () => {
    const newId = Date.now().toString();
    const newScenario = { ...currentScenario, id: newId };
    setSavedScenarios(prev => [...prev, newScenario]);
    setCurrentScenario(newScenario); // Switch to the saved one
    alert(`Scenario "${newScenario.name}" saved!`);
  };

  const handleLoadScenario = (id: string) => {
    const found = savedScenarios.find(s => s.id === id);
    if (found) setCurrentScenario(found);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Top Navbar */}
      <header className="bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md z-10 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-900/50">
             <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">QuantFi <span className="text-indigo-400">2026</span></h1>
            <p className="text-xs text-slate-400">Fixed Income Analytics & Strategy</p>
          </div>
        </div>
        <div>
          <button 
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all border ${showComparison ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'}`}
          >
            <GitCompare className="w-4 h-4" />
            {showComparison ? 'Close Comparison' : 'Compare Scenarios'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* Left Sidebar: Inputs */}
        <aside className="w-full md:w-80 flex-shrink-0 h-full">
           <ScenarioControls 
             scenario={currentScenario} 
             setScenario={setCurrentScenario} 
             onSave={handleSaveScenario}
             savedScenarios={savedScenarios}
             onLoad={handleLoadScenario}
           />
        </aside>

        {/* Right Area: Dashboard or Comparison */}
        <section className="flex-1 min-w-0 h-full">
          {showComparison ? (
            <ComparisonView 
              scenarios={savedScenarios} 
              holidays={holidays} 
              onClose={() => setShowComparison(false)} 
            />
          ) : (
            <Dashboard 
              dailyRates={dailyRates} 
              contracts={contracts} 
              scenario={currentScenario} 
            />
          )}
        </section>

      </main>
    </div>
  );
};

export default App;
