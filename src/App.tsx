import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import AiAnalysis from './pages/AiAnalysis';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SplashScreen from './components/SplashScreen';
import NotFound from './pages/NotFound';

import './App.css';

function AppContent() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={
          <ProtectedRoute requireRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/" element={<ProtectedRoute requireRole="doctor"><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientDetail />} />
          <Route path="ai-analysis" element={<AiAnalysis />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <AnimatePresence mode="wait">
          {loading ? (
            <SplashScreen key="splash" />
          ) : (
            <AppContent key="app-content" />
          )}
        </AnimatePresence>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
