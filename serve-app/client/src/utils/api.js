import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
login: (email, password) => api.post('/api/auth/login', { email, password }),
me: () => api.get('/api/auth/me'),
register: (data) => api.post('/api/auth/register', data),
};

export const teams = {
  list: () => api.get('/api/teams'),
  get: (id) => api.get(`/api/teams/${id}`),
  create: (data) => api.post('/api/teams', data),
  update: (id, data) => api.put(`/api/teams/${id}`, data),
  addRole: (id, data) => api.post(`/api/teams/${id}/roles`, data),
  deleteRole: (id, roleId) => api.delete(`/api/teams/${id}/roles/${roleId}`),
  addMember: (id, data) => api.post(`/api/teams/${id}/members`, data),
  removeMember: (id, volunteerId) => api.delete(`/api/teams/${id}/members/${volunteerId}`),
};

export const volunteers = {
  list: () => api.get('/api/volunteers'),
  get: (id) => api.get(`/api/volunteers/${id}`),
  create: (data) => api.post('/api/volunteers', data),
  update: (id, data) => api.put(`/api/volunteers/${id}`, data),
  addBlockedDate: (id, data) => api.post(`/api/volunteers/${id}/blocked-dates`, data),
};

export const events = {
  list: (params) => api.get('/api/events', { params }),
  get: (id) => api.get(`/api/events/${id}`),
  create: (data) => api.post('/api/events', data),
  update: (id, data) => api.put(`/api/events/${id}`, data),
};

export const sessions = {
  create: (data) => api.post('/api/sessions', data),
  get: (id) => api.get(`/api/sessions/${id}`),
  update: (id, data) => api.put(`/api/sessions/${id}`, data),
  publish: (id) => api.post(`/api/sessions/${id}/publish`),
};

export const scheduling = {
  getForSession: (sessionId) => api.get(`/api/scheduling/session/${sessionId}`),
  assign: (data) => api.post('/api/scheduling', data),
  respond: (id, data) => api.patch(`/api/scheduling/${id}/respond`, data),
  remove: (id) => api.delete(`/api/scheduling/${id}`),
  checkConflict: (params) => api.get('/api/scheduling/conflict-check', { params }),
  suggest: (params) => api.get('/api/scheduling/suggest', { params }),
};

export const flow = {
  getForSession: (sessionId) => api.get(`/api/flow/session/${sessionId}`),
  create: (data) => api.post('/api/flow', data),
  update: (id, data) => api.put(`/api/flow/${id}`, data),
  delete: (id) => api.delete(`/api/flow/${id}`),
  reorder: (items) => api.post('/api/flow/reorder', { items }),
  assign: (id, data) => api.post(`/api/flow/${id}/assign`, data),
  unassign: (id, volunteerId) => api.delete(`/api/flow/${id}/assign/${volunteerId}`),
};

export const notifications = {
  list: () => api.get('/api/notifications'),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
};

export const dashboard = {
  admin: () => api.get('/api/dashboard/admin'),
  volunteer: () => api.get('/api/dashboard/volunteer'),
};

export default api;
