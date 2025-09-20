export type PlacementStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface Placement {
  id: number;
  userId: number;
  jobId: number;
  departmentId: number;
  shiftId: number;
  shiftDate: Date;
  vacancy: number;
  confirmed: boolean;
  status: PlacementStatus;
  meta: object;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    displayName: string;
    profile?: any;
  };
}

export interface Job {
  id: number;
  title: string;
  startDate: string;
  endDate: string | null;
  status: string;
  vacancies: number;
  clientId: number;
  clientName?: string;
  departmentId: number;
  departmentName?: string;
  shiftId: number;
  shiftName?: string;
  owner?: {
    id: number;
    username: string;
    profile?: any;
  };
  placements?: Placement[];
  body?: {
    includeWeekends?: boolean;
  };
}

export interface Department {
  id: number;
  name: string;
}

export interface DepartmentResponse {
  [key: string]: string;
}

export type ViewType = 'daily' | 'weekly' | 'monthly';