export interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  status: string;
  vacancies: number;
  clientId: number;
  clientName?: string;
  shiftId: number;
  shiftName?: string;
  body?: {
    includeWeekends?: boolean;
  };
}

export type ViewType = 'daily' | 'weekly' | 'monthly';