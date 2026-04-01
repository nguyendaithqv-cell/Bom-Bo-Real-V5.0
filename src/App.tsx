import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { SearchPage } from './pages/SearchPage';
import { DetailPage } from './pages/DetailPage';
import { AdminPage } from './pages/AdminPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ContactPage } from './pages/ContactPage';
import { Tracker } from './Tracker';

// Force commit again to trigger Vercel build
const App: React.FC = () => {
  return (
    <Router>
      <Tracker />
      <Routes>
        <Route path="/" element={<Layout><SearchPage /></Layout>} />
        <Route path="/plot/:id" element={<Layout><DetailPage /></Layout>} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/projects" element={<Layout><ProjectsPage /></Layout>} />
        <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
      </Routes>
    </Router>
  );
};

export default App;