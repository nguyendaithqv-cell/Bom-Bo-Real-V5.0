import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { fetchLandPlots } from '../services/dataService';
import { analyzeVisitorBehavior } from '../services/geminiService';
import { MessageSquare } from 'lucide-react';
import { LandPlot } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrors';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface Conversation {
  id: string;
  userId: string;
  createdAt: any;
  messages: Message[];
  message?: string;
  classification?: 'potential' | 'resale' | 'general';
  isRead?: boolean;
}

const classifyConversation = (messages: Message[]): 'potential' | 'resale' | 'general' => {
  const fullText = messages.map(m => m.text.toLowerCase()).join(' ');
  if (fullText.includes('bán lại') || fullText.includes('ký gửi')) return 'resale';
  if (fullText.includes('số điện thoại') || fullText.includes('sđt') || fullText.includes('liên hệ')) return 'potential';
  return 'general';
};

interface Offer {
  id: string;
  plotId: string;
  originalPrice: number;
  offeredPrice: string;
  name: string;
  phone: string;
  createdAt: any;
  isRead?: boolean;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: any;
  isRead?: boolean;
}

interface VisitorLog {
  id: string;
  visitorId: string;
  name?: string;
  phoneNumber?: string;
  lastVisited: any;
  source?: string;
  device?: string;
  viewedPlots: string[];
  pageHistory: { pageUrl: string, timestamp: string }[];
  aiAssessment?: string;
  offers?: { plotId: string, offeredPrice: string, originalPrice?: number, timestamp: string }[];
  status?: 'new' | 'contacting' | 'negotiating' | 'closed' | 'junk' | 'employee' | 'resale';
  notes?: string;
  crmNotes?: string;
  reminders?: { text: string, date: string, completed: boolean }[];
  potentialScore?: number;
  lastConsignment?: { propertyType: string, address: string, price: number, timestamp: string };
  isRead?: boolean;
}

interface AppSettings {
  showBombo: boolean;
  showOther: boolean;
  hotline: string;
  zaloLink?: string;
  facebookLink?: string;
  officeAddress?: string;
  marqueeText?: string;
  showMarquee?: boolean;
  showPopup?: boolean;
  popupContent?: string;
  enableAIChat: boolean;
  enableConsignment: boolean;
  enableOffers: boolean;
  heroImageUrl?: string;
  maintenanceMode: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  enableTelegramNotify?: boolean;
  // New settings
  seoTitle?: string;
  seoDescription?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  email?: string;
  youtubeLink?: string;
  footerCompanyName?: string;
  footerTaxCode?: string;
  slogan?: string;
  copyrightInfo?: string;
  footerLinks?: { label: string; url: string }[];
  maintenanceMessage?: string;
  maintenanceImageUrl?: string;
  imageCompressionQuality?: number;
  disableRightClick?: boolean;
  disableTextSelection?: boolean;
  enableWatermark?: boolean;
  watermarkText?: string;
  mainTitle?: string;
  subTitle?: string;
}

