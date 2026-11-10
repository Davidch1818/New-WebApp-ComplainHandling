import React, { useState, useRef, useEffect } from 'react';
import { Settings, Bell, LogOut, KeyRound, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center w-full px-12 h-16 bg-surface border-b border-outline-variant sticky top-0 z-50">
      <div className="text-xl font-bold text-primary sm:hidden">
        BMAS
      </div>
      <div className="hidden sm:block"></div> {/* Spacer for desktop where sidebar is on the left */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          {/* <button className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-all">
                        <Bell size={20} />
                    </button> */}
          {/* <button
                        onClick={() => navigate('/change-password')}
                        className="text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-all"
                        title="Settings / Change Password"
                    >
                        <Settings size={20} />
                    </button> */}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:bg-surface-container-low p-1 pr-2 rounded-full transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="font-medium text-sm hidden md:block">{user?.full_name || user?.user_id || 'User'}</span>
              <ChevronDown size={14} className="text-on-surface-variant" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-outline-variant rounded-lg shadow-lg overflow-hidden py-1 z-50">
                <div className="px-4 py-3 border-b border-outline-variant">
                  <p className="text-sm font-bold text-on-surface truncate">{user?.full_name}</p>
                  <p className="text-xs text-on-surface-variant truncate mt-0.5">{user?.email || user?.user_id}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/change-password');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"
                >
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </button>
                <div className="border-t border-outline-variant my-1"></div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-error/10 transition-colors text-left"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;