// Model: Authentication data and helpers

export const getToken = () => localStorage.getItem('adminToken');
export const getRole = () => localStorage.getItem('userRole') || 'Viewer';
export const getUserName = () => localStorage.getItem('userName') || '';
export const getQrToken = () => localStorage.getItem('qrToken') || '';
export const getUserId = () => {
  const id = localStorage.getItem('userId');
  if (id) return parseInt(id);
  
  // Fallback: extract from JWT
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || null;
  } catch {
    return null;
  }
};

export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const saveAuth = ({ token, role, name, id, qrToken }) => {
  localStorage.setItem('adminToken', token);
  localStorage.setItem('userRole', role);
  localStorage.setItem('userName', name);
  localStorage.setItem('userId', id);
  if (qrToken) localStorage.setItem('qrToken', qrToken);
};

export const clearAuth = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  localStorage.removeItem('qrToken');
};

export const getAuthHeader = () => ({
  Authorization: `Bearer ${getToken()}`,
});
