/** Response of GET /api/health. */
export interface HealthStatus {
  status: 'ok';
  service: 'domar-api';
  timestamp: string;
}
