import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/Layout';
import Dashboard from './features/Dashboard';
import Statistics from './features/Statistics';
import Expenses from './features/Expenses';
import Balance from './features/Balance';
import Settings from './features/Settings';
import CategoriesManager from './features/CategoriesManager';
import ProjectsManager from './features/ProjectsManager';
import TasksManager from './features/TasksManager';
import ProjectExpenses from './features/ProjectExpenses';
import UserContributions from './features/UserContributions';
import Login from './features/Login';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const { user, initialized } = useAuthStore();

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
                <Balance />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <Layout>
                <Statistics />
              </Layout>
            </ProtectedRoute>
          }
        />
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
            <ProtectedRoute>
              <Layout>
                <CategoriesManager />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/projects"
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectsManager />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <TasksManager />
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
