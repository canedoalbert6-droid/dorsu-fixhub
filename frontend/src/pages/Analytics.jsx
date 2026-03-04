import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981'];

const Analytics = ({ reports }) => {
  // 1. Data for Status Pie Chart
  const statusData = useMemo(() => {
    const counts = { Pending: 0, 'In Progress': 0, Resolved: 0 };
    reports.forEach(r => counts[r.status]++);
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [reports]);

  // 2. Data for Category Bar Chart
  const categoryData = useMemo(() => {
    const counts = {};
    reports.forEach(r => {
      counts[r.issue] = (counts[r.issue] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }));
  }, [reports]);

  const stats = {
    pending: reports.filter(r => r.status === 'Pending').length,
    progress: reports.filter(r => r.status === 'In Progress').length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
  };

  return (
    <div className="analytics-view">
      {/* KPI Cards */}
      <div className="stats-row">
        <div className="stat-card pending">
          <Clock size={24} />
          <div className="stat-val">{stats.pending}</div>
          <div className="stat-lbl">Pending</div>
        </div>
        <div className="stat-card progress">
          <AlertTriangle size={24} />
          <div className="stat-val">{stats.progress}</div>
          <div className="stat-lbl">In Progress</div>
        </div>
        <div className="stat-card resolved">
          <CheckCircle size={24} />
          <div className="stat-val">{stats.resolved}</div>
          <div className="stat-lbl">Resolved</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-box">
          <h4>Report Status Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%" cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h4>Issues by Category</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#15803d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
