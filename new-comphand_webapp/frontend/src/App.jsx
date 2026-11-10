import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import HomePage from './pages/HomePage';
// import BiFastPage from './pages/BiFastPage';
// import BiFastDownloadPage from './pages/BiFastDownloadPage';
// import RekonTelkomUploadFile from './pages/RekonTelkomUploadFile';
// import RekonTelkomDownloadFile from './pages/RekonTelkomDownloadFile';
import PlaceholderPage from './pages/PlaceholderPage';
import UserManagementPage from './pages/UserManagementPage';
import RoleManagementPage from './pages/RoleManagementPage';
import AuditReportPage from './pages/AuditReportPage';
import SubmitComplaintPage from './pages/comphand/SubmitComplaintPage';
// import TicketQueuePage from './pages/comphand/TicketQueuePage';
import ComplaintDetailPage from './pages/comphand/ComplaintDetailPage';
import MasterDetailManagement from './pages/comphand/MasterDetailManagement';
import MasterReqTypeForm from './pages/comphand/MasterReqTypeForm';
import MasterReqIssues from './pages/comphand/MasterReqIssues';
import MasterReqCity from './pages/comphand/MasterReqCity';
import MasterReqBranch from './pages/comphand/MasterReqBranch';
import ApprovalQueuePage from './pages/comphand/ApprovalQueuePage';
import ApprovalMasterData from './pages/comphand/ApprovalMasterData';
import CheckerApprovalDetPage from './pages/comphand/CheckerApprovalDetPage';
import ListComplain from './pages/comphand/ListComplain';
import ListCompEditDel from './pages/comphand/ListCompEditDel';
import EditComplainPage from './pages/comphand/EditComplainPage';
import CompHandRpt from './pages/comphand/CompHandRpt';
import CompHandResRpt from './pages/comphand/CompHandResRpt';
import CompHandAuditLogPage from './pages/comphand/CompHandAuditLogPage';

// Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MasterReqCompTypeForm from './pages/comphand/MasterReqCompTypeForm';
import Master601Form from './pages/comphand/Master601Form';
import Master602Form from './pages/comphand/Master602Form';
import Master603Form from './pages/comphand/Master603Form';
import Master604Form from './pages/comphand/Master604Form';
import Master605Form from './pages/comphand/Master605Form';
import MasterReq601 from './pages/comphand/MasterReq601';
import MasterReq602 from './pages/comphand/MasterReq602';
import MasterReq603 from './pages/comphand/MasterReq603';
import MasterReq604 from './pages/comphand/MasterReq604';
import MasterReq605 from './pages/comphand/MasterReq605';

