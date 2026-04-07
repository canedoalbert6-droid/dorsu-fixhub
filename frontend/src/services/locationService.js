// Service: Location API calls

import axios from 'axios';
import { API_URL } from '../utils/config';

/**
 * Fetches a location by ID.
 */
export const fetchLocation = async (locationId) => {
  const res = await axios.get(`${API_URL}/locations/${locationId}`);
  return res.data;
};

/**
 * Fetches the 3 most recent reports for a given location.
 */
export const fetchRecentReportsForLocation = async (locationId) => {
  const res = await axios.get(`${API_URL}/reports/location/${locationId}`);
  return res.data;
};
