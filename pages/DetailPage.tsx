import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { LandPlot } from '../types';
import { getPlotById } from '../services/dataService';
import { generatePlotAnalysis } from '../services/geminiService';
import { MakeOfferPopup } from '../components/MakeOfferPopup';
import { GOOGLE_SHEET_CSV_URL_BOMBO, GOOGLE_SHEET_CSV_URL_OTHER } from '../constants';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const source = query.get('source');
  const url = source === 'other' ? GOOGLE_SHEET_CSV_URL_OTHER : GOOGLE_SHEET_CSV_URL_BOMBO;

  const [plot, setPlot] = useState<LandPlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    
    setLoading(true);
    getPlotById(id, url)
      .then(foundPlot => {
        setPlot(foundPlot || null);
        if (foundPlot) {
          // Fetch AI analysis automatically on load
          setLoadingAi(true);
          generatePlotAnalysis(foundPlot)
            .then(text => setAiAnalysis(text))
            .catch(err => {
              if (err.message === "API_KEY_MISSING" || err.message === "API_KEY_INVALID") {
                setAiAnalysis(err.message);
              } else {
                setAiAnalysis("Hệ thống phân tích đang bảo trì, vui lòng tham khảo thông tin chi tiết bên dưới.");
              }
            })
            .finally(() => setLoadingAi(false));
        }
      })
      .finally(() => setLoading(false));

    const unsubscribe = onSnapshot(doc(db, 'app_settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data());
      }
    });
    return () => unsubscribe();
  }, [id, url]);

  if (loading) {
     return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!plot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Không tìm thấy thông tin mã nền: {id}</h2>
          <button onClick={() => navigate(-1)} className="text-gold-600 hover:underline mt-4 block">Quay lại</button>
        </div>
      </div>
    );
  }

  const getStatusBgColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ĐÃ BÁN' || s === 'ĐÃ CỌC') return 'bg-red-500';
    if (s === 'ĐÃ ĐẶT CHỖ') return 'bg-lime-200';
    return 'bg-gray-50';
  };

  return (
    <div className={`${getStatusBgColor(plot.status)} pb-20 pt-10 min-h-screen`}>
      {/* Header Info */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-6 py-6">
          <button onClick={() => navigate(-1)} className="mb-4 text-navy-900 font-bold hover:text-gold-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Quay lại
          </button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-gold-500 text-white text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">
                  Mã nền
                </span>
                <h1 className="text-4xl font-bold text-navy-900">{plot.id}</h1>
              </div>
              <p className="text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {plot.phankhu || 'Phân khu A'} {plot.cdt ? `- ${plot.cdt} ` : ''}- {settings?.footerCompanyName || plot.duan || 'THÁI THÀNH BOM BO'}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end w-full md:w-auto">
               <span className={`text-lg font-bold px-4 py-2 rounded-full border ${
                 (plot.status === 'Đã cọc' || plot.status === 'Đã bán' || plot.status === 'đã giàu') 
                   ? 'border-red-500 text-white bg-red-500' 
                   : (plot.status === 'ĐÃ ĐẶT CHỖ' 
                     ? 'border-green-300 text-green-800 bg-green-300' 
                     : 'border-green-500 text-green-600 bg-green-50')
               }`}>
                {plot.status}
               </span>
               <div className="flex flex-col md:items-end mt-2">
                 <span className="text-2xl md:text-3xl font-bold text-gold-600">
                   {new Intl.NumberFormat('vi-VN').format(plot.totalPrice)} VNĐ
                 </span>
                 <span className="text-sm text-gray-400 font-normal">({new Intl.NumberFormat('vi-VN').format(plot.pricePerM2)} triệu/m2)</span>
               </div>
               {settings?.enableOffers !== false && (
                 <button 
                   onClick={() => setShowPopup(true)}
                   className="mt-4 w-full md:w-auto bg-gold-500 text-white px-8 py-3 rounded-full font-bold hover:bg-gold-600 transition-colors"
                 >
                   Trả giá
                 </button>
               )}
            </div>
          </div>
        </div>
      </div>

      {showPopup && <MakeOfferPopup plotId={plot.id} originalPrice={plot.totalPrice} onClose={() => setShowPopup(false)} />}

      <div className="container mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Images & Analysis */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg">
              <div className="relative h-96">
                <img 
                  src={plot.images[activeImage] || "https://picsum.photos/800/600"} 
                  alt={`Plot ${plot.id}`} 
                  className="w-full h-full object-cover transition-all duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/800/600";
                  }}
                />
                {plot.images.length > 0 && (
                  <div className="absolute bottom-4 left-4 flex space-x-2 overflow-x-auto max-w-full p-2">
                    {plot.images.map((img, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`w-16 h-12 flex-shrink-0 rounded border-2 overflow-hidden ${activeImage === idx ? 'border-gold-500' : 'border-white opacity-70'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Consultant Section */}
            <div className="bg-gradient-to-br from-navy-900 to-navy-800 text-white rounded-xl shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              </div>
              <div className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gold-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-serif text-gold-400">Góc Nhìn Chuyên Gia AI</h3>
                    <p className="text-xs text-gray-300">Phân tích tiềm năng đầu tư độc quyền</p>
                  </div>
                </div>
                
                {loadingAi ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-2 bg-gray-600 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-600 rounded w-full"></div>
                    <div className="h-2 bg-gray-600 rounded w-5/6"></div>
                    <p className="text-sm text-gold-500 mt-4 italic">Đang phân tích dữ liệu...</p>
                  </div>
                ) : aiAnalysis === "API_KEY_MISSING" || aiAnalysis === "API_KEY_INVALID" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="leading-relaxed whitespace-pre-line text-gray-200">
                      Tính năng trợ lý AI cần API Key để hoạt động. Vui lòng cung cấp API Key của bạn để sử dụng tính năng này.
                    </p>
                    <button 
                      onClick={async () => {
                        if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
                          await (window as any).aistudio.openSelectKey();
                          // Thử lại sau khi nhập key
                          setLoadingAi(true);
                          generatePlotAnalysis(plot)
                            .then(text => setAiAnalysis(text))
                            .catch(err => {
                              if (err.message === "API_KEY_MISSING" || err.message === "API_KEY_INVALID") {
                                setAiAnalysis(err.message);
                              } else {
                                setAiAnalysis("Hệ thống phân tích đang bảo trì, vui lòng tham khảo thông tin chi tiết bên dưới.");
                              }
                            })
                            .finally(() => setLoadingAi(false));
                        } else {
                          alert("Không thể mở hộp thoại nhập API Key.");
                        }
                      }}
                      className="mt-4 px-4 py-2 bg-gold-500 text-white rounded hover:bg-gold-600 transition-colors font-semibold"
                    >
                      Nhập API Key
                    </button>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="leading-relaxed whitespace-pre-line text-gray-200">
                      {aiAnalysis}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold text-navy-900 mb-4 border-b pb-2">Mô Tả Chi Tiết</h3>
              <p className="text-gray-600 leading-relaxed mb-4">{plot.description}</p>
              <div className="flex flex-wrap gap-2">
                {plot.features.map((feature, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Specs & Contact */}
          <div className="space-y-8">
            {/* Specs Card */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
              <h3 className="text-lg font-bold text-navy-900 mb-6 font-serif">Thông Số Kỹ Thuật</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Diện tích</span>
                  <span className="font-bold text-navy-900">{plot.area} m²</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Hướng</span>
                  <span className="font-bold text-navy-900">{plot.direction}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Pháp lý</span>
                  <span className="font-bold text-green-600">{plot.legal}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Kích thước</span>
                  <span className="font-bold text-navy-900">{plot.size || `5m x ${Number((plot.area / 5).toFixed(2))}m`}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Lộ giới</span>
                  <span className="font-bold text-navy-900">{plot.logioi || '16m'}</span>
                </div>
              </div>
              
              <div className="mt-8">
                <a 
                  href={settings?.zaloLink || `https://zalo.me/${settings?.hotline?.replace(/\s/g, '') || '0969320229'}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full bg-navy-900 text-white py-4 rounded-lg font-bold text-center hover:bg-gold-500 transition-all shadow-lg transform hover:-translate-y-1"
                >
                  LIÊN HỆ TƯ VẤN NGAY
                </a>
                <p className="text-center text-xs text-gray-400 mt-2">Hotline hỗ trợ 24/7: {settings?.hotline || '0969 320 229'}</p>
              </div>
            </div>

            {/* Simulated Map Preview */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Vị Trí Trên Bản Đồ</h3>
              <div 
                className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer"
                onClick={() => {
                  if (plot.linkmap) {
                    window.open(plot.linkmap, '_blank');
                  } else {
                    alert('Chưa có dữ liệu bản đồ cho lô đất này.');
                  }
                }}
              >
                 {/* Mock Map Image */}
                 <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80" alt="Map" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute"></div>
                    <div className="w-3 h-3 bg-red-600 rounded-full relative z-10 border-2 border-white"></div>
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 text-center">
                   {plot.linkmap ? 'Nhấn để xem trên Google Maps' : 'Chưa có link bản đồ'}
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};