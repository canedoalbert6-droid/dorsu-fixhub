// Service: Authentication API calls

import axios from 'axios';
import { API_URL } from '../utils/config';

/**
 * Authenticates a user with the backend.
 * @returns {{ token, user: { username, name, role } }}
 */
export const login = async (username, password) => {
  try {
    const res = await axios.post(`${API_URL}/login`, { username, password });
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return { success: false, message: 'Connection failed. Please check if the server is running.' };
  }
};
