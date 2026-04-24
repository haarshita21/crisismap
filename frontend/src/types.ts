export interface Incident {
  id: string;
  raw_text: string;
  location_name: string;
  lat: number;
  lng: number;
  crisis_type: string;
  priority: string;
  needs: string[];
  summary: string;
  status: string;
  approved: boolean;
  report_count: number;
  timestamp: number;
}
