import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import DogsPage from './pages/DogsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dogs" element={<DogsPage />} />
          <Route path="map" element={<div className="p-6 text-center text-gray-500">Map view coming soon...</div>} />
          <Route path="analytics" element={<div className="p-6 text-center text-gray-500">Analytics coming soon...</div>} />
          <Route path="users" element={<div className="p-6 text-center text-gray-500">User management coming soon...</div>} />
          <Route path="settings" element={<div className="p-6 text-center text-gray-500">Settings coming soon...</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
