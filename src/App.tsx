import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MenuSyncProvider } from './context/MenuSyncContext';
import { BackofficeAdminPage } from './pages/BackofficeAdminPage';
import { DisplayPlayerPage } from './pages/DisplayPlayerPage';

export const App: React.FC = () => {
  return (
    <MenuSyncProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={<BackofficeAdminPage />} />
          <Route path="/player" element={<DisplayPlayerPage />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </MenuSyncProvider>
  );
};

export default App;

