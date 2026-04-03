import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChatWidget } from './ChatWidget';
import { Home, Map, Newspaper, Settings, Phone, User, ChevronDown, Calculator, Ruler } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface LayoutProps {
  children: React.ReactNode;
}

const Navbar = ({ settings }: { settings: any }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUtilsOpen, setIsUtilsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navLinks = [
    { to: '/', label: 'Trang Chủ', icon: Home },
    { to: '/projects', label: 'SẢN PHẨM', icon: Map },
  ];

  if (settings?.enableConsignment) {
    navLinks.push({ to: '/consignment', label: 'Ký Gửi', icon: Newspaper });
  }

  navLinks.push({ to: '#', label: 'Tin Tức', icon: Newspaper });

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 no-print ${isVisible ? 'translate-y-0' : '-translate-y-full'} ${isHome ? 'bg-transparent text-white pt-6' : 'bg-navy-900 text-white shadow-lg py-4'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="text-2xl font-serif font-bold tracking-widest hover:text-gold-400 transition-colors">
          BOM BO REAL
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8 text-sm font-medium tracking-wide items-center">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-gold-400 transition-colors uppercase">{link.label}</Link>
          ))}
          
          {/* Utilities Dropdown */}
          <div className="relative group">
            <button className="hover:text-gold-400 transition-colors uppercase flex items-center gap-1">
              Tiện Ích
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <Link to="/utilities/interest-rate" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gold-500">Tính Lãi Suất</Link>
              <Link to="/utilities/area" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gold-500">Tính Diện Tích</Link>
            </div>
          </div>

          <Link to="/contact" className="hover:text-gold-400 transition-colors uppercase">Liên Hệ</Link>
          <Link to="/admin" className="hover:text-gold-400 transition-colors uppercase">Admin</Link>
        </div>

        {/* Mobile Hamburger */}
        <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-navy-900 border-t border-gray-800 text-white p-6 space-y-2 text-sm font-medium tracking-wide flex flex-col">
          {navLinks.map((link) => (
            <Link 
              key={link.to} 
              to={link.to} 
              className="flex items-center space-x-3 p-3 hover:bg-navy-800 rounded-xl transition-colors uppercase" 
              onClick={() => setIsMenuOpen(false)}
            >
              <link.icon className="w-5 h-5 text-gold-400" />
              <span>{link.label}</span>
            </Link>
          ))}
          
          <div className="w-full">
            <button 
              onClick={() => setIsUtilsOpen(!isUtilsOpen)}
              className="flex items-center justify-between p-3 hover:bg-navy-800 rounded-xl transition-colors uppercase w-full"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-gold-400" />
                <span>Tiện Ích</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isUtilsOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isUtilsOpen && (
              <div className="flex flex-col space-y-1 pl-12 py-2 bg-navy-800/30 rounded-xl mt-1">
                <Link 
                  to="/utilities/interest-rate" 
                  className="flex items-center space-x-3 py-3 hover:text-gold-400 transition-colors uppercase text-xs" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Tính Lãi Suất</span>
                </Link>
                <Link 
                  to="/utilities/area" 
                  className="flex items-center space-x-3 py-3 hover:text-gold-400 transition-colors uppercase text-xs" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Ruler className="w-4 h-4" />
                  <span>Tính Diện Tích</span>
                </Link>
              </div>
            )}
          </div>

          <Link 
            to="/contact" 
            className="flex items-center space-x-3 p-3 hover:bg-navy-800 rounded-xl transition-colors uppercase" 
            onClick={() => setIsMenuOpen(false)}
          >
            <Phone className="w-5 h-5 text-gold-400" />
            <span>Liên Hệ</span>
          </Link>
          <Link 
            to="/admin" 
            className="flex items-center space-x-3 p-3 hover:bg-navy-800 rounded-xl transition-colors uppercase" 
            onClick={() => setIsMenuOpen(false)}
          >
            <User className="w-5 h-5 text-gold-400" />
            <span>Admin</span>
          </Link>
        </div>
      )}
    </nav>
  );
};

const Footer = ({ settings }: { settings: any }) => (
  <footer className="bg-navy-900 text-gray-300 py-12 border-t border-gray-800 no-print">
    <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <h3 className="text-2xl font-serif text-white mb-4">BOM BO REAL</h3>
        <p className="text-sm leading-relaxed">
          Kiến tạo giá trị sống đẳng cấp. Nơi an cư lý tưởng và cơ hội đầu tư sinh lời vượt trội.
        </p>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Liên Hệ</h4>
        <p className="text-sm mb-2">Hotline: {settings?.hotline || '0969 320 229'}</p>
        <p className="text-sm mb-2">Email: info.bomboreal@gmail.com</p>
        <p className="text-sm">Địa chỉ: {settings?.officeAddress || 'Bom Bo Real, KĐT THÁI THÀNH BOM BO, Xã Bom Bo, Đồng Nai'}</p>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Kết Nối</h4>
        <div className="flex space-x-4">
          <a href={settings?.facebookLink || "#"} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold-400">Facebook</a>
          <a href={settings?.zaloLink || `https://zalo.me/${settings?.hotline?.replace(/\s/g, '') || '0969320229'}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold-400">Zalo</a>
          <a href="#" className="text-gray-400 hover:text-gold-400">Youtube</a>
        </div>
      </div>
    </div>
    <div className="text-center mt-12 text-xs text-gray-500">
      @ 2026 Bom Bo Real.
    </div>
  </footer>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'app_settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data());
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar settings={settings} />
      <main className={`flex-grow ${isHome ? '' : 'pt-20'}`}>
        {children}
      </main>
      <Footer settings={settings} />
      <div className="no-print">
        {settings?.enableAIChat !== false && <ChatWidget />}
      </div>
      
      {/* Floating Contact Buttons */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-2 no-print">
        <a 
          href={`tel:${settings?.hotline?.replace(/\s/g, '') || '0969320229'}`} 
          className="bg-green-600 text-white p-1.5 rounded-full shadow-lg hover:bg-green-700 transition-all animate-bounce"
          title="Gọi điện"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </a>
        <a 
          href={settings?.zaloLink || `https://zalo.me/${settings?.hotline?.replace(/\s/g, '') || '0969320229'}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-blue-500 text-white p-1.5 rounded-full shadow-lg hover:bg-blue-600 transition-all"
          title="Chat Zalo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 2.49.91 4.77 2.41 6.54L3 22l3.46-1.41c1.77 1.5 4.05 2.41 6.54 2.41 5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-2.08 0-3.99-.68-5.55-1.83l-.52-.38-2.19.9.89-2.08-.38-.52C4.68 15.99 4 14.08 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </a>
      </div>
    </div>
  );
};
