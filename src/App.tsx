import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/Layout';
import Dashboard from './features/Dashboard';
import Finances from './features/Finances';
import Estimator from './features/Estimator';
import RentalSimulator from './features/RentalSimulator';
import Expenses from './features/Expenses';
import Settings from './features/Settings';
import CategoriesManager from './features/CategoriesManager';
import ProjectsManager from './features/ProjectsManager';
import TasksManager from './features/TasksManager';
import ProjectExpenses from './features/ProjectExpenses';
import UserContributions from './features/UserContributions';
import UserApprovalManager from './features/UserApprovalManager';
import BackupManager from './features/BackupManager';
import AuditLog from './features/AuditLog';
import Payables from './features/Payables';
import BrassBirmingham from './features/BrassBirmingham';
import BrassHistory from './features/BrassHistory';
import ConstructionManager from './features/ConstructionManager';
import SiteLog from './features/SiteLog';
import ActivityDetail from './features/ActivityDetail';
import PendingApproval from './features/PendingApproval';
import Login from './features/Login';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized, isPendingApproval } = useAuthStore();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario está pendiente de aprobación, redirigir a pantalla de espera
  if (isPendingApproval) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}

// Pantallas de administración: un colaborador no entra aunque tenga el enlace
function MemberRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'collaborator') return <Navigate to="/" replace />;
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const { user, initialized, isPendingApproval } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/pending-approval"
          element={
            // Solo mostrar si hay usuario Y está pendiente
            user && isPendingApproval ? (
              <PendingApproval />
            ) : user ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <Layout>
                <Expenses />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectExpenses />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/:userId/contributions"
          element={
            <ProtectedRoute>
              <Layout>
                <UserContributions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/balance"
          element={
            <ProtectedRoute>
              <Layout>
                <Finances />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Enlaces guardados de cuando Reportes era una pestaña aparte */}
        <Route path="/statistics" element={<Navigate to="/balance?tab=statistics" replace />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/categories"
          element={
            <MemberRoute>
              <Layout>
                <CategoriesManager />
              </Layout>
            </MemberRoute>
          }
        />
        <Route
          path="/settings/projects"
          element={
            <MemberRoute>
              <Layout>
                <ProjectsManager />
              </Layout>
            </MemberRoute>
          }
        />
        <Route
          path="/settings/tasks"
          element={
            <MemberRoute>
              <Layout>
                <TasksManager />
              </Layout>
            </MemberRoute>
          }
        />
        <Route
          path="/settings/access-control"
          element={
            <MemberRoute>
              <Layout>
                <UserApprovalManager />
              </Layout>
            </MemberRoute>
          }
        />
        <Route
          path="/settings/payables"
          element={
            <ProtectedRoute>
              <Layout>
                <Payables />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/history"
          element={
            <ProtectedRoute>
              <Layout>
                <AuditLog />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/backup"
          element={
            <MemberRoute>
              <Layout>
                <BackupManager />
              </Layout>
            </MemberRoute>
          }
        />
        <Route
          path="/settings/brass"
          element={
            <MemberRoute>
              <Layout>
                <BrassBirmingham />
              </Layout>
            </MemberRoute>
          }
        />
        <Route
          path="/settings/brass/history"
          element={
            <MemberRoute>
              <Layout>
                <BrassHistory />
              </Layout>
            </MemberRoute>
          }
        />
        <Route
          path="/activity/:activityId"
          element={
            <ProtectedRoute>
              <Layout>
                <ActivityDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finanzas/simulador"
          element={
            <ProtectedRoute>
              <Layout>
                <RentalSimulator />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/obra/estimador"
          element={
            <ProtectedRoute>
              <Layout>
                <Estimator />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/obra/bitacora"
          element={
            <ProtectedRoute>
              <Layout>
                <SiteLog />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/obra"
          element={
            <ProtectedRoute>
              <Layout>
                <ConstructionManager />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
