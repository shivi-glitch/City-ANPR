import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Shell from '../components/layout/Shell';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Analytics from '../pages/Analytics';
import Alerts from '../pages/Alerts';
import PlateSearch from '../pages/PlateSearch';
import RestrictedVehicles from '../pages/RestrictedVehicles';
import AIDetection from '../pages/AIDetection';
import Settings from '../pages/Settings';
import { useAuthStore } from '../store/authStore';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Shell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'alerts',
        element: <Alerts />,
      },
      {
        path: 'search',
        element: <PlateSearch />,
      },
      {
        path: 'restricted',
        element: <RestrictedVehicles />,
      },
      {
        path: 'ai-detection',
        element: <AIDetection />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
