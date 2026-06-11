const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() { this.baseUrl = API_URL; }

  getToken() {
    if (typeof window !== 'undefined') return localStorage.getItem('fc_token');
    return null;
  }

  getAdminToken() {
    if (typeof window !== 'undefined') return localStorage.getItem('fc_admin_token');
    return null;
  }

  async request(endpoint, options = {}, _retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = options.adminAuth ? this.getAdminToken() : this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { ...options, headers });

    // Retry on 429 (Too Many Requests) — back off and try again
    if (response.status === 429 && _retryCount < 3) {
      const waitMs = Math.min(2000 * Math.pow(2, _retryCount), 10000); // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, waitMs));
      return this.request(endpoint, options, _retryCount + 1);
    }

    if (
      response.headers.get('content-type')?.includes('application/vnd.openxmlformats') ||
      response.headers.get('content-type')?.includes('text/csv')
    ) return response;

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  get(endpoint, options = {})         { return this.request(endpoint, { method: 'GET', ...options }); }
  post(endpoint, body, options = {})  { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }); }
  put(endpoint, body, options = {})   { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }); }
  del(endpoint, options = {})         { return this.request(endpoint, { method: 'DELETE', ...options }); }
}

const api = new ApiClient();
export default api;