const Sidebar = ({ activeTab, setActiveTab, unreadCounts, onLogout }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void,
  unreadCounts: Record<string, number>,
  onLogout: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tabs = [
    { id: 'dashboard', name: 'Trang Chủ' },
    { id: 'products', name: 'Sản phẩm' },
    { id: 'chat', name: 'Chat Box AI', countKey: 'chat' },
    { id: 'customers', name: 'Danh Sách Khách Hàng', countKey: 'chat' },
    { id: 'visitors', name: 'Khách truy cập', countKey: 'visitors' },
    { id: 'consignment', name: 'Yêu cầu Ký gửi', countKey: 'consignment' },
    { id: 'analytics', name: 'Thống kê & Báo cáo' },
    { id: 'office', name: 'Quản lý văn phòng' },
    { id: 'potential', name: 'Khách Hàng Tiềm Năng', countKey: 'potential' },
    { id: 'resale', name: 'Khách Hàng Bán Lại', countKey: 'resale' },
    { id: 'offers', name: 'Danh Sách Trả Giá', countKey: 'offers' },
    { id: 'contacts', name: 'Tin Nhắn Liên Hệ', countKey: 'contacts' },
    { id: 'backup', name: 'Backup & Export' },
    { id: 'settings', name: 'Cài đặt hệ thống' },
  ];
  return (
    <div className="bg-navy-900 text-white p-4 flex-shrink-0">
      <div className="flex justify-between items-center md:hidden">
        <h2 className="font-bold">Admin Bom Bo Real</h2>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2">☰</button>
      </div>
      <div className={`${isOpen ? 'block' : 'hidden'} md:block mt-4 md:mt-0 space-y-2`}>
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => { setActiveTab(tab.id); setIsOpen(false); }} 
            className={`flex justify-between items-center w-full text-left p-3 rounded ${activeTab === tab.id ? 'bg-gold-500' : 'hover:bg-navy-800'}`}
          >
            <span>{tab.name}</span>
            {tab.countKey && unreadCounts[tab.countKey] > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCounts[tab.countKey]}
              </span>
            )}
          </button>
        ))}
        
        <div className="pt-6 mt-6 border-t border-navy-700">
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 w-full text-left p-3 rounded text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all"
          >
            <span>🚪 Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const AnalyticsView = ({ visitors, plots, offers }: { visitors: VisitorLog[], plots: LandPlot[], offers: Offer[] }) => {
  const [timeRange, setTimeRange] = useState<'7days' | 'month' | 'quarter' | 'year'>('7days');

  // 1. Traffic Data
  const getTrafficData = () => {
    let days = 7;
    let unit: 'day' | 'month' = 'day';
    if (timeRange === 'month') days = 30;
    if (timeRange === 'quarter') days = 90;
    if (timeRange === 'year') {
      days = 12;
      unit = 'month';
    }

    if (unit === 'day') {
      const lastNDays = [...Array(days)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      return lastNDays.map(date => ({
        label: date.split('-').slice(1).join('/'),
        views: visitors.filter(v => v.lastVisited?.toDate().toISOString().startsWith(date)).length
      }));
    } else {
      // Group by month
      const last12Months = [...Array(12)].map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return d.toISOString().slice(0, 7); // YYYY-MM
      }).reverse();

      return last12Months.map(month => ({
        label: month.split('-').reverse().join('/'),
        views: visitors.filter(v => v.lastVisited?.toDate().toISOString().startsWith(month)).length
      }));
    }
  };

  const trafficData = getTrafficData();

  // 2. Hot Plots (Top 5 viewed)
  const plotViews: Record<string, number> = {};
  visitors.forEach(v => {
    v.viewedPlots.forEach(id => {
      plotViews[id] = (plotViews[id] || 0) + 1;
    });
  });

  const hotPlotsData = Object.entries(plotViews)
    .map(([id, views]) => ({ id, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const isSold = (s: string) => {
    const lower = (s || '').toLowerCase();
    return (lower.includes('đã bán') || lower === 'sold') && !lower.includes('mở bán');
  };
  const isDeposited = (s: string) => {
    const lower = (s || '').toLowerCase();
    return lower.includes('cọc') || lower === 'deposited';
  };
  const isBooked = (s: string) => {
    const lower = (s || '').toLowerCase();
    return lower.includes('chỗ') || lower === 'booked';
  };
  const isAvailable = (s: string) => {
    const lower = (s || '').toLowerCase();
    return lower.includes('mở bán') || lower === 'available' || lower === '' || (!isSold(s) && !isDeposited(s) && !isBooked(s));
  };

  const totalVisitors = visitors.length;
  const withOffers = visitors.filter(v => v.offers && v.offers.length > 0).length;
  const conversionData = [
    { name: 'Có trả giá', value: withOffers },
    { name: 'Chỉ xem', value: totalVisitors - withOffers }
  ];

  const COLORS = ['#D4AF37', '#1A237E'];

  const exportToExcel = () => {
    const headers = ["ID", "Tên", "SĐT", "Thiết bị", "Lần cuối", "Số lô đã xem", "Số lần trả giá", "Đánh giá AI"];
    const rows = visitors.map(v => [
      v.id,
      v.name || "Ẩn danh",
      v.phoneNumber || "N/A",
      v.device,
      v.lastVisited?.toDate().toISOString(),
      v.viewedPlots.length,
      v.offers?.length || 0,
      v.aiAssessment?.replace(/,/g, ';').replace(/\n/g, ' ') || ""
    ]);

    const csvContent = "\uFEFF" + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `khach_hang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-navy-900 font-serif">Thống kê & Báo cáo</h2>
        <button 
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-green-700 transition-all"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Xuất file Excel (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-navy-900">Xu hướng truy cập</h3>
            <div className="flex space-x-2">
              {(['7days', 'month', 'quarter', 'year'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`text-[10px] px-2 py-1 rounded font-bold transition-all ${
                    timeRange === range ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {range === '7days' ? '7 Ngày' : range === 'month' ? 'Tháng' : range === 'quarter' ? 'Quý' : 'Năm'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#D4AF37" strokeWidth={3} dot={{ r: timeRange === '7days' ? 6 : 2, fill: '#D4AF37' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-navy-900 mb-6">Top 5 lô đất được xem nhiều nhất</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hotPlotsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="id" type="category" width={60} />
                <Tooltip />
                <Bar dataKey="views" fill="#1A237E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-navy-900 mb-6">Tỷ lệ chuyển đổi (Trả giá)</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conversionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {conversionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/2 space-y-2">
              {conversionData.map((entry, index) => (
                <div key={index} className="flex items-center text-sm">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-gray-600">{entry.name}:</span>
                  <span className="ml-auto font-bold">{entry.value} ({totalVisitors > 0 ? ((entry.value / totalVisitors) * 100).toFixed(1) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-navy-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-center">
            <p className="text-gold-400 text-sm font-bold uppercase tracking-wider mb-1">Tổng lượt xem trang</p>
            <p className="text-4xl font-bold">{visitors.reduce((acc, v) => acc + v.pageHistory.length, 0)}</p>
          </div>
          <div className="bg-gold-500 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-center">
            <p className="text-navy-900 text-sm font-bold uppercase tracking-wider mb-1">Khách tiềm năng</p>
            <p className="text-4xl font-bold">{visitors.filter(v => (v.potentialScore || 0) > 60).length}</p>
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center col-span-2">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Lô đất trống</p>
            <p className="text-3xl font-bold text-navy-900">{plots.filter(p => isAvailable(p.status)).length} / {plots.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const OfficeView = ({ 
  visitors, 
  localSettings, 
  updateLocalSetting, 
  handleSaveSettings, 
  isSaving 
}: { 
  visitors: VisitorLog[], 
  localSettings: AppSettings | null,
  updateLocalSetting: (updates: Partial<AppSettings>) => void,
  handleSaveSettings: () => Promise<void>,
  isSaving: boolean
}) => {
  const staff = visitors.filter(v => v.status === 'employee');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 font-serif">Quản lý nhân viên văn phòng</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy-50 text-navy-900 uppercase text-xs font-bold tracking-wider">
                <th className="p-4 border-b">Nhân viên</th>
                <th className="p-4 border-b">Số điện thoại</th>
                <th className="p-4 border-b text-center">Lượt truy cập</th>
                <th className="p-4 border-b text-center">Lô đã xem</th>
                <th className="p-4 border-b">Danh sách lô</th>
                <th className="p-4 border-b">Truy cập cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.length > 0 ? staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-700 font-bold text-xs">
                        {(s.name || 'N')[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-navy-900">{s.name || 'Chưa đặt tên'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{s.phoneNumber || 'N/A'}</td>
                  <td className="p-4 text-center font-medium text-navy-600">{s.pageHistory.length}</td>
                  <td className="p-4 text-center font-medium text-gold-600">{s.viewedPlots.length}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {s.viewedPlots.slice(0, 3).map((p, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{p}</span>
                      ))}
                      {s.viewedPlots.length > 3 && <span className="text-[10px] text-gray-400">+{s.viewedPlots.length - 3}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    {formatDate(s.lastVisited)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 italic">Chưa có nhân viên nào trong danh sách. Hãy gán trạng thái "Nhân Viên" cho khách hàng trong mục CRM.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-navy-900 mb-6 font-serif">Thông tin văn phòng</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tên văn phòng</label>
            <input 
              type="text" 
              value={localSettings?.footerCompanyName || ''} 
              onChange={(e) => updateLocalSetting({ footerCompanyName: e.target.value })}
              className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-gold-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Hotline</label>
            <input 
              type="text" 
              value={localSettings?.hotline || ''} 
              onChange={(e) => updateLocalSetting({ hotline: e.target.value })}
              className="w-full border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-gold-500 outline-none" 
            />
          </div>
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`bg-navy-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-navy-800 transition-all flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BackupExportView = ({ visitors, conversations, offers }: { visitors: VisitorLog[], conversations: Conversation[], offers: Offer[] }) => {
  const exportToCSV = (data: any[], headers: string[], filename: string) => {
    const csvContent = "\uFEFF" + headers.join(",") + "\n"
      + data.map(row => row.map((r: any) => `"${String(r).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-navy-900 font-serif">Backup & Export</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => exportToCSV(visitors.map(v => [v.id, v.name || 'Ẩn danh', v.phoneNumber || 'N/A']), ["ID", "Tên", "SĐT"], "khach_hang")} className="bg-navy-900 text-white p-6 rounded-xl font-bold hover:bg-navy-800">Xuất Khách hàng (CSV)</button>
        <button onClick={() => exportToCSV(conversations.map(c => [c.id, c.userId, c.messages.length]), ["ID", "User ID", "Số tin nhắn"], "chat")} className="bg-navy-900 text-white p-6 rounded-xl font-bold hover:bg-navy-800">Xuất Chat (CSV)</button>
        <button onClick={() => exportToCSV(offers.map(o => [o.id, o.plotId, o.offeredPrice]), ["ID", "Plot ID", "Giá trả"], "tra_gia")} className="bg-navy-900 text-white p-6 rounded-xl font-bold hover:bg-navy-800">Xuất Trả giá (CSV)</button>
      </div>
    </div>
  );
};

export interface Consignment {
  id: string;
  fullName: string;
  phoneNumber: string;
  zalo?: string;
  propertyType: string;
  address: string;
  area: string;
  dimensions?: string;
  price: string;
  legalStatus: string;
  direction: string;
  description: string;
  images: string[];
  status: 'pending' | 'reviewed' | 'contacted' | 'completed' | 'rejected';
  createdAt: any;
  isRead?: boolean;
}

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  if (typeof date.toDate === 'function') {
    return date.toDate().toLocaleString();
  }
  if (typeof date === 'string') {
    return new Date(date).toLocaleString();
  }
  if (date instanceof Date) {
    return date.toLocaleString();
  }
  if (date.seconds !== undefined) {
    return new Date(date.seconds * 1000).toLocaleString();
  }
  return 'Invalid Date';
};

export const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [plots, setPlots] = useState<LandPlot[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    showBombo: true, 
    showOther: true,
    hotline: '0969320229',
    enableAIChat: true,
    enableConsignment: true,
    enableOffers: true,
    maintenanceMode: false
  });
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorLog | null>(null);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistoryCurrentPage, setPageHistoryCurrentPage] = useState(1);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const visitorsPerPage = 20;

  const [deleteConfirm, setDeleteConfirm] = useState<{ collection: string, id: string } | null>(null);

  const handleLogin = () => {
    if (password === '0969320229') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      alert('Mật khẩu không đúng!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
  };

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      setDeleteConfirm(null);
      setSelectedConv(null);
      setSelectedVisitor(null);
      setSelectedConsignment(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAnalyzeVisitor = async (visitor: VisitorLog) => {
    if (loadingAssessment) return;
    setLoadingAssessment(true);
    try {
      const jsonStr = await analyzeVisitorBehavior(visitor, plots);
      let assessmentData: any = {};
      try {
        assessmentData = JSON.parse(jsonStr);
      } catch (e) {
        assessmentData = { assessment: jsonStr };
      }

      const formatAIValue = (val: any) => {
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) {
          return val.map(item => {
            if (typeof item === 'object' && item !== null) {
              return Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
            return String(item);
          }).join('\n');
        }
        if (typeof val === 'object' && val !== null) {
          return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(', ');
        }
        return String(val || '');
      };

      const updates = {
        aiAssessment: formatAIValue(assessmentData.assessment),
        potentialScore: assessmentData.score || 0,
        aiSmartMatching: formatAIValue(assessmentData.smartMatching),
        aiMessageTemplate: formatAIValue(assessmentData.messageTemplate),
        aiInterestLevel: assessmentData.interestLevel || 'Trung bình'
      };

      await updateDoc(doc(db, 'visitor_logs', visitor.id), updates);
      setSelectedVisitor({ ...visitor, ...updates });
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Lỗi khi phân tích hành vi khách hàng. Vui lòng kiểm tra API Key.');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const handleUpdateVisitorCRM = async (visitorId: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, 'visitor_logs', visitorId), { [field]: value });
      if (selectedVisitor && selectedVisitor.id === visitorId) {
        setSelectedVisitor({ ...selectedVisitor, [field]: value });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `visitor_logs/${visitorId}`);
    }
  };

  const handleUpdateConsignmentStatus = async (consignmentId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'consignments', consignmentId), { status });
      if (selectedConsignment && selectedConsignment.id === consignmentId) {
        setSelectedConsignment({ ...selectedConsignment, status: status as any });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `consignments/${consignmentId}`);
    }
  };

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'general'), localSettings, { merge: true });
      alert('Đã lưu cấu hình thành công!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'app_settings/general');
      alert('Lỗi khi lưu cấu hình!');
    } finally {
      setIsSaving(false);
    }
  };

  const updateLocalSetting = (newSettings: Partial<AppSettings>) => {
    setLocalSettings(prev => prev ? { ...prev, ...newSettings } : null);
  };

  const markAsRead = async (collectionName: string, id: string) => {
    try {
      await updateDoc(doc(db, collectionName, id), { isRead: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const q = query(collection(db, 'conversations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        const messages = d.messages || [];
        return { 
          id: doc.id, 
          ...d, 
          messages,
          classification: classifyConversation(messages) 
        };
      }) as Conversation[];
      setConversations(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    const qOffers = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
    const unsubscribeOffers = onSnapshot(qOffers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Offer[];
      setOffers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'offers');
    });

    const qContacts = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    const unsubscribeContacts = onSnapshot(qContacts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Contact[];
      setContacts(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });

    const qVisitors = query(collection(db, 'visitor_logs'), orderBy('lastVisited', 'desc'));
    const unsubscribeVisitors = onSnapshot(qVisitors, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VisitorLog[];
      setVisitors(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'visitor_logs');
    });

    const qConsignments = query(collection(db, 'consignments'), orderBy('createdAt', 'desc'));
    const unsubscribeConsignments = onSnapshot(qConsignments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Consignment[];
      setConsignments(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'consignments');
    });

    const loadPlots = async () => {
      const data = await fetchLandPlots();
      setPlots(data);
    };
    loadPlots();

    const unsubscribeSettings = onSnapshot(doc(db, 'app_settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const settings: AppSettings = {
          showBombo: data.showBombo ?? true,
          showOther: data.showOther ?? true,
          hotline: data.hotline ?? '0969320229',
          zaloLink: data.zaloLink ?? '',
          facebookLink: data.facebookLink ?? '',
          officeAddress: data.officeAddress ?? '',
          marqueeText: data.marqueeText ?? '',
          showMarquee: data.showMarquee ?? false,
          showPopup: data.showPopup ?? false,
          popupContent: data.popupContent ?? '',
          enableAIChat: data.enableAIChat ?? true,
          enableConsignment: data.enableConsignment ?? true,
          enableOffers: data.enableOffers ?? true,
          heroImageUrl: data.heroImageUrl ?? '',
          maintenanceMode: data.maintenanceMode ?? false,
          telegramBotToken: data.telegramBotToken ?? '',
          telegramChatId: data.telegramChatId ?? '',
          enableTelegramNotify: data.enableTelegramNotify ?? false,
          imageCompressionQuality: data.imageCompressionQuality ?? 80,
          disableRightClick: data.disableRightClick ?? false,
          disableTextSelection: data.disableTextSelection ?? false,
          enableWatermark: data.enableWatermark ?? false,
          watermarkText: data.watermarkText ?? '',
          seoTitle: data.seoTitle ?? '',
          seoDescription: data.seoDescription ?? '',
          googleAnalyticsId: data.googleAnalyticsId ?? '',
          facebookPixelId: data.facebookPixelId ?? '',
          email: data.email ?? '',
          youtubeLink: data.youtubeLink ?? '',
          footerCompanyName: data.footerCompanyName ?? '',
          footerTaxCode: data.footerTaxCode ?? '',
          slogan: data.slogan ?? '',
          copyrightInfo: data.copyrightInfo ?? ''
        };
        setAppSettings(settings);
        setLocalSettings(prev => prev || settings);
      } else {
        setDoc(doc(db, 'app_settings', 'general'), { 
          showBombo: true, 
          showOther: true,
          hotline: '0969320229',
          enableAIChat: true,
          enableConsignment: true,
          enableOffers: true,
          maintenanceMode: false,
          imageCompressionQuality: 80,
          disableRightClick: false,
          disableTextSelection: false,
          enableWatermark: false,
          watermarkText: ''
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'app_settings/general'));

    return () => { 
      unsubscribe(); 
      unsubscribeOffers(); 
      unsubscribeContacts(); 
      unsubscribeVisitors(); 
      unsubscribeConsignments(); 
      unsubscribeSettings();
    };
  }, [isAuthenticated]);

  // Real-time notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    if (offers.length > 0 || conversations.length > 0) {
      const lastOffer = offers[0];
      const lastConv = conversations[0];
      
      const lastNotifiedOffer = localStorage.getItem('lastNotifiedOffer');
      const lastNotifiedConv = localStorage.getItem('lastNotifiedConv');

      if (lastOffer && lastOffer.id !== lastNotifiedOffer) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        localStorage.setItem('lastNotifiedOffer', lastOffer.id);
      }
      if (lastConv && lastConv.id !== lastNotifiedConv) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        localStorage.setItem('lastNotifiedConv', lastConv.id);
      }
    }
  }, [offers, conversations, isAuthenticated]);

  useEffect(() => {
    if (selectedConv) {
      const updatedConv = conversations.find(c => c.id === selectedConv.id);
      if (updatedConv) {
        setSelectedConv(updatedConv);
      }
    }
  }, [conversations, selectedConv]);

  useEffect(() => {
    if (selectedVisitor) {
      const updatedVisitor = visitors.find(v => v.id === selectedVisitor.id);
      if (updatedVisitor) {
        setSelectedVisitor(updatedVisitor);
      }
    }
  }, [visitors, selectedVisitor]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedConv(null);
    setSelectedVisitor(null);
    setSelectedConsignment(null);
  }, [activeTab]);

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[100vh] bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-navy-900">Admin Bom Bo Real</h1>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mật khẩu hệ thống</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Nhập mật khẩu" 
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gold-500 outline-none" 
              />
            </div>
            
            <button 
              onClick={handleLogin} 
              className="w-full bg-navy-900 text-white px-4 py-3 rounded-lg font-bold hover:bg-navy-800 transition-all"
            >
              Vào bảng điều khiển
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'potential') return conv.classification === 'potential';
    if (activeTab === 'resale') return conv.classification === 'resale';
    return true;
  });

  const unreadCounts = {
    chat: conversations.filter(c => !c.isRead).length,
    potential: conversations.filter(c => c.classification === 'potential' && !c.isRead).length,
    resale: conversations.filter(c => c.classification === 'resale' && !c.isRead).length,
    offers: offers.filter(o => !o.isRead).length,
    contacts: contacts.filter(c => !c.isRead).length,
    visitors: visitors.filter(v => !v.isRead).length,
    consignment: consignments.filter(c => !c.isRead).length,
  };

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / visitorsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div className="p-4 flex justify-between items-center border-t bg-gray-50">
        <button 
          disabled={currentPage === 1} 
          onClick={() => setCurrentPage(currentPage - 1)} 
          className="px-3 py-1 bg-white border rounded disabled:opacity-50 hover:bg-gray-100 transition-colors"
        >
          Trước
        </button>
        <span className="text-sm text-gray-600 font-medium">Trang {currentPage} / {totalPages}</span>
        <button 
          disabled={currentPage === totalPages} 
          onClick={() => setCurrentPage(currentPage + 1)} 
          className="px-3 py-1 bg-white border rounded disabled:opacity-50 hover:bg-gray-100 transition-colors"
        >
          Sau
        </button>
      </div>
    );
  };

  const renderContent = () => {
    const startIndex = (currentPage - 1) * visitorsPerPage;
    const endIndex = startIndex + visitorsPerPage;

    switch (activeTab) {
      case 'dashboard':
        const dashboardStats = [
          { label: 'Tổng cuộc chat', value: conversations.length, color: 'bg-navy-900', icon: '💬' },
          { label: 'KH Tiềm năng', value: conversations.filter(c => c.classification === 'potential').length, color: 'bg-green-600', icon: '⭐' },
          { label: 'KH Bán lại', value: conversations.filter(c => c.classification === 'resale').length, color: 'bg-orange-600', icon: '🔄' },
          { label: 'Tin nhắn liên hệ', value: contacts.length, color: 'bg-blue-600', icon: '📧' },
          { label: 'Khách truy cập', value: visitors.length, color: 'bg-purple-600', icon: '👥' },
          { label: 'Yêu cầu ký gửi', value: consignments.length, color: 'bg-red-600', icon: '📝' },
          { label: 'Tổng sản phẩm', value: plots.length, color: 'bg-gold-600', icon: '🏠' },
        ];

        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardStats.map((stat, idx) => (
                <div key={idx} className={`${stat.color} text-white p-8 rounded-xl shadow-xl transform hover:scale-105 transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden group`}>
                  <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">
                    {stat.icon}
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-2">{stat.label}</p>
                    <p className="text-4xl font-bold">{stat.value}</p>
                  </div>
                  <div className="relative z-10 mt-auto">
                    <div className="h-1 w-12 bg-white/30 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-lg font-bold text-navy-900 flex items-center">
                    <span className="mr-2">💰</span> Thống kê trả giá
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center p-4 bg-navy-50 rounded-xl border border-navy-100">
                    <span className="text-navy-700 font-medium">Tổng số lượt trả giá</span>
                    <span className="text-2xl font-bold text-navy-900">{offers.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gold-50 rounded-xl border border-gold-100">
                    <span className="text-gold-700 font-medium">Tổng giá trị trả giá</span>
                    <span className="text-xl font-bold text-gold-800">
                      {new Intl.NumberFormat('vi-VN').format(offers.reduce((sum, o) => sum + Number(o.offeredPrice), 0))} VNĐ
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-lg font-bold text-navy-900 flex items-center">
                    <span className="mr-2">📈</span> Hoạt động mới nhất
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {visitors.slice(0, 6).map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 font-bold text-xs">
                            {(v.name || 'K')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{v.name || 'Khách ẩn danh'}</p>
                            <p className="text-xs text-gray-500">{v.device} • {v.source}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-navy-500 bg-navy-50 px-2 py-1 rounded">
                          {v.lastVisited?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'products':
        const isSold = (s: string) => {
          const lower = (s || '').toLowerCase();
          return (lower.includes('đã bán') || lower === 'sold') && !lower.includes('mở bán');
        };
        const isDeposited = (s: string) => {
          const lower = (s || '').toLowerCase();
          return lower.includes('cọc') || lower === 'deposited';
        };
        const isBooked = (s: string) => {
          const lower = (s || '').toLowerCase();
          return lower.includes('chỗ') || lower === 'booked';
        };

        const soldCount = plots.filter(p => isSold(p.status)).length;
        const depositedCount = plots.filter(p => isDeposited(p.status)).length;
        const bookedCount = plots.filter(p => isBooked(p.status)).length;
        const totalValue = plots.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
        const totalValueBillions = totalValue / 1000000000;

        const datNenCount = plots.filter(p => p.loai?.toLowerCase() === 'đất nền').length;
        const nhaPhoCount = plots.filter(p => p.loai?.toLowerCase() === 'nhà phố').length;
        const datRayCount = plots.filter(p => p.loai?.toLowerCase() === 'đất rẫy').length;
        const khacCount = plots.filter(p => p.loai?.toLowerCase() === 'khác' || (p.loai && !['đất nền', 'nhà phố', 'đất rẫy'].includes(p.loai.toLowerCase()))).length;

        const stats = [
          { label: 'Tổng số sản phẩm', value: plots.length, color: 'bg-navy-900', icon: '🏠' },
          { label: 'Đã bán', value: soldCount, color: 'bg-red-600', icon: '✅' },
          { label: 'Đã cọc', value: depositedCount, color: 'bg-gold-600', icon: '💰' },
          { label: 'Đã đặt chỗ', value: bookedCount, color: 'bg-blue-600', icon: '📝' },
          { label: 'Tổng giá trị (Tỷ)', value: totalValueBillions.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Tỷ', color: 'bg-green-700', icon: '💎' },
        ];

        const typeStats = [
          { label: 'Đất nền', value: datNenCount, color: 'bg-indigo-500', icon: '🌱' },
          { label: 'Nhà phố', value: nhaPhoCount, color: 'bg-teal-500', icon: '🏢' },
          { label: 'Đất rẫy', value: datRayCount, color: 'bg-amber-600', icon: '🚜' },
          { label: 'Khác', value: khacCount, color: 'bg-slate-500', icon: '📦' },
        ];

        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {stats.map((stat, idx) => (
                <div key={idx} className={`${stat.color} text-white p-8 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 flex flex-col justify-between h-48 relative overflow-hidden group`}>
                  <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity">
                    {stat.icon}
                  </div>
                  <div className="relative z-10">
                    <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className="relative z-10 mt-auto">
                    <div className="h-1 w-12 bg-white/30 rounded"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {typeStats.map((stat, idx) => (
                <div key={idx} className={`${stat.color} text-white p-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 flex flex-col justify-between h-28 relative overflow-hidden group`}>
                  <div className="absolute -right-2 -top-2 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">
                    {stat.icon}
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{stat.label}</p>
                    <p className="text-2xl font-black">{stat.value}</p>
                  </div>
                  <div className="relative z-10 mt-auto">
                    <div className="h-0.5 w-8 bg-white/30 rounded"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-navy-900">Danh sách sản phẩm chi tiết</h3>
                <span className="text-sm text-gray-500">Dữ liệu từ Google Sheets</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-navy-50 text-navy-900 uppercase text-xs font-bold tracking-wider">
                      <th className="p-4 border-b">Mã lô</th>
                      <th className="p-4 border-b">Diện tích</th>
                      <th className="p-4 border-b">Giá (VND)</th>
                      <th className="p-4 border-b">Trạng thái</th>
                      <th className="p-4 border-b">Dự án</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {plots.slice(0, 10).map((plot) => (
                      <tr key={plot.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-navy-900">{plot.id}</td>
                        <td className="p-4 text-gray-600">{plot.area} m²</td>
                        <td className="p-4 text-gold-600 font-medium">{new Intl.NumberFormat('vi-VN').format(plot.totalPrice)} VNĐ</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isSold(plot.status) ? 'bg-red-100 text-red-700' :
                            isDeposited(plot.status) ? 'bg-gold-100 text-gold-700' :
                            isBooked(plot.status) ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {plot.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500 text-sm">{plot.duan || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {plots.length > 10 && (
                <div className="p-4 text-center border-t border-gray-100">
                  <p className="text-sm text-gray-500 italic">Và {plots.length - 10} sản phẩm khác...</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'chat':
      case 'customers':
      case 'potential':
      case 'resale':
        const currentConvs = filteredConversations.slice(startIndex, endIndex);
        return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] bg-white rounded-lg shadow overflow-hidden">
            <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r flex-col`}>
              <div className="flex-grow overflow-y-auto">
                {currentConvs.map(conv => (
                  <div 
                    key={conv.id} 
                    onClick={() => {
                      setSelectedConv(conv);
                      if (!conv.isRead) markAsRead('conversations', conv.id);
                    }} 
                    className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedConv?.id === conv.id ? 'bg-gray-200' : ''} ${!conv.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`truncate ${!conv.isRead ? 'font-black text-navy-900' : 'font-bold'}`}>
                        Khách hàng {conv.id.slice(0, 5)}
                      </p>
                      {!conv.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(conv.createdAt)}</p>
                    <span className={`text-xs px-2 py-1 rounded ${conv.classification === 'resale' ? 'bg-red-100 text-red-800' : conv.classification === 'potential' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {conv.classification === 'resale' ? 'Bán lại' : conv.classification === 'potential' ? 'Tiềm năng' : 'Thường'}
                    </span>
                  </div>
                ))}
              </div>
              {renderPagination(filteredConversations.length)}
            </div>
            <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 p-4 md:p-6 overflow-y-auto flex-col`}>
              {selectedConv ? (
                <div className="flex-grow space-y-4">
                  <div className="flex items-center mb-4 md:hidden">
                    <button onClick={() => setSelectedConv(null)} className="text-navy-600 font-bold flex items-center">
                      <span className="mr-2">←</span> Quay lại
                    </button>
                  </div>
                  {(selectedConv.messages || []).map((msg, i) => (
                    <div key={i} className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-purple-100 ml-auto' : 'bg-gray-100'}`}>
                      <span className="font-bold block text-xs mb-1">{msg.role === 'user' ? 'Khách' : 'AI'}</span> {msg.text}
                    </div>
                  ))}
                  <div className="mt-8 pt-8 border-t">
                    {deleteConfirm?.id === selectedConv.id ? (
                      <div className="flex items-center space-x-4">
                        <span className="text-red-600 font-bold">Xác nhận xóa?</span>
                        <button 
                          onClick={() => handleDelete('conversations', selectedConv.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                        >
                          Đồng ý xóa
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(null)}
                          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirm({ collection: 'conversations', id: selectedConv.id })}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        Xóa cuộc hội thoại này
                      </button>
                    )}
                  </div>
                </div>
              ) : <p className="text-gray-500 text-center mt-20">Chọn cuộc hội thoại để xem chi tiết</p>}
            </div>
          </div>
        );
      case 'offers':
        const currentOffers = offers.slice(startIndex, endIndex);
        return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] bg-white rounded-lg shadow overflow-hidden">
            <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r flex-col`}>
              <div className="flex-grow overflow-y-auto">
                {currentOffers.map(offer => (
                  <div 
                    key={offer.id} 
                    onClick={() => {
                      setSelectedConv({ id: offer.id, userId: offer.name, createdAt: offer.createdAt, messages: [{role: 'user', text: JSON.stringify(offer)}] });
                      if (!offer.isRead) markAsRead('offers', offer.id);
                    }} 
                    className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedConv?.id === offer.id ? 'bg-gray-200' : ''} ${!offer.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`truncate ${!offer.isRead ? 'font-black text-navy-900' : 'font-bold'}`}>
                        Trả giá: {offer.plotId} - {offer.name}
                      </p>
                      {!offer.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(offer.createdAt)}</p>
                  </div>
                ))}
              </div>
              {renderPagination(offers.length)}
            </div>
            <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 p-4 md:p-6 overflow-y-auto flex-col`}>
              {selectedConv ? (() => {
                const offer = offers.find(o => o.id === selectedConv.id);
                return offer ? (
                  <div className="flex-grow space-y-4">
                    <div className="flex items-center mb-4 md:hidden">
                      <button onClick={() => setSelectedConv(null)} className="text-navy-600 font-bold flex items-center">
                        <span className="mr-2">←</span> Quay lại
                      </button>
                    </div>
                    <p className="font-bold text-lg">Chi tiết trả giá</p>
                    <p><strong>Nền:</strong> {offer.plotId}</p>
                    <p><strong>Tên khách:</strong> {offer.name}</p>
                    <p><strong>Số điện thoại:</strong> {offer.phone}</p>
                    <p><strong>Giá cũ:</strong> {new Intl.NumberFormat('vi-VN').format(offer.originalPrice)} VNĐ</p>
                    <p><strong>Giá khách trả:</strong> {new Intl.NumberFormat('vi-VN').format(Number(offer.offeredPrice))} VNĐ</p>
                    <p><strong>Thời gian:</strong> {formatDate(offer.createdAt)}</p>
                    <div className="mt-8 pt-8 border-t">
                      {deleteConfirm?.id === offer.id ? (
                        <div className="flex items-center space-x-4">
                          <span className="text-red-600 font-bold">Xác nhận xóa?</span>
                          <button 
                            onClick={() => handleDelete('offers', offer.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                          >
                            Đồng ý xóa
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(null)}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirm({ collection: 'offers', id: offer.id })}
                          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                        >
                          Xóa lượt trả giá này
                        </button>
                      )}
                    </div>
                  </div>
                ) : null;
              })() : <p className="text-gray-500 text-center mt-20">Chọn trả giá để xem chi tiết</p>}
            </div>
          </div>
        );
      case 'contacts':
        const currentContacts = contacts.slice(startIndex, endIndex);
        return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] bg-white rounded-lg shadow overflow-hidden">
            <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r flex-col`}>
              <div className="flex-grow overflow-y-auto">
                {currentContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    onClick={() => {
                      setSelectedConv({ id: contact.id, userId: contact.name, createdAt: contact.createdAt, messages: [{role: 'user', text: contact.message}] });
                      if (!contact.isRead) markAsRead('contacts', contact.id);
                    }} 
                    className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedConv?.id === contact.id ? 'bg-gray-200' : ''} ${!contact.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`truncate ${!contact.isRead ? 'font-black text-navy-900' : 'font-bold'}`}>
                        {contact.name}
                      </p>
                      {!contact.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                  </div>
                ))}
              </div>
              {renderPagination(contacts.length)}
            </div>
            <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 p-4 md:p-6 overflow-y-auto flex-col`}>
              {selectedConv ? (() => {
                const contact = contacts.find(c => c.id === selectedConv.id);
                return contact ? (
                  <div className="flex-grow space-y-4">
                    <div className="flex items-center mb-4 md:hidden">
                      <button onClick={() => setSelectedConv(null)} className="text-navy-600 font-bold flex items-center">
                        <span className="mr-2">←</span> Quay lại
                      </button>
                    </div>
                    <p className="font-bold text-lg">Tin nhắn từ {contact.name}</p>
                    <p><strong>Email:</strong> {contact.email}</p>
                    <p><strong>Số điện thoại:</strong> {contact.phone}</p>
                    <p><strong>Tin nhắn:</strong> {contact.message}</p>
                    <p><strong>Thời gian:</strong> {formatDate(contact.createdAt)}</p>
                    <div className="mt-8 pt-8 border-t">
                      {deleteConfirm?.id === contact.id ? (
                        <div className="flex items-center space-x-4">
                          <span className="text-red-600 font-bold">Xác nhận xóa?</span>
                          <button 
                            onClick={() => handleDelete('contacts', contact.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                          >
                            Đồng ý xóa
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(null)}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirm({ collection: 'contacts', id: contact.id })}
                          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                        >
                          Xóa tin nhắn này
                        </button>
                      )}
                    </div>
                  </div>
                ) : null;
              })() : <p className="text-gray-500 text-center mt-20">Chọn tin nhắn để xem chi tiết</p>}
            </div>
          </div>
        );
      case 'visitors':
        const currentVisitors = visitors.slice(startIndex, endIndex);
        return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] bg-white rounded-lg shadow overflow-hidden">
            <div className={`${selectedVisitor ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r flex-col`}>
              <div className="flex-grow overflow-y-auto">
                {currentVisitors.map(visitor => (
                  <div 
                    key={visitor.id} 
                    onClick={() => { 
                      setSelectedVisitor(visitor); 
                      setPageHistoryCurrentPage(1); 
                      if (!visitor.isRead) markAsRead('visitor_logs', visitor.id);
                    }} 
                    className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedVisitor?.id === visitor.id ? 'bg-gray-200' : ''} ${!visitor.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-grow overflow-hidden">
                        <p className={`truncate ${!visitor.isRead ? 'font-black text-navy-900' : 'font-bold'}`}>
                          {visitor.name || 'Khách ẩn danh'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{visitor.phoneNumber || 'Không có SĐT'}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        {!visitor.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full mb-1"></span>}
                        {visitor.potentialScore !== undefined && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${visitor.potentialScore > 70 ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'}`}>
                            {visitor.potentialScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(visitor.lastVisited)}</p>
                    {visitor.status && (
                      <span className={`text-[9px] uppercase font-bold px-1 rounded mt-1 inline-block ${
                        visitor.status === 'resale' ? 'bg-red-100 text-red-600' : 'text-navy-500 bg-navy-50'
                      }`}>
                        {visitor.status === 'resale' ? 'Khách bán lại' : visitor.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {renderPagination(visitors.length)}
            </div>
            <div className={`${selectedVisitor ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 p-4 md:p-6 overflow-y-auto flex-col`}>
              {selectedVisitor ? (
                <div className="flex-grow space-y-4">
                  <div className="flex items-center mb-4 md:hidden">
                    <button onClick={() => setSelectedVisitor(null)} className="text-navy-600 font-bold flex items-center">
                      <span className="mr-2">←</span> Quay lại
                    </button>
                  </div>
                  <p className="font-bold text-lg">Chi tiết khách truy cập</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <p><strong>Tên:</strong> {selectedVisitor.name || 'Chưa cập nhật'}</p>
                    <p><strong>SĐT:</strong> {selectedVisitor.phoneNumber || 'Chưa cập nhật'}</p>
                    <p><strong>Nguồn:</strong> {selectedVisitor.source}</p>
                    <p><strong>Thiết bị:</strong> {selectedVisitor.device}</p>
                    <p><strong>Lần cuối:</strong> {formatDate(selectedVisitor.lastVisited)}</p>
                    <p><strong>Trạng thái:</strong> <span className={selectedVisitor.status === 'resale' ? 'text-red-600 font-bold' : ''}>{selectedVisitor.status || 'Thường'}</span></p>
                  </div>

                  <div className="bg-navy-50 p-4 rounded-xl border border-navy-100 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-navy-900">Ghi chú CRM</h3>
                      <span className="text-[10px] text-navy-400 uppercase font-bold tracking-widest">Nội bộ</span>
                    </div>
                    <textarea 
                      className="w-full p-3 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-gold-500 outline-none min-h-[100px]"
                      placeholder="Ghi chú về khách hàng này..."
                      value={selectedVisitor.crmNotes || ''}
                      onChange={(e) => handleUpdateVisitorCRM(selectedVisitor.id, 'crmNotes', e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleUpdateVisitorCRM(selectedVisitor.id, 'status', 'potential')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700">Đánh dấu Tiềm năng</button>
                    <button onClick={() => handleUpdateVisitorCRM(selectedVisitor.id, 'status', 'employee')} className="bg-navy-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-navy-700">Đánh dấu Nhân viên</button>
                    <button onClick={() => handleUpdateVisitorCRM(selectedVisitor.id, 'status', 'resale')} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700">Đánh dấu Khách bán lại</button>
                  </div>

                  {selectedVisitor.lastConsignment && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4">
                      <h3 className="font-bold text-red-900 mb-2">Yêu cầu ký gửi gần nhất</h3>
                      <p className="text-sm"><strong>Loại:</strong> {selectedVisitor.lastConsignment.propertyType}</p>
                      <p className="text-sm"><strong>Địa chỉ:</strong> {selectedVisitor.lastConsignment.address}</p>
                      <p className="text-sm"><strong>Giá:</strong> {new Intl.NumberFormat('vi-VN').format(selectedVisitor.lastConsignment.price)} VNĐ</p>
                    </div>
                  )}
                  
                  <div className="bg-navy-50 p-4 rounded-xl border border-navy-100 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-navy-900 flex items-center">
                        <span className="mr-2">🤖</span> AI Đánh giá & Gợi ý
                      </h4>
                      <button 
                        onClick={() => handleAnalyzeVisitor(selectedVisitor)}
                        disabled={loadingAssessment}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${loadingAssessment ? 'bg-gray-200 text-gray-400' : 'bg-gold-500 text-white hover:bg-gold-600'}`}
                      >
                        {loadingAssessment ? 'Đang phân tích...' : 'Phân tích thông minh'}
                      </button>
                    </div>

                    {selectedVisitor.potentialScore !== undefined && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>Điểm tiềm năng:</span>
                          <span className={selectedVisitor.potentialScore > 70 ? 'text-green-600' : 'text-gold-600'}>{selectedVisitor.potentialScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-1000 ${selectedVisitor.potentialScore > 70 ? 'bg-green-500' : 'bg-gold-500'}`} 
                            style={{ width: `${selectedVisitor.potentialScore}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {selectedVisitor.aiAssessment ? (
                      <div className="space-y-4">
                        <div className="bg-white p-3 rounded-lg border border-navy-50">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nhận xét chuyên gia:</p>
                          <p className="text-sm text-navy-800 leading-relaxed whitespace-pre-line">
                            {typeof selectedVisitor.aiAssessment === 'string' ? selectedVisitor.aiAssessment : JSON.stringify(selectedVisitor.aiAssessment)}
                          </p>
                        </div>

                        {(selectedVisitor as any).aiSmartMatching && (
                          <div className="bg-gold-50 p-3 rounded-lg border border-gold-100">
                            <p className="text-xs font-bold text-gold-700 uppercase mb-1">Gợi ý sản phẩm phù hợp:</p>
                            <p className="text-sm text-gold-900 italic">
                              {typeof (selectedVisitor as any).aiSmartMatching === 'string' ? (selectedVisitor as any).aiSmartMatching : JSON.stringify((selectedVisitor as any).aiSmartMatching)}
                            </p>
                          </div>
                        )}

                        {(selectedVisitor as any).aiMessageTemplate && (
                          <div className="bg-navy-900 p-3 rounded-lg text-white">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-[10px] font-bold text-gold-400 uppercase">Mẫu tin nhắn Zalo chốt khách:</p>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText((selectedVisitor as any).aiMessageTemplate);
                                  alert('Đã copy tin nhắn mẫu!');
                                }}
                                className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded"
                              >
                                Copy
                              </button>
                            </div>
                            <p className="text-xs italic opacity-90 leading-relaxed">
                              {typeof (selectedVisitor as any).aiMessageTemplate === 'string' ? (selectedVisitor as any).aiMessageTemplate : JSON.stringify((selectedVisitor as any).aiMessageTemplate)}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Nhấn nút để AI phân tích hành vi, chấm điểm tiềm năng và gợi ý kịch bản chốt khách.</p>
                    )}
                  </div>

                  {/* CRM Section */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 mt-4 space-y-4">
                    <h4 className="font-bold text-navy-900 flex items-center border-b pb-2">
                      <span className="mr-2">📋</span> Quản lý chăm sóc (CRM)
                    </h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Trạng thái khách:</label>
                      <select 
                        value={selectedVisitor.status || 'new'} 
                        onChange={(e) => handleUpdateVisitorCRM(selectedVisitor.id, 'status', e.target.value)}
                        className="w-full text-sm border rounded p-2 bg-gray-50"
                      >
                        <option value="new">Khách mới</option>
                        <option value="contacting">Đang liên hệ</option>
                        <option value="negotiating">Đang thương lượng</option>
                        <option value="closed">Đã chốt</option>
                        <option value="junk">Khách ảo/Rác</option>
                        <option value="employee">Nhân Viên</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ghi chú cá nhân:</label>
                      <textarea 
                        value={selectedVisitor.notes || ''} 
                        onChange={(e) => handleUpdateVisitorCRM(selectedVisitor.id, 'notes', e.target.value)}
                        placeholder="Nhập ghi chú về khách này..."
                        className="w-full text-sm border rounded p-2 bg-gray-50 h-20"
                      />
                    </div>
                  </div>

                  <p className="font-bold">Lịch sử xem lô đất:</p>
                  <ul className="list-disc pl-5">
                    {selectedVisitor.viewedPlots.map((plotId, i) => <li key={i}>{plotId}</li>)}
                  </ul>

                  {selectedVisitor.offers && selectedVisitor.offers.length > 0 && (
                    <div className="mt-4">
                      <p className="font-bold text-red-600">Yêu cầu trả giá đã gửi:</p>
                      <ul className="space-y-2 mt-2">
                        {selectedVisitor.offers.map((offer, i) => {
                          const diff = offer.originalPrice ? Number(offer.offeredPrice) - offer.originalPrice : 0;
                          return (
                            <li key={i} className="text-sm bg-red-50 p-3 rounded border border-red-100">
                              <div className="flex justify-between items-start">
                                <div>
                                  Lô <strong>{offer.plotId}</strong>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Giá gốc: {offer.originalPrice ? new Intl.NumberFormat('vi-VN').format(offer.originalPrice) : 'N/A'} VNĐ
                                  </div>
                                  <div className="font-bold text-navy-900">
                                    Giá trả: {new Intl.NumberFormat('vi-VN').format(Number(offer.offeredPrice))} VNĐ
                                  </div>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded ${diff >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {diff >= 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(diff)}
                                </div>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-2">{new Date(offer.timestamp).toLocaleString()}</div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <p className="font-bold mt-4">Lịch sử trang:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {[...selectedVisitor.pageHistory]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice((pageHistoryCurrentPage - 1) * 10, pageHistoryCurrentPage * 10)
                      .map((h, i) => (
                        <li key={i} className="text-sm break-all">
                          <a href={h.pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {h.pageUrl}
                          </a>
                          <span className="text-gray-500 ml-2">({new Date(h.timestamp).toLocaleString()})</span>
                        </li>
                      ))}
                  </ul>
                  {selectedVisitor.pageHistory.length > 10 && (
                    <div className="flex justify-center mt-4 gap-2 flex-wrap">
                      {Array.from({ length: Math.ceil(selectedVisitor.pageHistory.length / 10) }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setPageHistoryCurrentPage(i + 1)}
                          className={`px-3 py-1 rounded text-sm ${pageHistoryCurrentPage === i + 1 ? 'bg-navy-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-8 pt-8 border-t">
                    {deleteConfirm?.id === selectedVisitor.id ? (
                      <div className="flex items-center space-x-4">
                        <span className="text-red-600 font-bold">Xác nhận xóa?</span>
                        <button 
                          onClick={() => handleDelete('visitor_logs', selectedVisitor.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                        >
                          Đồng ý xóa
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(null)}
                          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirm({ collection: 'visitor_logs', id: selectedVisitor.id })}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        Xóa khách truy cập này
                      </button>
                    )}
                  </div>
                </div>
              ) : <p className="text-gray-500 text-center mt-20">Chọn khách để xem chi tiết</p>}
            </div>
          </div>
        );
      case 'consignment':
        const currentConsignments = consignments.slice(startIndex, endIndex);
        return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-160px)] bg-white rounded-lg shadow overflow-hidden">
            <div className={`${selectedConsignment ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r flex-col`}>
              <div className="flex-grow overflow-y-auto">
                {currentConsignments.map(consignment => (
                  <div 
                    key={consignment.id} 
                    onClick={() => {
                      setSelectedConsignment(consignment);
                      if (!consignment.isRead) markAsRead('consignments', consignment.id);
                    }} 
                    className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedConsignment?.id === consignment.id ? 'bg-gray-200' : ''} ${!consignment.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-grow overflow-hidden">
                        <p className={`truncate ${!consignment.isRead ? 'font-black text-navy-900' : 'font-bold'}`}>
                          {consignment.fullName || 'Khách ký gửi'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{consignment.phoneNumber}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        {!consignment.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full mb-1"></span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                          consignment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          consignment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          consignment.status === 'pending' ? 'bg-gold-100 text-gold-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {consignment.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(consignment.createdAt)}</p>
                    <p className="text-[10px] text-navy-600 mt-1 font-medium truncate">{consignment.address}</p>
                  </div>
                ))}
              </div>
              {renderPagination(consignments.length)}
            </div>
            <div className={`${selectedConsignment ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 p-4 md:p-6 overflow-y-auto flex-col`}>
              {selectedConsignment ? (
                <div className="flex-grow space-y-6">
                  <div className="flex items-center mb-4 md:hidden">
                    <button onClick={() => setSelectedConsignment(null)} className="text-navy-600 font-bold flex items-center">
                      <span className="mr-2">←</span> Quay lại
                    </button>
                  </div>
                  <div className="flex flex-col md:flex-row justify-between items-start border-b pb-4 gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-navy-900">Chi tiết ký gửi</h2>
                      <p className="text-xs text-gray-500">Mã: {selectedConsignment.id}</p>
                    </div>
                    <div className="flex flex-col items-end w-full md:w-auto">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cập nhật trạng thái:</label>
                      <select 
                        value={selectedConsignment.status} 
                        onChange={(e) => handleUpdateConsignmentStatus(selectedConsignment.id, e.target.value)}
                        className="text-sm border rounded p-2 bg-gray-50 font-bold text-navy-900 w-full md:w-auto"
                      >
                        <option value="pending">Chờ duyệt</option>
                        <option value="reviewed">Đã xem</option>
                        <option value="contacted">Đã liên hệ</option>
                        <option value="completed">Đã chốt</option>
                        <option value="rejected">Từ chối</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-bold text-navy-900 border-l-4 border-gold-500 pl-3">Thông tin khách hàng</h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <p><span className="text-gray-500 text-sm">Họ tên:</span> <span className="font-bold">{selectedConsignment.fullName}</span></p>
                        <p><span className="text-gray-500 text-sm">SĐT:</span> <span className="font-bold">{selectedConsignment.phoneNumber}</span></p>
                        {selectedConsignment.zalo && <p><span className="text-gray-500 text-sm">Zalo:</span> <span className="font-bold">{selectedConsignment.zalo}</span></p>}
                      </div>

                      <h3 className="font-bold text-navy-900 border-l-4 border-gold-500 pl-3 mt-6">Thông tin bất động sản</h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <p><span className="text-gray-500 text-sm">Loại:</span> <span className="font-bold">{selectedConsignment.propertyType}</span></p>
                        <p><span className="text-gray-500 text-sm">Địa chỉ:</span> <span className="font-bold">{selectedConsignment.address}</span></p>
                        <p><span className="text-gray-500 text-sm">Diện tích:</span> <span className="font-bold">{selectedConsignment.area} m² {selectedConsignment.dimensions ? `(${selectedConsignment.dimensions})` : ''}</span></p>
                        <p><span className="text-gray-500 text-sm">Giá:</span> <span className="font-bold text-gold-600">{selectedConsignment.price} VNĐ</span></p>
                        <p><span className="text-gray-500 text-sm">Pháp lý:</span> <span className="font-bold">{selectedConsignment.legalStatus}</span></p>
                        <p><span className="text-gray-500 text-sm">Hướng:</span> <span className="font-bold">{selectedConsignment.direction}</span></p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-navy-900 border-l-4 border-gold-500 pl-3">Mô tả chi tiết</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-navy-800 whitespace-pre-line leading-relaxed">{selectedConsignment.description}</p>
                      </div>

                      <h3 className="font-bold text-navy-900 border-l-4 border-gold-500 pl-3 mt-6">Hình ảnh ({selectedConsignment.images?.length || 0})</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedConsignment.images?.map((img, i) => (
                          <div key={i} className="aspect-video bg-gray-200 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(img)}>
                            <img src={img} alt={`Property ${i}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t">
                    {deleteConfirm?.id === selectedConsignment.id ? (
                      <div className="flex items-center space-x-4">
                        <span className="text-red-600 font-bold">Xác nhận xóa?</span>
                        <button 
                          onClick={() => handleDelete('consignments', selectedConsignment.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                        >
                          Đồng ý xóa
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(null)}
                          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirm({ collection: 'consignments', id: selectedConsignment.id })}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        Xóa yêu cầu ký gửi này
                      </button>
                    )}
                  </div>
                </div>
              ) : <p className="text-gray-500 text-center mt-20">Chọn yêu cầu ký gửi để xem chi tiết</p>}
            </div>
          </div>
        );
      case 'analytics':
        return <AnalyticsView visitors={visitors} plots={plots} offers={offers} />;
      case 'office':
        return (
          <OfficeView 
            visitors={visitors} 
            localSettings={localSettings}
            updateLocalSetting={updateLocalSetting}
            handleSaveSettings={handleSaveSettings}
            isSaving={isSaving}
          />
        );
      case 'backup':
        return <BackupExportView visitors={visitors} conversations={conversations} offers={offers} />;
      case 'settings':
        if (!localSettings) return <div className="p-8 text-center">Đang tải cấu hình...</div>;
        return (
          <div className="space-y-8 max-w-4xl pb-20">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm sticky top-0 z-10 border border-gold-100">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Cài đặt hệ thống</h2>
                <p className="text-xs text-gray-500">Chỉnh sửa các thông số và nhấn Lưu để áp dụng</p>
              </div>
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className={`px-8 py-3 bg-gold-500 text-white rounded-xl font-bold shadow-lg hover:bg-gold-600 transition-all flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
                {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>

            {/* 1. Cấu hình hiển thị sản phẩm */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">1. Cấu hình hiển thị sản phẩm</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-bold text-navy-900">Hiển thị Thái Thành Bom Bo</h3>
                    <p className="text-sm text-gray-500">Bật/tắt hiển thị danh sách sản phẩm Thái Thành Bom Bo</p>
                  </div>
                  <button 
                    onClick={() => updateLocalSetting({ showBombo: !localSettings.showBombo })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localSettings.showBombo ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showBombo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-bold text-navy-900">Hiển thị Sản phẩm khác</h3>
                    <p className="text-sm text-gray-500">Bật/tắt hiển thị danh sách các sản phẩm bất động sản khác</p>
                  </div>
                  <button 
                    onClick={() => updateLocalSetting({ showOther: !localSettings.showOther })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localSettings.showOther ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showOther ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Thông tin liên hệ */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">2. Thông tin liên hệ</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Số Hotline</label>
                  <input 
                    type="text" 
                    value={localSettings.hotline}
                    onChange={(e) => updateLocalSetting({ hotline: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Link Zalo</label>
                  <input 
                    type="text" 
                    value={localSettings.zaloLink || ''}
                    onChange={(e) => updateLocalSetting({ zaloLink: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input 
                    type="text" 
                    value={localSettings.email || ''}
                    onChange={(e) => updateLocalSetting({ email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Link Youtube</label>
                  <input 
                    type="text" 
                    value={localSettings.youtubeLink || ''}
                    onChange={(e) => updateLocalSetting({ youtubeLink: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>
            
            {/* 3. Cấu hình SEO & MKT */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">3. Cấu hình SEO & MKT</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">SEO Title</label>
                  <input 
                    type="text" 
                    value={localSettings.seoTitle || ''}
                    onChange={(e) => updateLocalSetting({ seoTitle: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">SEO Description</label>
                  <input 
                    type="text" 
                    value={localSettings.seoDescription || ''}
                    onChange={(e) => updateLocalSetting({ seoDescription: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Google Analytics ID</label>
                  <input 
                    type="text" 
                    value={localSettings.googleAnalyticsId || ''}
                    onChange={(e) => updateLocalSetting({ googleAnalyticsId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Facebook Pixel ID</label>
                  <input 
                    type="text" 
                    value={localSettings.facebookPixelId || ''}
                    onChange={(e) => updateLocalSetting({ facebookPixelId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Link Facebook</label>
                  <input 
                    type="text" 
                    value={localSettings.facebookLink || ''}
                    onChange={(e) => updateLocalSetting({ facebookLink: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Cấu hình bảo mật & Ảnh */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">4. Cấu hình bảo mật & Ảnh</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <label className="text-sm font-bold text-gray-700 mr-2">Chống chuột phải</label>
                  <button 
                    onClick={() => updateLocalSetting({ disableRightClick: !localSettings.disableRightClick })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.disableRightClick ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.disableRightClick ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <label className="text-sm font-bold text-gray-700 mr-2">Chống copy văn bản</label>
                  <button 
                    onClick={() => updateLocalSetting({ disableTextSelection: !localSettings.disableTextSelection })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.disableTextSelection ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.disableTextSelection ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <label className="text-sm font-bold text-gray-700 mr-2">Tự động đóng dấu ảnh</label>
                  <button 
                    onClick={() => updateLocalSetting({ enableWatermark: !localSettings.enableWatermark })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.enableWatermark ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.enableWatermark ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nội dung đóng dấu</label>
                  <input 
                    type="text" 
                    value={localSettings.watermarkText || ''}
                    onChange={(e) => updateLocalSetting({ watermarkText: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Chất lượng nén ảnh (1-100)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={localSettings.imageCompressionQuality || 80}
                    onChange={(e) => updateLocalSetting({ imageCompressionQuality: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 5. Thông tin chân trang & Thông báo */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">5. Thông tin chân trang & Thông báo</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tên công ty</label>
                  <input 
                    type="text" 
                    value={localSettings.footerCompanyName || ''}
                    onChange={(e) => updateLocalSetting({ footerCompanyName: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mã số thuế</label>
                  <input 
                    type="text" 
                    value={localSettings.footerTaxCode || ''}
                    onChange={(e) => updateLocalSetting({ footerTaxCode: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Slogan</label>
                  <input 
                    type="text" 
                    value={localSettings.slogan || ''}
                    onChange={(e) => updateLocalSetting({ slogan: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Thông tin bản quyền</label>
                  <input 
                    type="text" 
                    value={localSettings.copyrightInfo || ''}
                    onChange={(e) => updateLocalSetting({ copyrightInfo: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div className="lg:col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex-grow mr-4">
                    <h3 className="font-bold text-navy-900">Dòng chữ chạy (Marquee)</h3>
                    <input 
                      type="text" 
                      placeholder="Nhập nội dung thông báo..."
                      value={localSettings.marqueeText}
                      onChange={(e) => updateLocalSetting({ marqueeText: e.target.value })}
                      className="w-full mt-2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => updateLocalSetting({ showMarquee: !localSettings.showMarquee })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.showMarquee ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showMarquee ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="lg:col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex-grow mr-4">
                    <h3 className="font-bold text-navy-900">Popup thông báo</h3>
                    <textarea 
                      placeholder="Nhập nội dung popup..."
                      value={localSettings.popupContent}
                      onChange={(e) => updateLocalSetting({ popupContent: e.target.value })}
                      className="w-full mt-2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none h-24"
                    />
                  </div>
                  <button 
                    onClick={() => updateLocalSetting({ showPopup: !localSettings.showPopup })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.showPopup ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.showPopup ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* 6. Quản lý tính năng */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">6. Quản lý tính năng</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl flex flex-col items-center text-center">
                  <span className="font-bold mb-2">Chatbot AI</span>
                  <button 
                    onClick={() => updateLocalSetting({ enableAIChat: !localSettings.enableAIChat })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.enableAIChat ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.enableAIChat ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl flex flex-col items-center text-center">
                  <span className="font-bold mb-2">Ký gửi</span>
                  <button 
                    onClick={() => updateLocalSetting({ enableConsignment: !localSettings.enableConsignment })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.enableConsignment ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.enableConsignment ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl flex flex-col items-center text-center">
                  <span className="font-bold mb-2">Trả giá</span>
                  <button 
                    onClick={() => updateLocalSetting({ enableOffers: !localSettings.enableOffers })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.enableOffers ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.enableOffers ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* 7. Giao diện & Hệ thống */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">7. Giao diện & Hệ thống</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Link ảnh nền (Hero Image)</label>
                  <input 
                    type="text" 
                    placeholder="Dán link ảnh (https://...)"
                    value={localSettings.heroImageUrl}
                    onChange={(e) => updateLocalSetting({ heroImageUrl: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề chính (Trang chủ)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: THÁI THÀNH BOM BO"
                    value={localSettings.mainTitle || ''}
                    onChange={(e) => updateLocalSetting({ mainTitle: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề nhỏ (Trang chủ)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Nơi Xứng Tầm Cho Bạn"
                    value={localSettings.subTitle || ''}
                    onChange={(e) => updateLocalSetting({ subTitle: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <h3 className="font-bold text-red-900">Chế độ bảo trì (Maintenance Mode)</h3>
                    <p className="text-sm text-red-700">Khi bật, khách hàng sẽ không thể truy cập trang web</p>
                  </div>
                  <button 
                    onClick={() => updateLocalSetting({ maintenanceMode: !localSettings.maintenanceMode })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* 8. Thông báo cho Admin (Telegram) */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-8 border-b pb-4">8. Thông báo cho Admin (Telegram)</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-bold text-navy-900">Bật thông báo Telegram</h3>
                    <p className="text-sm text-gray-500">Nhận tin nhắn báo ngay khi có khách liên hệ, trả giá hoặc ký gửi</p>
                  </div>
                  <button 
                    onClick={() => updateLocalSetting({ enableTelegramNotify: !localSettings.enableTelegramNotify })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${localSettings.enableTelegramNotify ? 'bg-gold-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.enableTelegramNotify ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bot Token</label>
                    <input 
                      type="password" 
                      placeholder="Nhập Telegram Bot Token..."
                      value={localSettings.telegramBotToken}
                      onChange={(e) => updateLocalSetting({ telegramBotToken: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Lấy từ @BotFather</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Chat ID</label>
                    <input 
                      type="text" 
                      placeholder="Nhập Telegram Chat ID..."
                      value={localSettings.telegramChatId}
                      onChange={(e) => updateLocalSetting({ telegramChatId: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Lấy từ @userinfobot</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <button 
                    onClick={async () => {
                      if (!localSettings.telegramBotToken || !localSettings.telegramChatId) {
                        alert('Vui lòng điền đầy đủ Bot Token và Chat ID trước khi thử!');
                        return;
                      }
                      try {
                        const url = `https://api.telegram.org/bot${localSettings.telegramBotToken}/sendMessage`;
                        const response = await fetch(url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            chat_id: localSettings.telegramChatId,
                            text: '<b>✅ THỬ NGHIỆM THÀNH CÔNG</b>\n\nChúc mừng! Hệ thống thông báo Telegram của Bom Bo Real đã được kết nối chính xác.',
                            parse_mode: 'HTML'
                          })
                        });
                        const data = await response.json();
                        if (data.ok) {
                          alert('Đã gửi tin nhắn thử nghiệm thành công! Hãy kiểm tra điện thoại của bạn.');
                        } else {
                          alert(`Lỗi từ Telegram: ${data.description}`);
                        }
                      } catch (err) {
                        alert('Không thể kết nối tới Telegram API. Vui lòng kiểm tra lại Token.');
                      }
                    }}
                    className="px-6 py-2 bg-navy-900 text-white rounded-lg font-bold hover:bg-navy-800 transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Gửi thử tin nhắn
                  </button>
                </div>
              </div>
            </div>
            
            {/* Floating Save Button for Mobile/Convenience */}
            <div className="fixed bottom-8 right-8 md:hidden">
              <button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-14 h-14 bg-gold-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
              >
                {isSaving ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            </div>
          </div>
        );
      default:
        return <div>Chức năng đang cập nhật</div>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        unreadCounts={unreadCounts} 
        onLogout={handleLogout}
      />
      <div className="flex-grow p-4 md:p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-xl md:text-2xl font-bold mb-6 capitalize">{activeTab}</h1>
        {renderContent()}
      </div>
    </div>
  );
};
