import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECT_HERO_IMAGE, GOOGLE_SHEET_CSV_URL_BOMBO, GOOGLE_SHEET_CSV_URL_OTHER } from '../constants';
import { fetchLandPlots } from '../services/dataService';
import { LandPlot } from '../types';

export const SearchPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bomboPlots, setBomboPlots] = useState<LandPlot[]>([]);
  const [otherPlots, setOtherPlots] = useState<LandPlot[]>([]);
  const navigate = useNavigate();

  // Pre-load data when page opens
  useEffect(() => {
    fetchLandPlots(GOOGLE_SHEET_CSV_URL_BOMBO).then(data => setBomboPlots(data));
    fetchLandPlots(GOOGLE_SHEET_CSV_URL_OTHER).then(data => setOtherPlots(data));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Ensure we have the latest data
      const currentBombo = bomboPlots.length > 0 ? bomboPlots : await fetchLandPlots(GOOGLE_SHEET_CSV_URL_BOMBO);
      const currentOther = otherPlots.length > 0 ? otherPlots : await fetchLandPlots(GOOGLE_SHEET_CSV_URL_OTHER);
      const normalizedCode = code.trim().toUpperCase();
      
      const plotInBombo = currentBombo.find(p => p.id.toUpperCase() === normalizedCode);
      const plotInOther = currentOther.find(p => p.id.toUpperCase() === normalizedCode);

      if (plotInBombo) {
        navigate(`/plot/${normalizedCode}?source=bombo`);
      } else if (plotInOther) {
        navigate(`/plot/${normalizedCode}?source=other`);
      } else {
        setError('Mã nền không tồn tại. Vui lòng kiểm tra lại.');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tra cứu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 transform scale-105 transition-transform duration-[20s] hover:scale-100"
        style={{ backgroundImage: `url(${PROJECT_HERO_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-center items-center px-4">
        <div className="text-center mb-10 animate-fade-in-up">
          <h2 className="text-gold-400 font-bold tracking-[0.2em] text-sm md:text-base mb-4 uppercase">
            Khu đô thị trẻ tương lai
          </h2>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-2xl">
            THÁI THÀNH BOM BO
          </h1>
          <p className="text-gray-200 text-lg md:text-xl max-w-2xl mx-auto font-light">
            Nơi Xứng Tầm Cho Bạn
          </p>
        </div>

        {/* Search Box */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-2xl animate-fade-in-up delay-200">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <label htmlFor="landCode" className="text-white text-sm font-semibold uppercase tracking-wider">
              Nhập mã nền đất
            </label>
            <div className="relative">
              <input
                id="landCode"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                }}
                placeholder="Ví dụ: H11"
                className="w-full bg-white/90 text-navy-900 px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400 font-bold text-lg placeholder-gray-400"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-2 bottom-2 bg-navy-900 text-white px-6 rounded-md hover:bg-gold-500 transition-colors font-medium disabled:bg-gray-500"
              >
                {isLoading ? '...' : 'Tra Cứu'}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2 bg-black/50 p-2 rounded text-center">
                {error}
              </p>
            )}
          </form>
          <div className="mt-6 flex justify-center space-x-4 text-xs text-gray-300">
            <span>• Dữ liệu thời gian thực</span>
            <span>• Chính xác</span>
          </div>
        </div>
      </div>
    </div>
  );
};