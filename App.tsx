import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'app_settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings(data);
        if (data.showPopup && !sessionStorage.getItem('popupShown')) {
          setShowPopup(true);
          sessionStorage.setItem('popupShown', 'true');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const isAdminPath = window.location.pathname === '/admin';

  if (settings?.maintenanceMode && !isAdminPath) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-serif font-bold text-gold-400 mb-6">HỆ THỐNG ĐANG BẢO TRÌ</h1>
          <p className="text-white text-lg mb-8">Chúng tôi đang nâng cấp hệ thống để phục vụ quý khách tốt hơn. Vui lòng quay lại sau.</p>
          <div className="w-16 h-1 bg-gold-500 mx-auto mb-8"></div>
          <p className="text-gray-400">Hotline hỗ trợ: <span className="text-white font-bold">{settings.hotline}</span></p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Tracker />
      
      {/* Marquee */}
      {settings?.showMarquee && settings?.marqueeText && (
        <div className="bg-gold-600 text-navy-900 py-2 overflow-hidden whitespace-nowrap fixed top-0 w-full z-[100] font-bold text-sm">
          <div className="animate-marquee inline-block">
            {settings.marqueeText} &nbsp;&nbsp;&nbsp;&nbsp; {settings.marqueeText} &nbsp;&nbsp;&nbsp;&nbsp; {settings.marqueeText}
          </div>
        </div>
      )}

      {/* Popup Notification */}
      <AnimatePresence>
        {showPopup && settings?.showPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative"
            >
              <button 
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-navy-900 transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="bg-navy-900 p-6 text-center">
                <h3 className="text-gold-400 font-serif text-2xl font-bold">THÔNG BÁO QUAN TRỌNG</h3>
              </div>
              <div className="p-8 text-center">
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                  {settings.popupContent}
                </p>
                <button 
                  onClick={() => setShowPopup(false)}
                  className="mt-8 bg-gold-500 text-navy-900 px-10 py-3 rounded-full font-bold hover:bg-navy-900 hover:text-white transition-all shadow-lg"
                >
                  ĐÃ HIỂU
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={settings?.showMarquee ? 'pt-8' : ''}>
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
      </div>
    </Router>
  );
};

export default App;