const AppLayout = ({ children }) => (
  <div className="flex min-h-screen bg-background text-on-surface">
    <Sidebar />
    <div className="ml-64 flex-1 flex flex-col min-h-screen relative">
      <Topbar />
      <div className="flex-1 w-full bg-surface-container-lowest">
        {children}
      </div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route path="/change-password" element={
            <ProtectedRoute>
              {/* If forced to change, we might not want the sidebar. But AppLayout is fine, or we render outside it. */}
              {/* Let's render outside AppLayout if it's a forced change, but for simplicity we can just render the page. */}
              <ChangePasswordPage />
            </ProtectedRoute>
          } />

          {/* App Layout Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <div className="page-container">
                  <HomePage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Reconciliation Modules */}
          {/* <Route path="/reconcile/bifast" element={
            <ProtectedRoute requiredPermission="reconcile.bifast.upload">
              <AppLayout>
                <div className="page-container">
                  <BiFastPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } /> */}
          <Route path="/reconcile/bifast" element={
            <ProtectedRoute requiredPermission="reconcile.bifast.upload">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="BiFast Upload" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* <Route path="/reconcile/bifast/download" element={
            <ProtectedRoute requiredPermission="reconcile.bifast.download">
              <AppLayout>
                <div className="page-container">
                  <BiFastDownloadPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } /> */}
          <Route path="/reconcile/bifast/download" element={
            <ProtectedRoute requiredPermission="reconcile.bifast.download">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="BiFast Download" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/reconcile/qris" element={
            <ProtectedRoute requiredPermission="reconcile.prima_qris">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="Prima QRIS Reconciliation" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/reconcile/pac" element={
            <ProtectedRoute requiredPermission="reconcile.pac_jalin_pln">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="PAC JALIN PLN Reconciliation" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* <Route path="/reconcile/telkom" element={
            <ProtectedRoute requiredPermission="reconcile.telkom.upload">
              <AppLayout>
                <div className="page-container">
                  <RekonTelkomUploadFile />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } /> */}
          <Route path="/reconcile/telkom" element={
            <ProtectedRoute requiredPermission="reconcile.telkom.upload">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="Telkom Upload" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* <Route path="/reconcile/telkom/download" element={
            <ProtectedRoute requiredPermission="reconcile.telkom.download">
              <AppLayout>
                <div className="page-container">
                  <RekonTelkomDownloadFile />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } /> */}
          <Route path="/reconcile/telkom/download" element={
            <ProtectedRoute requiredPermission="reconcile.telkom.download">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="Telkom Download" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/list-complain" element={
            <ProtectedRoute requiredPermission="comphand.list">
              <AppLayout>
                <div className="page-container">
                  <ListComplain />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/list-edit-del" element={
            <ProtectedRoute requiredPermission="comphand.manage">
              <AppLayout>
                <div className="page-container">
                  <ListCompEditDel />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/submit" element={
            <ProtectedRoute requiredPermission="comphand.submit">
              <AppLayout>
                <div className="page-container">
                  <SubmitComplaintPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/edit-complain/:request_id" element={
            <ProtectedRoute requiredPermission="comphand.manage">
              <AppLayout>
                <div className="page-container">
                  <EditComplainPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* <Route path="/operations/comphand/queue" element={
            <ProtectedRoute requiredPermission="comphand.queue">
              <AppLayout>
                <div className="page-container">
                  <TicketQueuePage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } /> */}
          <Route path="/operations/comphand/queue" element={
            <ProtectedRoute requiredPermission="comphand.queue">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="Ticket Queue" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/report" element={
            <ProtectedRoute requiredPermission="comphand.report">
              <AppLayout>
                <div className="page-container">
                  <CompHandRpt />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/resolution-report" element={
            <ProtectedRoute requiredPermission="comphand.resolution_report">
              <AppLayout>
                <div className="page-container">
                  <CompHandResRpt />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/activity-log" element={
            <ProtectedRoute requiredPermission="comphand.audit_log">
              <AppLayout>
                <div className="page-container">
                  <CompHandAuditLogPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Hidden route - only reachable via row click in ListComplain, not shown in sidebar menu */}
          <Route path="/operations/comphand/complaint-detail/:request_id" element={
            <ProtectedRoute requiredPermission="comphand.list">
              <AppLayout>
                <div className="page-container">
                  <ComplaintDetailPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterDetailManagement />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-type" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqTypeForm />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-type/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqTypeForm />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-complaint-type" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqCompTypeForm />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-complaint-type/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqCompTypeForm />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-issues" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqIssues />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-issues/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqIssues />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-city" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqCity />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-city/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqCity />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-branch" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqBranch />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-branch/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReqBranch />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Master 601 - 605 */}
          <Route path="/operations/comphand/master/601" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <Master601Form />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/602" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <Master602Form />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/603" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <Master603Form />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/604" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <Master604Form />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/605" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <Master605Form />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Master Req 601 - 605 */}
          <Route path="/operations/comphand/master/add-601" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq601 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-602" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq602 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-603" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq603 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-604" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq604 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/add-605" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq605 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-601/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq601 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-602/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq602 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-603/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq603 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-604/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq604 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/master/edit-605/:code" element={
            <ProtectedRoute requiredPermission="comphand.master">
              <AppLayout>
                <div className="page-container">
                  <MasterReq605 />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/approval" element={
            <ProtectedRoute requiredPermission="comphand.approval">
              <AppLayout>
                <div className="page-container">
                  <ApprovalQueuePage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/approval-master-data" element={
            <ProtectedRoute requiredPermission="comphand.approval_master">
              <AppLayout>
                <div className="page-container">
                  <ApprovalMasterData />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/comphand/checker-detail/:request_id" element={
            <ProtectedRoute requiredPermission="comphand.approval">
              <AppLayout>
                <div className="page-container">
                  <CheckerApprovalDetPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/lld" element={
            <ProtectedRoute requiredPermission="lld.view">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="LLD Reporting" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/operations/payroll" element={
            <ProtectedRoute requiredPermission="payroll.view">
              <AppLayout>
                <div className="page-container">
                  <PlaceholderPage title="Payroll Management" />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Administration Modules */}
          <Route path="/admin/users" element={
            <ProtectedRoute requiredPermission="uam.users.view">
              <AppLayout>
                <div className="page-container">
                  <UserManagementPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/roles" element={
            <ProtectedRoute requiredPermission="uam.roles.view">
              <AppLayout>
                <div className="page-container">
                  <RoleManagementPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/audit" element={
            <ProtectedRoute requiredPermission="uam.audit.view">
              <AppLayout>
                <div className="page-container">
                  <AuditReportPage />
                </div>
              </AppLayout>
            </ProtectedRoute>
          } />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;