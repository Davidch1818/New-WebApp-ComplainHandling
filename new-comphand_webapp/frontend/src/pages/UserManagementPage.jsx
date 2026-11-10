import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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

// Password generator aligning with security rules in docs/security-requirements.md
const generateComplexPassword = (userId) => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid confusing characters
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  // Ensure at least 2 characters from each category to mathematically satisfy "3 of 4 categories" + length >= 8
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += specials.charAt(Math.floor(Math.random() * specials.length));
  password += specials.charAt(Math.floor(Math.random() * specials.length));

  // Shuffle to prevent predictable order
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const generated = arr.join('');

  if (userId && generated.toLowerCase() === userId.toLowerCase()) {
    return generateComplexPassword(userId);
  }
  return generated;
};

// Fallback clipboard logic for non-secure contexts (e.g. non-HTTPS IPs)
const copyToClipboard = (text, onSuccess, onError) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => { if (onSuccess) onSuccess(); })
      .catch((err) => { if (onError) onError(err); });
  } else {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // Prevent scrolling to bottom
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";

      // Hide visually without using opacity:0 or display:none which breaks execCommand
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";

      document.body.appendChild(textArea);

      // Focus and select
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        if (onSuccess) onSuccess();
      } else {
        if (onError) onError(new Error("execCommand('copy') returned false"));
      }
    } catch (error) {
      if (onError) onError(error);
    }
  }
};

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Selected user details for Edit/Reset/Delete
  const [selectedUser, setSelectedUser] = useState(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    user_id: '',
    full_name: '',
    email: '',
    department: '',
    temporary_password: '',
    role_ids: [],
    force_change_pwd: true
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    department: '',
    role_ids: []
  });

  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetForceChangePwd, setResetForceChangePwd] = useState(true);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLogs, setBulkLogs] = useState(null);

  // Password Visibility States
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Load users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });
      if (search) queryParams.append('search', search);
      if (statusFilter) queryParams.append('status', statusFilter);

      const res = await fetch(`/api/uam/users?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 0);
      } else {
        showFeedback('error', 'Failed to fetch users');
      }
    } catch (err) {
      showFeedback('error', 'Network error fetching users');
    } finally {
      setIsLoading(false);
    }
  };

  // Load roles list (for select/checkboxes)
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/uam/roles?page_size=100');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 6000);
  };

  // Fetch full user details (including roles) when editing
  const openEditModal = async (user) => {
    setSelectedUser(user);
    try {
      const res = await fetch(`/api/uam/users/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setEditForm({
          full_name: data.full_name || '',
          email: data.email || '',
          department: data.department || '',
          role_ids: (data.roles || []).map(r => r.id)
        });
        setIsEditOpen(true);
      } else {
        showFeedback('error', 'Failed to fetch user details');
      }
    } catch (err) {
      showFeedback('error', 'Error opening edit dialog');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/uam/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `User '${createForm.user_id}' created successfully.`);
        setIsCreateOpen(false);
        setCreateForm({ user_id: '', full_name: '', email: '', department: '', temporary_password: '', role_ids: [], force_change_pwd: true });
        fetchUsers();
      } else {
        showFeedback('error', parseError(data, 'User creation failed'));
      }
    } catch (err) {
      showFeedback('error', 'Network error creating user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/uam/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `User details updated successfully.`);
        setIsEditOpen(false);
        fetchUsers();
      } else {
        showFeedback('error', parseError(data, 'Update failed'));
      }
    } catch (err) {
      showFeedback('error', 'Network error updating user');
    }
  };

  const handleToggleStatus = async (user, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/uam/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `User '${user.user_id}' status set to ${nextStatus}.`);
        fetchUsers();
      } else {
        showFeedback('error', parseError(data, 'Failed to update status'));
      }
    } catch (err) {
      showFeedback('error', 'Network error changing status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user '${user.user_id}'? This is a soft-delete (90-day cooldown).`)) {
      return;
    }
    try {
      const res = await fetch(`/api/uam/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `User '${user.user_id}' has been deleted.`);
        fetchUsers();
      } else {
        showFeedback('error', parseError(data, 'Delete failed'));
      }
    } catch (err) {
      showFeedback('error', 'Network error deleting user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/uam/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: resetPasswordVal, force_change_pwd: resetForceChangePwd })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback('success', `Password reset for user '${selectedUser.user_id}' successfully.`);
        setIsResetOpen(false);
        setResetPasswordVal('');
        setResetForceChangePwd(true);
      } else {
        showFeedback('error', parseError(data, 'Reset failed'));
      }
    } catch (err) {
      showFeedback('error', 'Network error resetting password');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) return;

    const formData = new FormData();
    formData.append('file', bulkFile);

    setIsLoading(true);
    try {
      const res = await fetch('/api/uam/users/bulk', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setBulkLogs(data);
        showFeedback('success', `Bulk upload processed. Created: ${data.created || 0}`);
        fetchUsers();
      } else {
        showFeedback('error', parseError(data, 'Bulk upload failed'));
      }
    } catch (err) {
      showFeedback('error', 'Network error uploading file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const tempPassword = generateComplexPassword('');
    setCreateForm({
      user_id: '',
      full_name: '',
      email: '',
      department: '',
      temporary_password: tempPassword,
      role_ids: []
    });
    setShowCreatePassword(false);
    setIsCreateOpen(true);
  };

  const handleRegeneratePassword = () => {
    const tempPassword = generateComplexPassword(createForm.user_id);
    setCreateForm(prev => ({ ...prev, temporary_password: tempPassword }));
  };

  const handleOpenResetModal = (user) => {
    setSelectedUser(user);
    const tempPassword = generateComplexPassword(user.user_id);
    setResetPasswordVal(tempPassword);
    setShowResetPassword(false);
    setIsResetOpen(true);
  };

  const toggleRoleCheckbox = (roleId, isEdit) => {
    if (isEdit) {
      const ids = [...editForm.role_ids];
      if (ids.includes(roleId)) {
        setEditForm({ ...editForm, role_ids: ids.filter(id => id !== roleId) });
      } else {
        setEditForm({ ...editForm, role_ids: [...ids, roleId] });
      }
    } else {
      const ids = [...createForm.role_ids];
      if (ids.includes(roleId)) {
        setCreateForm({ ...createForm, role_ids: ids.filter(id => id !== roleId) });
      } else {
        setCreateForm({ ...createForm, role_ids: [...ids, roleId] });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Header and Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">User Management</h2>
          <p className="text-sm text-on-surface-variant">Create, update, lock, and manage application users</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/uam/users/export"
            download
            className="glass-panel flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white border border-outline rounded-md cursor-pointer text-on-surface hover:bg-gray-50"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Users
          </a>
          <button
            onClick={() => { setBulkLogs(null); setIsBulkOpen(true); }}
            className="glass-panel flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white border border-outline rounded-md cursor-pointer text-on-surface hover:bg-gray-50"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Bulk Upload
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback.message && (
        <div className={`fixed top-6 right-6 z-[9999] shadow-md p-4 rounded-md border flex items-center gap-2 text-sm font-medium ${feedback.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
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

      {/* Filter and Search Bar */}
      <div className="glass-panel p-5 bg-white border border-outline rounded-xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <input
              type="text"
              placeholder="Search by User ID, Name, or Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2.5 pr-4 pl-10 border border-outline rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <svg
              className="absolute left-3.5 top-3 text-on-surface-variant"
              width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline rounded-md text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="locked">Locked</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary text-white rounded-md font-semibold text-sm hover:bg-primary-dark transition-colors"
          >
            Search
          </button>
          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
              className="px-4 py-2.5 text-on-surface-variant text-sm font-medium hover:bg-gray-50 rounded-md transition-colors"
            >
              Clear filters
            </button>
          )}
        </form>
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden bg-white border border-outline rounded-xl shadow-sm">
        {isLoading ? (
          <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
            <span>Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex justify-center items-center p-12 text-on-surface-variant text-sm">
            <span>No users found matching requirements.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-outline">
                  <th className="p-4">User ID</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Force Change Pwd</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-outline hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-semibold">{user.user_id}</td>
                    <td className="p-4">{user.full_name}</td>
                    <td className="p-4 text-on-surface-variant">{user.email || '-'}</td>
                    <td className="p-4">{user.department || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${user.status === 'active' ? 'bg-green-100 text-green-800' : user.status === 'locked' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={user.must_change_pwd ? 'text-warning font-medium' : 'text-on-surface-variant'}>
                        {user.must_change_pwd ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right flex gap-2 justify-end">
                      {(!user.roles || !user.roles.some(r => r.name === 'super_admin' || r.name === 'Super_Admin')) && (
                        <button
                          onClick={() => handleToggleStatus(user, user.status)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-outline bg-white text-primary hover:bg-gray-50"
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(user)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-outline bg-white text-primary hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleOpenResetModal(user)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-outline bg-white text-warning hover:bg-gray-50"
                      >
                        Reset
                      </button>
                      {user.user_id !== currentUser?.user_id && (
                        <button
                          onClick={() => handleDeleteUser(user)}
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
              Showing Page {page} of {totalPages} ({total} Users)
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
          <div className="glass-panel bg-white p-8 w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-xl">
            <h3 className="text-xl font-bold mb-6 text-on-surface">Create New User</h3>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">User ID <span className="text-danger ml-0.5">*</span></label>
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9_.-]+$"
                  title="User ID can only contain letters, numbers, dots, dashes, and underscores."
                  value={createForm.user_id}
                  onChange={(e) => setCreateForm({ ...createForm, user_id: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Full Name <span className="text-danger ml-0.5">*</span></label>
                <input
                  type="text"
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Department</label>
                <input
                  type="text"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Temporary Password <span className="text-danger ml-0.5">*</span></label>
                <div className="flex gap-2 mb-1">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={createForm.temporary_password}
                    onChange={(e) => setCreateForm({ ...createForm, temporary_password: e.target.value })}
                    className="flex-1 p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="px-3 py-2 border border-outline rounded-md text-xs font-medium bg-gray-50 hover:bg-gray-100"
                  >
                    {showCreatePassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="px-3 py-2 bg-primary text-white rounded-md text-xs font-semibold hover:bg-primary-dark transition-colors"
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(
                        createForm.temporary_password,
                        () => showFeedback('success', 'Password copied to clipboard'),
                        () => showFeedback('error', 'Failed to copy password')
                      );
                    }}
                    className="px-3 py-2 border border-outline rounded-md text-xs font-medium bg-gray-50 hover:bg-gray-100"
                  >
                    Copy
                  </button>
                </div>
                <span className="text-xs text-on-surface-variant">
                  Minimum 8 characters, must include uppercase, lowercase, numbers, and special characters.
                </span>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-on-surface cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={createForm.force_change_pwd}
                    onChange={(e) => setCreateForm({ ...createForm, force_change_pwd: e.target.checked })}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Force Change Password on Next Login
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 mt-2 text-on-surface">Assign Roles</label>
                <div className="flex flex-col gap-1.5 border border-outline p-3 rounded-md max-h-[150px] overflow-y-auto">
                  {roles.filter(r => r.name !== 'super_admin' && r.name !== 'Super_Admin').map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={createForm.role_ids.includes(r.id)}
                        onChange={() => toggleRoleCheckbox(r.id, false)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {r.name}
                    </label>
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="glass-panel bg-white p-8 w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-xl">
            <h3 className="text-xl font-bold mb-6 text-on-surface">Edit User Details</h3>

            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">User ID <span className="text-danger ml-0.5">*</span></label>
                <input
                  type="text"
                  disabled
                  value={selectedUser?.user_id || ''}
                  className="w-full p-2 border border-outline rounded-md bg-gray-100 cursor-not-allowed text-on-surface-variant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Full Name <span className="text-danger ml-0.5">*</span></label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Department</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 mt-2 text-on-surface">Assign Roles</label>
                <div className="flex flex-col gap-1.5 border border-outline p-3 rounded-md max-h-[150px] overflow-y-auto">
                  {roles.filter(r => r.name !== 'super_admin' && r.name !== 'Super_Admin').map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={editForm.role_ids.includes(r.id)}
                        onChange={() => toggleRoleCheckbox(r.id, true)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      {r.name}
                    </label>
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="glass-panel bg-white p-8 w-full max-w-[450px] rounded-xl">
            <h3 className="text-xl font-bold mb-2 text-on-surface">Reset Password</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Enter a temporary password for user <strong className="text-on-surface">{selectedUser?.user_id}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface">Temporary Password <span className="text-danger ml-0.5">*</span></label>
                <div className="flex gap-2">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    className="flex-1 p-2 border border-outline rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="px-3 py-2 border border-outline rounded-md text-xs font-medium bg-gray-50 hover:bg-gray-100"
                  >
                    {showResetPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPasswordVal(generateComplexPassword(selectedUser?.user_id))}
                    className="px-3 py-2 bg-primary text-white rounded-md text-xs font-semibold hover:bg-primary-dark transition-colors"
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(
                        resetPasswordVal,
                        () => showFeedback('success', 'Password copied to clipboard'),
                        () => showFeedback('error', 'Failed to copy password')
                      );
                    }}
                    className="px-3 py-2 border border-primary text-primary bg-white rounded-md text-xs font-semibold hover:bg-primary/5 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2 text-sm text-on-surface-variant hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="glass-panel bg-white p-8 w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl">
            <h3 className="text-xl font-bold mb-2 text-on-surface">Bulk CSV Upload</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Select a CSV file containing user details. Columns must include: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">user_id</code>,
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">full_name</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">email</code>,
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">department</code>, and
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">temporary_password</code>.
            </p>

            <form onSubmit={handleBulkUpload} className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-outline p-8 text-center rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setBulkFile(e.target.files[0])}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-dark cursor-pointer"
                />
              </div>

              {bulkLogs && (
                <div className="bg-gray-50 border border-outline p-4 rounded-md mt-2">
                  <h4 className="text-sm font-semibold mb-2">Upload Log:</h4>
                  <p className="text-sm text-on-surface-variant">{bulkLogs.message}</p>
                  {bulkLogs.errors && bulkLogs.errors.length > 0 && (
                    <div className="mt-2 max-h-[150px] overflow-y-auto">
                      <p className="text-sm text-danger">Errors encountered:</p>
                      <ul className="pl-5 mt-1 text-xs text-danger list-disc">
                        {bulkLogs.errors.map((err, idx) => (
                          <li key={idx} className="mb-0.5">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="px-4 py-2 text-sm text-on-surface-variant hover:bg-gray-50 rounded-md"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-5 py-2 text-sm text-white bg-primary rounded-md transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                >
                  {isLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagementPage;