import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
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
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
};

export const teams = {
  list: () => api.get('/teams'),
  get: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  addRole: (id, data) => api.post(`/teams/${id}/roles`, data),
  deleteRole: (id, roleId) => api.delete(`/teams/${id}/roles/${roleId}`),
  addMember: (id, data) => api.post(`/teams/${id}/members`, data),
  removeMember: (id, volunteerId) => api.delete(`/teams/${id}/members/${volunteerId}`),
};

export const volunteers = {
  list: () => api.get('/volunteers'),
  get: (id) => api.get(`/volunteers/${id}`),
  create: (data) => api.post('/volunteers', data),
  update: (id, data) => api.put(`/volunteers/${id}`, data),
  addBlockedDate: (id, data) => api.post(`/volunteers/${id}/blocked-dates`, data),
};

export const events = {
  list: (params) => api.get('/events', { params }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
};

export const sessions = {
  create: (data) => api.post('/sessions', data),
  get: (id) => api.get(`/sessions/${id}`),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  publish: (id) => api.post(`/sessions/${id}/publish`),
};

export const scheduling = {
  getForSession: (sessionId) => api.get(`/scheduling/session/${sessionId}`),
  assign: (data) => api.post('/scheduling', data),
  respond: (id, data) => api.patch(`/scheduling/${id}/respond`, data),
  remove: (id) => api.delete(`/scheduling/${id}`),
  checkConflict: (params) => api.get('/scheduling/conflict-check', { params }),
  suggest: (params) => api.get('/scheduling/suggest', { params }),
};

export const flow = {
  getForSession: (sessionId) => api.get(`/flow/session/${sessionId}`),
  create: (data) => api.post('/flow', data),
  update: (id, data) => api.put(`/flow/${id}`, data),
  delete: (id) => api.delete(`/flow/${id}`),
  reorder: (items) => api.post('/flow/reorder', { items }),
  assign: (id, data) => api.post(`/flow/${id}/assign`, data),
  unassign: (id, volunteerId) => api.delete(`/flow/${id}/assign/${volunteerId}`),
};

export const notifications = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const dashboard = {
  admin: () => api.get('/dashboard/admin'),
  volunteer: () => api.get('/dashboard/volunteer'),
};

export default api;
