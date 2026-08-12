import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthenticatedLayout } from './components/AuthenticatedLayout';
import { PlanningDashboard } from './pages/PlanningDashboard';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { QuizList } from './pages/QuizList';
import { QuizNew } from './pages/QuizNew';
import { QuizBuilder } from './pages/QuizBuilder';
import { StudentDashboard } from './pages/StudentDashboard';
import { QuizTaker } from './pages/QuizTaker';
import { LiveQuizMonitor } from './pages/LiveQuizMonitor';
import { AdminDashboard } from './pages/AdminDashboard';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { QuizResults } from './pages/QuizResults';
import { AdminCertificatesPage } from './pages/AdminCertificatesPage';
import { StudentCertificatesPage } from './pages/StudentCertificatesPage';

function DashboardRedirect() {
  const { dbUser } = useAuth();
  
  if (dbUser?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <Navigate to="/student/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-ui-theme">
      <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardRedirect />} />
            <Route path="dashboard" element={<DashboardRedirect />} />
            <Route path="planning" element={<PlanningDashboard />} />
            
            {/* Quiz Management Routes (Admin/Admin) */}
            <Route path="admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="admin/certificates" element={<ProtectedRoute allowedRoles={['admin']}><AdminCertificatesPage /></ProtectedRoute>} />
            <Route path="quizzes" element={<ProtectedRoute allowedRoles={['admin']}><QuizList /></ProtectedRoute>} />
            <Route path="quizzes/new" element={<ProtectedRoute allowedRoles={['admin']}><QuizNew /></ProtectedRoute>} />
            <Route path="quizzes/:id/edit" element={<ProtectedRoute allowedRoles={['admin']}><QuizBuilder /></ProtectedRoute>} />
            <Route path="quizzes/:id/live" element={<ProtectedRoute allowedRoles={['admin']}><LiveQuizMonitor /></ProtectedRoute>} />
            <Route path="quizzes/:id/results" element={<ProtectedRoute allowedRoles={['admin']}><QuizResults /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsDashboard /></ProtectedRoute>} />

            {/* Student / Guest Experience Routes */}
            <Route path="student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="student/certificates" element={<ProtectedRoute allowedRoles={['student']}><StudentCertificatesPage /></ProtectedRoute>} />
            <Route path="student/quizzes/:id" element={<ProtectedRoute allowedRoles={['student']}><QuizTaker /></ProtectedRoute>} />

            {/* Shared Authenticated Routes */}
            <Route path="settings" element={<SettingsPage />} />

            {/* Catch-all fallback route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

