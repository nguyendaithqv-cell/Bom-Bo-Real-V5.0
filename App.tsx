import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SearchPage } from './pages/SearchPage';
import { DetailPage } from './pages/DetailPage';
import { AdminPage } from './pages/AdminPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ContactPage } from './pages/ContactPage';
import { InterestRatePage } from './pages/InterestRatePage';
import { AreaPage } from './pages/AreaPage';
import { ConsignmentPage } from './pages/ConsignmentPage';
import { Tracker } from './components/Tracker';

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
        <Route path="/utilities/interest-rate" element={<Layout><InterestRatePage /></Layout>} />
        <Route path="/utilities/area" element={<Layout><AreaPage /></Layout>} />
        <Route path="/consignment" element={<Layout><ConsignmentPage /></Layout>} />
      </Routes>
    </Router>
  );
};

export default App;