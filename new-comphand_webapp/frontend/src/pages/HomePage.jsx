import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, CreditCard, Database, RefreshCw, DollarSign,
  FileSymlink, FileText, Users, Shield, FileBarChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const allModules = [
    // Reconciliation
    { title: 'BiFast', path: '/reconcile/bifast', icon: Activity, color: '#3b82f6', perm: 'reconcile.bifast' },
    { title: 'Prima QRIS', path: '/reconcile/qris', icon: CreditCard, color: '#10b981', perm: 'reconcile.prima_qris' },
    { title: 'PAC JALIN PLN', path: '/reconcile/pac', icon: RefreshCw, color: '#ef4444', perm: 'reconcile.pac_jalin_pln' },
    { title: 'Telkom', path: '/reconcile/telkom', icon: Database, color: '#f59e0b', perm: 'reconcile.telkom' },
    // Operations
    {
      title: 'Complaint Handling Apps',
      icon: FileSymlink,
      color: '#ec4899',
      submenus: [
        { title: 'Submit Complaint', path: '/operations/comphand/submit', perm: 'comphand.submit' },
        { title: 'Ticket Queue', path: '/operations/comphand/queue', perm: 'comphand.queue' },
        { title: 'Complaint Detail', path: '/operations/comphand/detail', perm: 'comphand.detail' },
        { title: 'Master Detail', path: '/operations/comphand/master', perm: 'comphand.master' },
        { title: 'Approval Queue', path: '/operations/comphand/approval', perm: 'comphand.approval' }
      ]
    },
    { title: 'LLD Reporting', path: '/operations/lld', icon: FileText, color: '#8b5cf6', perm: 'lld.view' },
    { title: 'Payroll', path: '/operations/payroll', icon: DollarSign, color: '#06b6d4', perm: 'payroll.view' },
    // Administration
    { title: 'User Management', path: '/admin/users', icon: Users, color: '#0f172a', perm: 'uam.users.view' },
    { title: 'Role Management', path: '/admin/roles', icon: Shield, color: '#0f172a', perm: 'uam.roles.view' },
    { title: 'Audit Reports', path: '/admin/audit', icon: FileBarChart, color: '#0f172a', perm: 'uam.audit.view' },
  ];

  const permittedModules = allModules.filter(m => {
    if (m.submenus) {
      m.permittedSubmenus = m.submenus.filter(sub => hasPermission(sub.perm));
      return m.permittedSubmenus.length > 0;
    }
    return hasPermission(m.perm);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-bold text-on-surface mb-2">
        Welcome to Our Bank Internal
      </h1>
      <p className="text-on-surface-variant mb-8">
        Corporate portal for internal operations.
      </p>

      {/* Global Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="text-on-surface-variant text-sm font-medium mb-2">Active Services</div>
          <div className="text-3xl font-bold text-on-surface mb-1">{permittedModules.length}</div>
          <div className="text-primary font-medium text-sm">
            Available based on your roles
          </div>
        </div>
      </div>

      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {permittedModules.map((mod, idx) => {
          const Icon = mod.icon;

          if (mod.submenus) {
            return (
              <div key={idx} className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg flex items-center justify-center" style={{ color: mod.color, background: `${mod.color}15` }}>
                    <Icon size={20} />
                  </div>
                  <div className="font-semibold text-on-surface">{mod.title}</div>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {mod.permittedSubmenus.map((sub, sidx) => (
                    <div
                      key={sidx}
                      onClick={() => navigate(sub.path)}
                      className="text-sm cursor-pointer hover:text-primary transition-colors text-on-surface-variant flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-variant"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-outline-variant"></div>
                      {sub.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              onClick={() => navigate(mod.path)}
              className="bg-surface border border-outline-variant rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary transition-all shadow-sm"
            >
              <div className="p-3 rounded-lg flex items-center justify-center" style={{ color: mod.color, background: `${mod.color}15` }}>
                <Icon size={20} />
              </div>
              <div className="font-semibold text-on-surface">{mod.title}</div>
            </div>
          );
        })}
      </div> */}
    </div>
  );
};

export default HomePage;