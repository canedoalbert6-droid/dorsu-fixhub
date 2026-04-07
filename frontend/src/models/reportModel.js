// Model: Report data shapes, constants, and pure helpers

export const REPORT_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const REPORT_TYPE = {
  MAINTENANCE: 'Maintenance',
  INNOVATION: 'Innovation',
};

export const PRIORITY = {
  EMERGENCY: 'Emergency',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const PRIORITY_COLORS = {
  [PRIORITY.EMERGENCY]: '#dc2626',
  [PRIORITY.HIGH]: '#ea580c',
  [PRIORITY.MEDIUM]: '#ca8a04',
  [PRIORITY.LOW]: '#64748b',
};

export const SLA_HOURS = {
  [PRIORITY.EMERGENCY]: 2,
  [PRIORITY.HIGH]: 8,
  [PRIORITY.MEDIUM]: 24,
  [PRIORITY.LOW]: 72,
};

export const MAINTENANCE_ISSUES = [
  'Broken Furniture',
  'Electrical Problem',
  'Plumbing Leak',
  'Structural Damage',
  'Other',
];

export const INNOVATION_ISSUES = [
  'Facility Upgrade',
  'Energy Efficiency',
  'Student Comfort',
  'Tech Integration',
  'Other Idea',
];

/**
 * Returns the priority color for a given priority string.
 */
export const getPriorityColor = (priority) =>
  PRIORITY_COLORS[priority] || PRIORITY_COLORS[PRIORITY.LOW];

/**
 * Returns true if the report's SLA is breached and it's not resolved.
 */
export const isSlaBreached = (report) =>
  report.sla_breached === 1 && report.status !== REPORT_STATUS.RESOLVED;

export const getAuthHeader = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
