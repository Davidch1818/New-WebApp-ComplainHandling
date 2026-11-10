import React, { useState, useEffect } from 'react';

// Helper to safely parse API error response as string to prevent React rendering crashes
const parseError = (data, fallback) => {
  if (!data || !data.detail) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map(err => {
      const field = err.loc ? err.loc[err.loc.length - 1] : '';
      return `${field}: ${err.msg}`;
    }).join(', ');
  }
  if (typeof data.detail === 'object') {
    if (data.detail.errors && Array.isArray(data.detail.errors)) {
      return data.detail.errors.join(', ');
    }
    return JSON.stringify(data.detail);
  }
  return fallback;
};

const RoleManagementPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Selected role detail
  const [selectedRole, setSelectedRole] = useState(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    permission_ids: []
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    permission_ids: []
  });

  // Load roles
  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });
      if (statusFilter) queryParams.append('status', statusFilter);

      const res = await fetch(`/api/uam/roles?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRoles(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 0);
      } else {
        showFeedback('error', 'Failed to fetch roles');
      }
    } catch (err) {
      showFeedback('error', 'Network error fetching roles');
    } finally {
      setIsLoading(false);
    }
  };

  // Load permissions list (for checkboxes grouped by category)
  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/uam/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissions(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  // Fetch full role details (including permissions) when editing
  const openEditModal = async (role) => {
    setSelectedRole(role);
    try {
      const res = await fetch(`/api/uam/roles/${role.id}`);
      if (res.ok) {
        const data = await res.json();
        setEditForm({
          name: data.name || '',
          description: data.description || '',
          permission_ids: (data.permissions || []).map(p => p.id)
        });
        setIsEditOpen(true);
      } else {
        showFeedback('error', 'Failed to fetch role details');
      }
    } catch (err) {
      showFeedback('error', 'Error opening edit dialog');
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/uam/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `Role '${createForm.name}' created successfully.`);
        setIsCreateOpen(false);
        setCreateForm({ name: '', description: '', permission_ids: [] });
        fetchRoles();
      } else {
        showFeedback('error', parseError(data, 'Role creation failed'));
      }
    } catch (err) {
      showFeedback('error', 'Network error creating role');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/uam/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `Role details updated successfully.`);
        setIsEditOpen(false);
        fetchRoles();
      } else {
        showFeedback('error', parseError(data, 'Update failed'));
      }
    } catch (err) {
      showFeedback('error', 'Network error updating role');
    }
  };

  const handleToggleStatus = async (role, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/uam/roles/${role.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `Role '${role.name}' status set to ${nextStatus}.`);
        fetchRoles();
      } else {
        showFeedback('error', parseError(data, 'Failed to update status'));
      }
    } catch (err) {
      showFeedback('error', 'Network error changing status');
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete role '${role.name}'? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/uam/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `Role '${role.name}' has been deleted.`);
        fetchRoles();
      } else {
        showFeedback('error', parseError(data, 'Delete failed (make sure no users are assigned to this role)'));
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting role');
    }
  };

  const togglePermissionCheckbox = (permId, isEdit) => {
    if (isEdit) {
      const ids = [...editForm.permission_ids];
      if (ids.includes(permId)) {
        setEditForm({ ...editForm, permission_ids: ids.filter(id => id !== permId) });
      } else {
        setEditForm({ ...editForm, permission_ids: [...ids, permId] });
      }
    } else {
      const ids = [...createForm.permission_ids];
      if (ids.includes(permId)) {
        setCreateForm({ ...createForm, permission_ids: ids.filter(id => id !== permId) });
      } else {
        setCreateForm({ ...createForm, permission_ids: [...ids, permId] });
      }
    }
  };

  // Group permissions by category
  const getGroupedPermissions = () => {
    const groups = {};
    permissions.forEach(p => {
      const cat = p.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  };

  const groupedPermissions = getGroupedPermissions();

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Role Management</h2>
          <p className="text-sm text-on-surface-variant">Configure user access groups and permission assignments</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/uam/roles/export"
            download
            className="glass-panel flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white border border-outline rounded-md cursor-pointer text-on-surface hover:bg-gray-50"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Roles
          </a>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-md shadow-sm hover:bg-primary-dark transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Role
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {feedback.message && (
        <div className={`p-4 rounded-md text-sm font-medium border flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
          {feedback.type === 'success' ? (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {feedback.message}
        </div>
      )}

      {/* Filter and Status Option */}
      <div className="glass-panel p-5 bg-white border border-outline rounded-xl shadow-sm">
        <div className="flex gap-4 items-center">
          <span className="text-sm font-medium text-on-surface-variant">Filter by Status:</span>
          <div className="w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-4 py-2 border border-outline rounded-md text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All Roles</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden bg-white border border-outline rounded-xl shadow-sm">
        {isLoading ? (
          <div className="flex justify-center items-center p-12 text-sm text-on-surface-variant">
            <span>Loading roles...</span>
          </div>
        ) : roles.length === 0 ? (
          <div className="flex justify-center items-center p-12 text-sm text-on-surface-variant">
            <span>No roles defined.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-outline">
                  <th className="p-4">Role Name</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-outline hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-semibold text-on-surface">{role.name}</td>
                    <td className="p-4 text-on-surface-variant">{role.description || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${role.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {role.status}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant">{new Date(role.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right flex gap-2 justify-end">
                      {role.name !== 'super_admin' && role.name !== 'Super_Admin' && (
                        <button
                          onClick={() => handleToggleStatus(role, role.status)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-outline bg-white text-on-surface hover:bg-gray-50"
                        >
                          {role.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(role)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-outline bg-white text-primary hover:bg-gray-50"
                      >
                        Edit / Permissions
                      </button>

                      {role.name !== 'super_admin' && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-outline bg-white text-danger hover:bg-gray-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-outline bg-white">
            <span className="text-sm text-on-surface-variant">
              Showing Page {page} of {totalPages} ({total} Roles)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className={`px-3 py-2 text-sm rounded-md border border-outline bg-white ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className={`px-3 py-2 text-sm rounded-md border border-outline bg-white ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="glass-panel bg-white p-8 w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl">
            <h3 className="text-xl font-bold mb-6 text-on-surface">Create New Role</h3>
            <form onSubmit={handleCreateRole} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Role Name <span className="text-danger ml-0.5">*</span></label>
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9_.-]+$"
                  title="Role Name can only contain letters, numbers, dots, dashes, and underscores (no spaces)."
                  placeholder="e.g. Reconciliation_Operator"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Description</label>
                <textarea
                  placeholder="Describe the scope and access of this role..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md min-h-[80px] font-inherit focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-on-surface">Assign Permissions</label>
                <div className="flex flex-col gap-4 border border-outline p-4 rounded-md max-h-[300px] overflow-y-auto">
                  {Object.keys(groupedPermissions).map(category => (
                    <div key={category}>
                      <h4 className="text-xs uppercase text-on-surface-variant font-bold mb-1.5 border-b border-gray-100 pb-1">
                        {category}
                      </h4>
                      <div className="flex flex-col gap-1 pl-2">
                        {groupedPermissions[category].map(p => (
                          <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                            <input
                              type="checkbox"
                              checked={createForm.permission_ids.includes(p.id)}
                              onChange={() => togglePermissionCheckbox(p.id, false)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span>{p.name} <code className="text-xs text-on-surface-variant">({p.code})</code></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm text-on-surface-variant hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="glass-panel bg-white p-8 w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl">
            <h3 className="text-xl font-bold mb-6 text-on-surface">Edit Role & Permissions</h3>
            <form onSubmit={handleUpdateRole} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Role Name <span className="text-danger ml-0.5">*</span></label>
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9_.-]+$"
                  title="Role Name can only contain letters, numbers, dots, dashes, and underscores (no spaces)."
                  disabled={selectedRole?.name === 'super_admin'}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${selectedRole?.name === 'super_admin' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md min-h-[80px] font-inherit focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-on-surface">Edit Permissions</label>
                <div className="flex flex-col gap-4 border border-outline p-4 rounded-md max-h-[300px] overflow-y-auto">
                  {Object.keys(groupedPermissions).map(category => (
                    <div key={category}>
                      <h4 className="text-xs uppercase text-on-surface-variant font-bold mb-1.5 border-b border-gray-100 pb-1">
                        {category}
                      </h4>
                      <div className="flex flex-col gap-1 pl-2">
                        {groupedPermissions[category].map(p => (
                          <label key={p.id} className={`flex items-center gap-2 text-sm py-0.5 ${selectedRole?.name === 'super_admin' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              disabled={selectedRole?.name === 'super_admin'}
                              checked={editForm.permission_ids.includes(p.id)}
                              onChange={() => togglePermissionCheckbox(p.id, true)}
                              className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                            />
                            <span>{p.name} <code className="text-xs text-on-surface-variant">({p.code})</code></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm text-on-surface-variant hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoleManagementPage;