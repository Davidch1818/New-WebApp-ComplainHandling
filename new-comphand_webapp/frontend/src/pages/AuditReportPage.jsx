import React, { useState, useEffect } from 'react';

const AuditReportPage = () => {
  const [activeTab, setActiveTab] = useState('matrix');
  const [accessMatrix, setAccessMatrix] = useState([]);

  // Audit log states
  const [auditLogs, setAuditLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize] = useState(50);
  const [logTotal, setLogTotal] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(0);

  // Filters for Audit Log
  const [actorId, setActorId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // List of actions for filter dropdown
  const actionOptions = [
    'LOGIN', 'LOGOUT', 'CHANGE_PASSWORD', 'RESET_PASSWORD',
    'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'UPDATE_USER_STATUS',
    'CREATE_ROLE', 'UPDATE_ROLE', 'DELETE_ROLE', 'UPDATE_ROLE_STATUS',
    'BULK_CREATE_USERS'
  ];

  // Fetch access matrix
  const fetchAccessMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/uam/audit/access-matrix');
      if (res.ok) {
        const data = await res.json();
        setAccessMatrix(data || []);
      } else {
        showFeedback('error', 'Failed to fetch access matrix report');
      }
    } catch (err) {
      showFeedback('error', 'Network error fetching access matrix');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: logPage.toString(),
        page_size: logPageSize.toString()
      });
      if (actorId) queryParams.append('actor_id', actorId);
      if (actionFilter) queryParams.append('action', actionFilter);
      if (dateFrom) queryParams.append('date_from', new Date(dateFrom).toISOString());
      if (dateTo) queryParams.append('date_to', new Date(dateTo).toISOString());

      const res = await fetch(`/api/uam/audit/log?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.items || []);
        setLogTotal(data.total || 0);
        setLogTotalPages(data.total_pages || 0);
      } else {
        showFeedback('error', 'Failed to fetch audit logs');
      }
    } catch (err) {
      showFeedback('error', 'Network error fetching audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'matrix') {
      fetchAccessMatrix();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab, logPage]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setLogPage(1);
    fetchAuditLogs();
  };

  const handleClearFilters = () => {
    setActorId('');
    setActionFilter('');
    setDateFrom('');
    setDateTo('');
    setLogPage(1);
    // Directly trigger fetch by temporarily overriding the values in state
    setTimeout(() => fetchAuditLogs(), 0);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Audit & Compliance Reports</h2>
          <p className="text-sm text-on-surface-variant">Generate system access matrix and inspect administrative audit logs</p>
        </div>
        {activeTab === 'matrix' && (
          <a
            href="/api/uam/audit/access-matrix/export"
            download
            className="glass-panel flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white border border-outline rounded-md cursor-pointer text-on-surface hover:bg-gray-50"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Access Matrix
          </a>
        )}
      </div>

      {/* Alert message banner */}
      {feedback.message && (
        <div className={`p-4 rounded-md text-sm font-medium border flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-outline">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-6 py-4 text-sm font-semibold mb-[-2px] transition-colors ${activeTab === 'matrix' ? 'border-b-4 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Access Matrix Report
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-4 text-sm font-semibold mb-[-2px] transition-colors ${activeTab === 'logs' ? 'border-b-4 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          System Audit Logs
        </button>
      </div>

      {/* TAB CONTENT: ACCESS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="glass-panel overflow-hidden bg-white border border-outline rounded-xl shadow-sm">
          {isLoading ? (
            <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
              <span>Loading matrix...</span>
            </div>
          ) : accessMatrix.length === 0 ? (
            <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
              <span>No user access data.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-outline">
                    <th className="p-4 w-[150px]">User ID</th>
                    <th className="p-4 w-[200px]">Full Name</th>
                    <th className="p-4 w-[120px]">Status</th>
                    <th className="p-4 w-[200px]">Assigned Roles</th>
                    <th className="p-4">Active Menu / Function Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessMatrix.map((row) => (
                    <tr key={row.user_id} className="border-b border-outline hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-semibold text-on-surface">{row.user_id}</td>
                      <td className="p-4 text-on-surface">{row.full_name}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {row.roles.length === 0 ? <span className="text-on-surface-variant">None</span> : row.roles.map((r, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-200 rounded-md text-xs text-on-surface">{r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {row.permissions.length === 0 ? <span className="text-on-surface-variant">None</span> : row.permissions.map((p, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-primary/10 text-primary-dark rounded-md text-xs font-medium">{p}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-4">

          {/* Filters Form */}
          <div className="glass-panel p-5 bg-white border border-outline rounded-xl shadow-sm">
            <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">Actor ID</label>
                <input
                  type="text"
                  placeholder="Filter by Actor..."
                  value={actorId}
                  onChange={(e) => setActorId(e.target.value)}
                  className="w-full p-2 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">Action</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full p-2 border border-outline rounded-md text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Actions</option>
                  {actionOptions.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-2 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1.5 text-on-surface-variant">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-2 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md font-semibold text-sm hover:bg-primary-dark transition-colors"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 border border-outline text-on-surface-variant rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Audit Logs Table */}
          <div className="glass-panel overflow-hidden bg-white border border-outline rounded-xl shadow-sm">
            {isLoading ? (
              <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
                <span>Loading logs...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
                <span>No audit log records found matching constraints.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-outline">
                      <th className="p-4 w-[180px]">Timestamp</th>
                      <th className="p-4 w-[120px]">Actor ID</th>
                      <th className="p-4 w-[180px]">Action</th>
                      <th className="p-4 w-[120px]">Target ID</th>
                      <th className="p-4">Details</th>
                      <th className="p-4 w-[140px]">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-outline hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-on-surface-variant">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-4 font-semibold text-on-surface">{log.actor_id}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${log.action.includes('FAIL') || log.action.includes('DELETE') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-on-surface-variant">
                          {log.target_id ? `${log.target_type || ''} (${log.target_id})` : '-'}
                        </td>
                        <td className="p-4 font-mono text-xs max-h-[100px] overflow-y-auto whitespace-pre-wrap text-on-surface">
                          {log.detail ? JSON.stringify(log.detail) : '-'}
                        </td>
                        <td className="p-4 text-on-surface-variant">{log.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {logTotalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-outline bg-white">
                <span className="text-sm text-on-surface-variant">
                  Showing Page {logPage} of {logTotalPages} ({logTotal} logs)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={logPage === 1}
                    onClick={() => setLogPage(logPage - 1)}
                    className={`px-3 py-2 text-sm rounded-md border border-outline bg-white ${logPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    disabled={logPage === logTotalPages}
                    onClick={() => setLogPage(logPage + 1)}
                    className={`px-3 py-2 text-sm rounded-md border border-outline bg-white ${logPage === logTotalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default AuditReportPage;