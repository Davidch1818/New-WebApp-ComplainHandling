import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(oldPassword, newPassword, confirmPassword);
      if (result.success) {
        setSuccess('Password changed successfully.');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        if (Array.isArray(result.error?.errors)) {
          setError(result.error.errors.join(' '));
        } else if (Array.isArray(result.error)) {
          setError(result.error.map(e => e.msg || 'validation error').join(', '));
        } else if (typeof result.error === 'object' && result.error !== null) {
          setError(JSON.stringify(result.error));
        } else {
          setError(result.error || 'Failed to change password.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center bg-surface ${user?.must_change_pwd ? 'min-h-screen' : 'min-h-[calc(100vh-64px)]'}`}>
      <div className="glass-panel p-10 w-full max-w-[450px] bg-white">
        <div className="text-center mb-8">
          <h2 className="text-on-surface text-2xl font-semibold">
            Change Password
          </h2>
          {user?.must_change_pwd && (
            <p className="text-warning text-sm mt-2 font-medium">
              You must change your password to continue.
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-danger rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 text-success rounded-md mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-on-surface">
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full p-3 border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-on-surface">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full p-3 border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-on-surface">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-3 border border-outline rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="text-xs text-on-surface-variant -mt-2">
            <p>Password must contain:</p>
            <ul className="list-disc pl-6 mt-1 space-y-1">
              <li>At least 8 characters</li>
              <li>Characters from 3 categories: Uppercase, Lowercase, Numbers, Special Characters</li>
              <li>No 3 consecutive identical characters</li>
              <li>Not be the same as your User ID</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`p-3 bg-primary text-white font-semibold rounded-md mt-2 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;