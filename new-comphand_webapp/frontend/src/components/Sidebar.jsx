import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity, CreditCard, RefreshCw, Database, DollarSign,
  FileSymlink, FileText, LayoutDashboard, Users, Shield, FileBarChart,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [isCompHandOpen, setIsCompHandOpen] = useState(false);
  const [isBiFastOpen, setIsBiFastOpen] = useState(false);
  const [isTelkomOpen, setIsTelkomOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith('/operations/comphand')) {
      setIsCompHandOpen(true);
    }
    if (location.pathname.startsWith('/reconcile/bifast')) {
      setIsBiFastOpen(true);
    }
    if (location.pathname.startsWith('/reconcile/telkom')) {
      setIsTelkomOpen(true);
    }
  }, [location.pathname]);

  const navlinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-transform scale-95 active:scale-100 ${isActive ?
      'bg-secondary-container text-on-secondary-container font-bold' : 'text-on-surface-variant hover:bg-surface-container-high'}`;

  return (
    <div className="flex flex-col h-screen py-6 px-4 gap-2 bg-surface-container-low border-r border-outline-variant w-64 fixed left-0 top-0 overflow-y-auto z-20">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold text-primary">Bank Internal</h1>
        <p className="text-on-surface-variant font-label-md text-sm opacity-70">Enterprise Management</p>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <NavLink to="/" className={navlinkClass} end>
            <LayoutDashboard size={18} />
            <span className="font-label-md text-sm">Dashboard</span>
          </NavLink>
        </div>

        <div className="flex flex-col gap-1">
          {/* <div className="px-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Reconciliation</div> */}

          {(hasPermission('reconcile.bifast') || hasPermission('reconcile.bifast.upload') || hasPermission('reconcile.bifast.download')) && (
            <div className="flex flex-col">
              <button
                onClick={() => setIsBiFastOpen(!isBiFastOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors hover:bg-surface-container-high text-on-surface-variant ${isBiFastOpen ? 'font-bold' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Activity size={18} />
                  <span className="font-label-md text-sm">BiFast</span>
                </div>
                {isBiFastOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isBiFastOpen && (
                <div className="flex flex-col gap-1 mt-1 pl-9">
                  {(hasPermission('reconcile.bifast') || hasPermission('reconcile.bifast.upload')) && (
                    <NavLink to="/reconcile/bifast" className={navlinkClass} end>
                      <span className="font-label-md text-sm">Bifast Upload</span>
                    </NavLink>
                  )}
                  {hasPermission('reconcile.bifast.download') && (
                    <NavLink to="/reconcile/bifast/download" className={navlinkClass}>
                      <span className="font-label-md text-sm">Bifast Download</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}

          {hasPermission('reconcile.prima_qris') && (
            <NavLink to="/reconcile/qris" className={navlinkClass}>
              <CreditCard size={18} />
              <span className="font-label-md text-sm">Prima QRIS</span>
            </NavLink>
          )}

          {hasPermission('reconcile.pac_jalin_pln') && (
            <NavLink to="/reconcile/pac" className={navlinkClass}>
              <RefreshCw size={18} />
              <span className="font-label-md text-sm">PAC JALIN PLN</span>
            </NavLink>
          )}

          {(hasPermission('reconcile.telkom') || hasPermission('reconcile.telkom.upload') || hasPermission('reconcile.telkom.download')) && (
            <div className="flex flex-col">
              <button
                onClick={() => setIsTelkomOpen(!isTelkomOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors hover:bg-surface-container-high text-on-surface-variant ${isTelkomOpen ? 'font-bold' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Database size={18} />
                  <span className="font-label-md text-sm">Telkom</span>
                </div>
                {isTelkomOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isTelkomOpen && (
                <div className="flex flex-col gap-1 mt-1 pl-9">
                  {(hasPermission('reconcile.telkom') || hasPermission('reconcile.telkom.upload')) && (
                    <NavLink to="/reconcile/telkom" className={navlinkClass} end>
                      <span className="font-label-md text-sm">Telkom Upload</span>
                    </NavLink>
                  )}

                  {hasPermission('reconcile.telkom.download') && (
                    <NavLink to="/reconcile/telkom/download" className={navlinkClass}>
                      <span className="font-label-md text-sm">Telkom Download</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {/* <div className="px-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Operations</div> */}

          {/* Complaint Handling Apps Submenu */}
          {(hasPermission('comphand.list') || hasPermission('comphand.manage') || hasPermission('comphand.report') || hasPermission('comphand.resolution_report')
            || hasPermission('comphand.submit') || hasPermission('comphand.queue') || hasPermission('comphand.master') || hasPermission('comphand.approval') ||
            hasPermission('comphand.approval_master') || hasPermission('comphand.checker_detail') || hasPermission('comphand.audit_log')) && (
              <div className="flex flex-col">
                <button
                  onClick={() => setIsCompHandOpen(!isCompHandOpen)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors hover:bg-surface-container-high text-on-surface-variant ${isCompHandOpen ? 'font-bold' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <FileSymlink size={18} />
                    <span className="font-label-md text-sm">Complaint Handling</span>
                  </div>
                  {isCompHandOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isCompHandOpen && (
                  <div className="flex flex-col gap-1 mt-1 pl-9">
                    {hasPermission('comphand.list') && (
                      <NavLink to="/operations/comphand/list-complain" className={navlinkClass}>
                        <span className="font-label-md text-sm">List Complain</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.manage') && (
                      <NavLink to="/operations/comphand/list-edit-del" className={navlinkClass}>
                        <span className="font-label-md text-sm">List Complain (Manage)</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.report') && (
                      <NavLink to="/operations/comphand/report" className={navlinkClass}>
                        <span className="font-label-md text-sm">Handling Report</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.resolution_report') && (
                      <NavLink to="/operations/comphand/resolution-report" className={navlinkClass}>
                        <span className="font-label-md text-sm">Resolution Report</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.submit') && (
                      <NavLink to="/operations/comphand/submit" className={navlinkClass}>
                        <span className="font-label-md text-sm">Submit Complaint</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.queue') && (
                      <NavLink to="/operations/comphand/queue" className={navlinkClass}>
                        <span className="font-label-md text-sm">Ticket Queue</span>
                      </NavLink>
                    )}
                    {/* Complaint Detail is a hidden route - accessed via row click in ListComplain */}
                    {hasPermission('comphand.master') && (
                      <NavLink to="/operations/comphand/master" className={navlinkClass}>
                        <span className="font-label-md text-sm">Master Detail</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.approval') && (
                      <NavLink to="/operations/comphand/approval" className={navlinkClass}>
                        <span className="font-label-md text-sm">Approval Queue</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.approval_master') && (
                      <NavLink to="/operations/comphand/approval-master-data" className={navlinkClass}>
                        <span className="font-label-md text-sm">Approval Master Data</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.checker_detail') && (
                      <NavLink to="/operations/comphand/checker-detail" className={navlinkClass}>
                        <span className="font-label-md text-sm">Checker Approval Detail</span>
                      </NavLink>
                    )}
                    {hasPermission('comphand.audit_log') && (
                      <NavLink to="/operations/comphand/activity-log" className={navlinkClass}>
                        <span className="font-label-md text-sm">Activity Log</span>
                      </NavLink>
                    )}
                  </div>
                )}
              </div>
            )}

          {hasPermission('lld.view') && (
            <NavLink to="/operations/lld" className={navlinkClass}>
              <FileText size={18} />
              <span className="font-label-md text-sm">LLD</span>
            </NavLink>
          )}

          {hasPermission('payroll.view') && (
            <NavLink to="/operations/payroll" className={navlinkClass}>
              <DollarSign size={18} />
              <span className="font-label-md text-sm">Payroll</span>
            </NavLink>
          )}
        </div>

        {(hasPermission('uam.users.view') || hasPermission('uam.roles.view') || hasPermission('uam.audit.view')) && (
          <div className="flex flex-col gap-1">
            {/* <div className="px-3 text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Administration</div> */}

            {hasPermission('uam.users.view') && (
              <NavLink to="/admin/users" className={navlinkClass}>
                <Users size={18} />
                <span className="font-label-md text-sm">User Management</span>
              </NavLink>
            )}

            {hasPermission('uam.roles.view') && (
              <NavLink to="/admin/roles" className={navlinkClass}>
                <Shield size={18} />
                <span className="font-label-md text-sm">Role Management</span>
              </NavLink>
            )}

            {hasPermission('uam.audit.view') && (
              <NavLink to="/admin/audit" className={navlinkClass}>
                <FileBarChart size={18} />
                <span className="font-label-md text-sm">Audit & Reports</span>
              </NavLink>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;