import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export const leadApi = {
  fetchLeads: async (params = {}) => {
    const response = await api.get('/leads/', { params });
    return response.data;
  },

  getLead: async (leadId) => {
    const response = await api.get(`/leads/${leadId}`);
    return response.data;
  },

  createLead: async (leadData) => {
    const response = await api.post('/leads/', leadData);
    return response.data;
  },

  updateLead: async (leadId, leadData) => {
    const response = await api.put(`/leads/${leadId}`, leadData);
    return response.data;
  },

  deleteLead: async (leadId) => {
    const response = await api.delete(`/leads/${leadId}`);
    return response.data;
  },

  searchLeads: async (searchParams) => {
    const response = await api.post('/leads/search', searchParams);
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/leads/stats/dashboard');
    return response.data;
  },

  bulkImportLeads: async (leadsData) => {
    const response = await api.post('/leads/bulk-import', leadsData);
    return response.data;
  },
};

export default leadApi;
