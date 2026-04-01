import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PROJECT_HERO_IMAGE, GOOGLE_SHEET_CSV_URL_BOMBO, GOOGLE_SHEET_CSV_URL_OTHER } from '../constants';
import { fetchLandPlots } from '../services/dataService';
import { LandPlot } from '../types';

export const ProjectsPage: React.FC = () => {
  const [bomboPlots, setBomboPlots] = useState<LandPlot[]>([]);
  const [otherPlots, setOtherPlots] = useState<LandPlot[]>([]);
  const [view, setView] = useState<'overview' | 'bombo' | 'other'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const bombo = await fetchLandPlots(GOOGLE_SHEET_CSV_URL_BOMBO);
      const other = await fetchLandPlots(GOOGLE_SHEET_CSV_URL_OTHER);
      setBomboPlots(bombo);
      setOtherPlots(other);
    };
    loadData();
  }, []);

  if (view === 'overview') {
    return (
      <div className="pt-24 pb-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl font-bold text-navy-900 mb-12 font-serif text-center">SẢN PHẨM</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div 
              className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setView('bombo')}
            >
              <img src={PROJECT_HERO_IMAGE} alt="Thái Thành Bom Bo" className="w-full h-64 object-cover" />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-navy-900 mb-2">Thái Thành Bom Bo</h2>
                <p className="text-gray-600">Xem danh sách các lô đất tại dự án Thái Thành Bom Bo.</p>
              </div>
            </div>
            <div 
              className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setView('other')}
            >
              <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80" alt="Sản phẩm khác" className="w-full h-64 object-cover" />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-navy-900 mb-2">Sản phẩm khác</h2>
                <p className="text-gray-600">Xem danh sách các sản phẩm bất động sản khác.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const plots = view === 'bombo' ? bomboPlots : otherPlots;
  const title = view === 'bombo' ? 'Thái Thành Bom Bo' : 'Sản phẩm khác';
  const url = view === 'bombo' ? GOOGLE_SHEET_CSV_URL_BOMBO : GOOGLE_SHEET_CSV_URL_OTHER;
  
  const itemsPerPage = 10;
  const totalPages = Math.ceil(plots.length / itemsPerPage);
  const paginatedPlots = plots.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="pt-24 pb-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-6">
        <button onClick={() => { setView('overview'); setCurrentPage(1); }} className="mb-8 text-navy-900 font-bold hover:text-gold-500">← Quay lại</button>
        <h1 className="text-4xl font-bold text-navy-900 mb-8 font-serif text-center">{title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedPlots.map(plot => (
            <div key={plot.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <img src={plot.images[0] || "https://picsum.photos/400/300"} alt={`Lô ${plot.id}`} className="w-full h-48 object-cover rounded-lg mb-4" referrerPolicy="no-referrer" />
              <h4 className="font-bold text-lg mb-2">Lô: {plot.id}</h4>
              <p>Diện tích: {plot.area} m²</p>
              <p>Giá: {plot.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
              <Link to={`/plot/${plot.id}?url=${encodeURIComponent(url)}`} className="text-blue-600 hover:underline mt-auto pt-2">Xem chi tiết</Link>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center mt-12 gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 rounded ${currentPage === i + 1 ? 'bg-navy-900 text-white' : 'bg-white border'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
