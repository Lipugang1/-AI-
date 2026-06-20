export type HazardLevel = 'general_i' | 'general_ii';

export type HazardStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'processing' | 'closed';

export interface HazardRecord {
  id: string;
  serial_number?: number;
  inspection_date: string;
  inspection_location: string;
  line?: string;
  inspection_center?: string;
  inspection_department?: string;
  inspection_team?: string;
  inspection_position?: string;
  inspector?: string;
  inspector_name?: string;
  inspector_id?: string;
  hazard_description: string;
  hazard_category?: string;
  hazard_level: HazardLevel;
  status: HazardStatus;
  temporary_measures?: string;
  governance_department?: string;
  cooperating_department?: string;
  governance_person?: string;
  governance_measure?: string;
  governance_deadline?: string;
  governance_result?: string;
  governance_details?: string;
  reviewer_name?: string;
  images?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HazardQueryParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  inspectionDepartment?: string;
  inspectionTeam?: string;
  inspectorName?: string;
  status?: HazardStatus;
  hazardLevel?: HazardLevel;
  keyword?: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
