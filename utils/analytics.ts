import { Scenario, DailyRate, MonthlyContract, Holiday } from '../types';
import { MONTH_NAMES } from '../constants';

// Find the last business day of a given month
const getLastBusinessDay = (year: number, month: number, holidaySet: Set<string>): Date => {
  let d = new Date(year, month + 1, 0); // Last day of month
  while (true) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(dateStr);
    
    if (!isWeekend && !isHoliday) {
      return d;
    }
    d.setDate(d.getDate() - 1);
  }
};

export const generateDailyRates = (scenario: Scenario, holidays: Holiday[]): DailyRate[] => {
  const rates: DailyRate[] = [];
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-12-31');

  // A. Definitions
  // E: Initial Rate. Use EFFR if present, else SOFR.
  const E = scenario.baseEffr ?? scenario.baseSofr;
  
  const holidaySet = new Set(holidays.map(h => h.date));
  const meetings = scenario.meetings; // \Delta_i

  // Pre-calculate Last Business Day (Lm) for each month
  const LmMap = new Map<number, string>(); // month index -> date string
  for (let m = 0; m < 12; m++) {
    const lmDate = getLastBusinessDay(2026, m, holidaySet);
    LmMap.set(m, lmDate.toISOString().split('T')[0]);
  }

  // To track "Previous Business Day Rate" for standard weekend logic
  let prevBizRate = E; 

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(dateStr);
    const isBusinessDay = !isWeekend && !isHoliday;
    const month = d.getMonth();

    // B. Daily Rate Logic (R_d)
    
    // Base Rate (Base_d)
    // C_d: Cumulative rate changes from meetings where Meeting Date < d
    // Note: Meeting date itself does NOT trigger change. Next day does.
    let cumulativeHike = 0;
    for (const m of meetings) {
      if (m.date < dateStr) {
         cumulativeHike += m.hikeBps;
      }
    }
    const baseRate = E + (cumulativeHike / 100);

    // Turn Premium (S_d)
    let Sd = 0;
    let isTurn = false;
    const LmStr = LmMap.get(month)!;
    // Removed unused LmDate here

    // Rule 1: Last Working Day
    if (dateStr === LmStr) {
      isTurn = true;
      if (month === 11) Sd = scenario.turns.yearEnd / 100; // Dec
      else if (month === 2 || month === 5 || month === 8) Sd = scenario.turns.quarterEnd / 100; // Mar, Jun, Sep
      else Sd = scenario.turns.monthEnd / 100;
    } 
    // Rule 2: Weekend Carry-Over
    // If d is Sat or Sun immediately following Lm
    else if (isWeekend) {
        
        const prevDay = new Date(d);
        prevDay.setDate(d.getDate() - 1);
        const prevDayStr = prevDay.toISOString().split('T')[0];
        
        if (prevDayStr === LmStr) {
            // d is immediately following Lm (e.g. Sat after Fri Lm)
            // Re-calculate the turn premium for Lm to carry over
            isTurn = true;
            if (month === 11) Sd = scenario.turns.yearEnd / 100;
            else if (month === 2 || month === 5 || month === 8) Sd = scenario.turns.quarterEnd / 100;
            else Sd = scenario.turns.monthEnd / 100;
        } else if (dayOfWeek === 0) { // Sunday
             // Check if Saturday was the one following Lm
             const twoDaysAgo = new Date(d);
             twoDaysAgo.setDate(d.getDate() - 2);
             const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
             if (twoDaysAgoStr === LmStr) {
                 isTurn = true;
                 if (month === 11) Sd = scenario.turns.yearEnd / 100;
                 else if (month === 2 || month === 5 || month === 8) Sd = scenario.turns.quarterEnd / 100;
                 else Sd = scenario.turns.monthEnd / 100;
             }
        }
    }

    // Final Daily Rate (Rd)
    // "Standard Weekend Logic: If d is a weekend/holiday (and not covered by Rule 2), Rd = Rate of previous business day."
    
    let finalRate: number;
    
    if (isBusinessDay) {
        finalRate = baseRate + Sd;
        prevBizRate = finalRate;
    } else {
        // Weekend or Holiday
        if (isTurn) {
            // Covered by Rule 2
            finalRate = baseRate + Sd; 
        } else {
            // Rule 3 / Standard Logic
            finalRate = prevBizRate;
            Sd = finalRate - baseRate;
        }
    }

    rates.push({
      date: dateStr,
      dayType: isBusinessDay ? 'Business' : isWeekend ? 'Weekend' : 'Holiday',
      baseRate: baseRate,
      turnPremium: Sd * 10000, 
      finalRate: finalRate,
      isMeetingDate: scenario.meetings.some(m => m.date === dateStr),
      isTurn: Math.abs(Sd) > 0.00001
    });
  }

  return rates;
};

export const calculateContracts = (dailyRates: DailyRate[]): MonthlyContract[] => {
  const monthlyData: Record<number, { sumRate: number; count: number }> = {};

  dailyRates.forEach(rate => {
    const month = parseInt(rate.date.split('-')[1], 10) - 1; // 0-11
    if (!monthlyData[month]) {
      monthlyData[month] = { sumRate: 0, count: 0 };
    }
    monthlyData[month].sumRate += rate.finalRate;
    monthlyData[month].count++;
  });

  const contracts: MonthlyContract[] = [];
  for (let m = 0; m < 12; m++) {
    const data = monthlyData[m];
    if (!data) continue;
    const avg = data.sumRate / data.count;
    contracts.push({
      month: m,
      monthName: MONTH_NAMES[m],
      year: 2026,
      avgRate: avg,
      outright: 100 - avg,
      spread1M: undefined,
      fly1M: undefined
    });
  }

  // Calculate 1M Spread: Outright(m) - Outright(m+1)
  for (let i = 0; i < contracts.length; i++) {
    if (i < contracts.length - 1) {
      contracts[i].spread1M = (contracts[i].outright - contracts[i+1].outright);
    }
  }

  // Calculate 1M Fly: Spread(m) - Spread(m+1)
  // Fly(m) = (Outright(m) - Outright(m+1)) - (Outright(m+1) - Outright(m+2))
  for (let i = 0; i < contracts.length; i++) {
    if (i < contracts.length - 2) {
      const s1 = contracts[i].spread1M;
      const s2 = contracts[i+1].spread1M;
      if (s1 !== undefined && s2 !== undefined) {
         contracts[i].fly1M = s1 - s2;
      }
    }
  }

  return contracts;
};