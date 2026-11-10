-- ===================================================
-- Seed: Permission registry + Super Admin role
-- Admin user is created by manage.py (requires bcrypt hashing)
-- ===================================================

-- Insert all permissions (menu/function registry)
INSERT INTO uam.permissions (code, name, category) VALUES
    ('uam.audit.export',            'Export Audit Reports',             'Administration'),
    ('uam.audit.view',              'View Audit Reports',               'Administration'),
    ('uam.roles.manage',            'Manage Roles (Create/Edit/Delete)', 'Administration'),
    ('uam.roles.view',              'View Roles',                       'Administration'),
    ('uam.users.manage',            'Manage Users (Create/Edit/Delete)', 'Administration'),
    ('uam.users.view',              'View Users',                       'Administration'),
    ('comphand.approval',           'Approval Queue',                   'Operations'),
    ('comphand.approval_master',    'Approval Master Data',             'Operations'),
    ('comphand.audit_log',          'Activity Log',                     'Operations'),
    ('comphand.detail',             'Complaint Detail',                 'Operations'),
    ('comphand.list',               'List Complain',                    'Operations'),
    ('comphand.manage',             'List Complain (Manage)',           'Operations'),
    ('comphand.master',             'Master Detail Management',         'Operations'),
    ('comphand.queue',              'Ticket Queue',                     'Operations'),
    ('comphand.report',             'Complain Handling Report',         'Operations'),
    ('comphand.resolution_report',  'Resolution Report',                'Operations'),
    ('comphand.submit',             'Submit Complaint',                 'Operations'),
    ('comphand.view',               'Customer Complaints Handling',     'Operations'),
    ('lld.view',                    'LLD',                              'Operations'),
    ('payroll.view',                'Payroll',                          'Operations'),
    ('reconcile.bifast',            'BiFast Reconciliation',            'Reconciliation'),
    ('reconcile.bifast.download',   'BiFast Download',                  'Reconciliation'),
    ('reconcile.bifast.upload',     'BiFast Upload',                    'Reconciliation'),
    ('reconcile.pac_jalin_pln',     'PAC JALIN PLN Reconciliation',     'Reconciliation'),
    ('reconcile.prima_qris',        'Prima QRIS Reconciliation',        'Reconciliation'),
    ('reconcile.telkom',            'Telkom Reconciliation',            'Reconciliation'),
    ('reconcile.telkom.download',   'Telkom Download',                  'Reconciliation'),
    ('reconcile.telkom.upload',     'Telkom Upload',                    'Reconciliation')
ON CONFLICT (code) DO NOTHING;

-- Create super_admin role with all permissions
INSERT INTO uam.roles (name, description, created_by)
VALUES ('super_admin', 'Full system access - all menus and functions', 'system')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to super_admin role
INSERT INTO uam.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM uam.roles r CROSS JOIN uam.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;