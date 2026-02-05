export interface Meeting {
  date: string; // YYYY-MM-DD
  hikeBps: number;
}

export interface TurnPremiums {
  monthEnd: number;
  quarterEnd: number;
  yearEnd: number;
}

export interface Scenario {
  id: string;
  name: string;
  baseSofr: number;
  baseEffr: number | null; // Null means use Sofr. Serves as 'E' (Initial Rate)
  meetings: Meeting[];
  turns: TurnPremiums;
}

export interface DailyRate {
  date: string; // YYYY-MM-DD
  dayType: 'Business' | 'Weekend' | 'Holiday';
  baseRate: number; // Base_d
  turnPremium: number; // S_d
  finalRate: number; // R_d
  isMeetingDate: boolean;
  isTurn: boolean;
}

export interface MonthlyContract {
  month: number; // 0-11
  monthName: string;
  year: number;
  avgRate: number; // Avg_m
  outright: number; // 100 - Avg_m
  spread1M?: number; // Outright(m) - Outright(m+1)
}

export interface Holiday {
  date: string;
  localName: string;
  name: string;
}
