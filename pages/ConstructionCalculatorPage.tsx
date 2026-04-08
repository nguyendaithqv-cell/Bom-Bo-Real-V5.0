import React, { useState, useMemo } from 'react';
import { Calculator, Home, Layers, Info, CheckCircle2, AlertCircle, Download, FileText, Table, ChevronRight, FileSpreadsheet, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Types
type FoundationType = 'single' | 'strip' | 'pile';
type RoofType = 'tin' | 'tile_steel' | 'tile_concrete' | 'concrete';
type PackageType = 'raw' | 'economy' | 'standard' | 'premium';
type HouseType = 'townhouse' | 'villa' | 'level4';

interface HouseTypeConfig {
  label: string;
  multiplier: number;
  description: string;
  allowedRoofs: RoofType[];
}

const houseTypeConfigs: Record<HouseType, HouseTypeConfig> = {
  townhouse: { 
    label: 'Nhà phố', 
    multiplier: 1.0, 
    description: 'Kiến trúc hiện đại, tối ưu diện tích',
    allowedRoofs: ['tin', 'tile_steel', 'concrete']
  },
  villa: { 
    label: 'Biệt thự', 
    multiplier: 1.3, 
    description: 'Kiến trúc phức tạp, sang trọng, yêu cầu kỹ thuật cao',
    allowedRoofs: ['tile_steel', 'tile_concrete', 'concrete']
  },
  level4: { 
    label: 'Nhà cấp 4', 
    multiplier: 0.85, 
    description: 'Nhà trệt, đơn giản, chi phí thấp',
    allowedRoofs: ['tin', 'tile_steel']
  },
};

interface MaterialItem {
  category: string;
  name: string;
  unit: string;
  quantity: number;
  estimatedCost: number;
  description: string;
}

interface ConstructionFactor {
  label: string;
  coefficient: number;
  description: string;
}

const foundationFactors: Record<FoundationType, ConstructionFactor> = {
  single: { label: 'Móng đơn', coefficient: 0.3, description: 'Phù hợp nền đất tốt, nhà thấp tầng' },
  strip: { label: 'Móng băng', coefficient: 0.5, description: 'Phổ biến, chịu lực tốt cho nhà phố' },
  pile: { label: 'Móng cọc', coefficient: 0.4, description: 'Dùng cho nền đất yếu hoặc nhà cao tầng' },
};

const roofFactors: Record<RoofType, ConstructionFactor> = {
  tin: { label: 'Mái tôn', coefficient: 0.3, description: 'Tiết kiệm chi phí, thi công nhanh' },
  tile_steel: { label: 'Mái ngói (kèo thép)', coefficient: 0.7, description: 'Thẩm mỹ cao, chống nóng tốt' },
  tile_concrete: { label: 'Mái ngói (đúc BTCT)', coefficient: 1.0, description: 'Bền vững nhất, chống thấm tuyệt đối' },
  concrete: { label: 'Mái bê tông phẳng', coefficient: 0.5, description: 'Tận dụng làm sân thượng, phơi đồ' },
};

const packagePrices: Record<PackageType, { label: string; price: number; description: string }> = {
  raw: { label: 'Xây dựng phần thô', price: 3800000, description: 'Bao gồm nhân công và vật tư thô (gạch, cát, đá, xi măng, sắt thép)' },
  economy: { label: 'Hoàn thiện tiết kiệm', price: 5200000, description: 'Vật tư hoàn thiện mức trung bình, phù hợp nhà cho thuê' },
  standard: { label: 'Hoàn thiện tiêu chuẩn', price: 6500000, description: 'Vật tư khá, thẩm mỹ tốt, phổ biến cho gia đình' },
  premium: { label: 'Hoàn thiện cao cấp', price: 8500000, description: 'Vật tư thương hiệu lớn, sang trọng, tinh tế' },
};

export const ConstructionCalculatorPage: React.FC = () => {
  // State
  const [houseType, setHouseType] = useState<HouseType>('townhouse');
  const [area, setArea] = useState<string>('100');
  const [floors, setFloors] = useState<string>('2');
  const [foundation, setFoundation] = useState<FoundationType>('strip');
  const [roof, setRoof] = useState<RoofType>('concrete');
  const [pkg, setPkg] = useState<PackageType>('standard');
  const [hasBasement, setHasBasement] = useState(false);

  // Reset roof if not allowed when house type changes
  React.useEffect(() => {
    const allowed = houseTypeConfigs[houseType].allowedRoofs;
    if (!allowed.includes(roof)) {
      setRoof(allowed[0]);
    }
    // Level 4 house usually has 1 floor
    if (houseType === 'level4') {
      setFloors('1');
    }
  }, [houseType]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(value)).replace('₫', 'đ');
  };

  const parseNumber = (value: string) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calculations
  const results = useMemo(() => {
    const baseArea = parseNumber(area);
    const numFloors = parseNumber(floors);
    
    if (baseArea <= 0 || numFloors <= 0) return null;

    const foundationArea = baseArea * foundationFactors[foundation].coefficient;
    const floorsArea = baseArea * numFloors;
    const roofArea = baseArea * roofFactors[roof].coefficient;
    const basementArea = hasBasement ? baseArea * 1.5 : 0; // Simplified basement calculation

    const totalArea = foundationArea + floorsArea + roofArea + basementArea;
    const unitPrice = packagePrices[pkg].price * houseTypeConfigs[houseType].multiplier;
    const totalCost = totalArea * unitPrice;

    return {
      foundationArea,
      floorsArea,
      roofArea,
      basementArea,
      totalArea,
      unitPrice,
      totalCost,
      breakdown: [
        { label: 'Diện tích móng', area: foundationArea, coefficient: foundationFactors[foundation].coefficient * 100 },
        { label: 'Diện tích các tầng', area: floorsArea, coefficient: 100 * numFloors },
        { label: 'Diện tích mái', area: roofArea, coefficient: roofFactors[roof].coefficient * 100 },
        ...(hasBasement ? [{ label: 'Diện tích hầm', area: basementArea, coefficient: 150 }] : []),
      ]
    };
  }, [area, floors, foundation, roof, pkg, hasBasement, houseType]);

  // Material Breakdown Calculation
  const materialBreakdown = useMemo(() => {
    if (!results) return [];
    
    const total = results.totalCost;
    const baseArea = parseNumber(area);
    const totalArea = results.totalArea;

    // Ratios for raw part (approximate)
    const rawRatio = 0.6; // 60% of total cost is usually raw for 'raw' package, or a portion of others
    const finishingRatio = 1 - rawRatio;

    const items: MaterialItem[] = [
      // PHẦN THÔ
      { category: 'Phần Thô', name: 'Sắt thép xây dựng', unit: 'kg', quantity: totalArea * 90, estimatedCost: total * 0.18, description: 'Thép Việt Nhật hoặc Pomina' },
      { category: 'Phần Thô', name: 'Xi măng', unit: 'Bao', quantity: totalArea * 8, estimatedCost: total * 0.08, description: 'Xi măng Insee hoặc Hà Tiên' },
      { category: 'Phần Thô', name: 'Gạch xây tường', unit: 'Viên', quantity: totalArea * 180, estimatedCost: total * 0.12, description: 'Gạch ống Tuynel 8x8x18' },
      { category: 'Phần Thô', name: 'Cát, đá các loại', unit: 'm3', quantity: totalArea * 1.5, estimatedCost: total * 0.07, description: 'Cát vàng, đá 1x2, đá 4x6' },
      { category: 'Phần Thô', name: 'Cốp pha, giàn giáo, vật tư phụ', unit: 'Gói', quantity: 1, estimatedCost: total * 0.03, description: 'Thuê cốp pha, xà gồ, đinh, kẽm buộc' },
      { category: 'Phần Thô', name: 'Hệ thống điện nước âm', unit: 'Gói', quantity: 1, estimatedCost: total * 0.05, description: 'Ống nhựa Bình Minh, dây điện Cadivi' },
      { category: 'Phần Thô', name: 'Nhân công xây thô', unit: 'm2', quantity: totalArea, estimatedCost: total * 0.1, description: 'Đội ngũ thợ lành nghề' },
    ];

    if (pkg !== 'raw') {
      // PHẦN HOÀN THIỆN
      items.push(
        { category: 'Hoàn Thiện', name: 'Gạch ốp lát', unit: 'm2', quantity: totalArea * 1.2, estimatedCost: total * 0.1, description: pkg === 'premium' ? 'Gạch nhập khẩu cao cấp' : 'Gạch Đồng Tâm/Viglacera' },
        { category: 'Hoàn Thiện', name: 'Trần thạch cao', unit: 'm2', quantity: totalArea * 0.9, estimatedCost: total * 0.04, description: 'Khung xương Vĩnh Tường, tấm Gyproc' },
        { category: 'Hoàn Thiện', name: 'Đá Granite (Bếp/Cầu thang)', unit: 'm2', quantity: totalArea * 0.15, estimatedCost: total * 0.05, description: 'Đá đen Kim Sa hoặc đá trắng Ấn Độ' },
        { category: 'Hoàn Thiện', name: 'Thiết bị vệ sinh', unit: 'Bộ', quantity: parseNumber(floors) + 1, estimatedCost: total * 0.08, description: pkg === 'premium' ? 'TOTO/Kohler' : 'Inax/Viglacera' },
        { category: 'Hoàn Thiện', name: 'Hệ thống cửa', unit: 'Bộ', quantity: parseNumber(floors) * 3 + 2, estimatedCost: total * 0.07, description: pkg === 'premium' ? 'Nhôm Xingfa nhập khẩu' : 'Nhôm kính tiêu chuẩn' },
        { category: 'Hoàn Thiện', name: 'Sơn nước (Lót & Phủ)', unit: 'm2', quantity: totalArea * 4, estimatedCost: total * 0.05, description: 'Sơn Dulux hoặc Jotun chính hãng' },
        { category: 'Hoàn Thiện', name: 'Thiết bị điện & Đèn chiếu sáng', unit: 'Gói', quantity: 1, estimatedCost: total * 0.04, description: 'Panasonic hoặc Schneider, đèn LED' },
        { category: 'Hoàn Thiện', name: 'Cầu thang & Lan can', unit: 'm', quantity: parseNumber(floors) * 4, estimatedCost: total * 0.06, description: 'Gỗ căm xe hoặc kính cường lực' }
      );
    }

    return items;
  }, [results, pkg, area, floors]);

  const handleExportPDF = () => {
    if (!results) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('DU TOAN CHI PHI XAY DUNG', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Loai nha: ${houseTypeConfigs[houseType].label}`, 14, 25);
    doc.text(`Dien tich san: ${area} m2`, 14, 32);
    doc.text(`So tang: ${floors}`, 14, 39);
    doc.text(`Loai mong: ${foundationFactors[foundation].label}`, 14, 46);
    doc.text(`Loai mai: ${roofFactors[roof].label}`, 14, 53);
    doc.text(`Goi xay dung: ${packagePrices[pkg].label}`, 14, 60);
    doc.text(`Tong dien tich xay dung: ${results.totalArea.toFixed(2)} m2`, 14, 67);
    doc.text(`Don gia: ${formatCurrency(results.unitPrice)}/m2`, 14, 74);
    doc.text(`TONG CHI PHI DU TOAN: ${formatCurrency(results.totalCost)}`, 14, 81);
    
    const tableColumn = ["Hang muc", "He so (%)", "Dien tich tinh (m2)"];
    const tableRows = results.breakdown.map(item => [
      item.label,
      `${item.coefficient}%`,
      `${item.area.toFixed(2)} m2`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 90,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 58, 138] }
    });

    doc.save('du_toan_xay_dung.pdf');
  };

  const handleExportExcel = () => {
    if (!results || materialBreakdown.length === 0) return;

    const wb = XLSX.utils.book_new();

    // 1. Sheet Tổng hợp & Thông số đầu vào
    const summaryData = [
      ['THÔNG SỐ DỰ TOÁN XÂY DỰNG'],
      [''],
      ['Thông số đầu vào'],
      ['Loại nhà', houseTypeConfigs[houseType].label],
      ['Diện tích sàn', `${area} m2`],
      ['Số tầng', floors],
      ['Loại móng', foundationFactors[foundation].label],
      ['Loại mái', roofFactors[roof].label],
      ['Gói xây dựng', packagePrices[pkg].label],
      ['Có hầm', hasBasement ? 'Có' : 'Không'],
      [''],
      ['Kết quả tính toán'],
      ['Tổng diện tích xây dựng', `${results.totalArea.toFixed(2)} m2`],
      ['Đơn giá áp dụng', `${results.unitPrice.toLocaleString('vi-VN')} đ/m2`],
      ['TỔNG CHI PHÍ DỰ TOÁN', `${results.totalCost.toLocaleString('vi-VN')} đ`],
      ['Thời gian thi công ước tính', `~ ${Math.ceil(parseNumber(floors) * 1.5 + 2)} tháng`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng hợp");

    // 2. Sheet Chi tiết diện tích
    const areaData = [
      ['Hạng mục', 'Hệ số (%)', 'Diện tích tính (m2)'],
      ...results.breakdown.map(item => [item.label, `${item.coefficient}%`, item.area.toFixed(2)])
    ];
    const wsArea = XLSX.utils.aoa_to_sheet(areaData);
    XLSX.utils.book_append_sheet(wb, wsArea, "Chi tiết diện tích");

    // 3. Sheet Bóc tách vật tư
    const materialData = materialBreakdown.map(item => ({
      'Nhóm': item.category,
      'Tên vật tư/Hạng mục': item.name,
      'Đơn vị': item.unit,
      'Số lượng': item.quantity.toLocaleString('vi-VN'),
      'Thành tiền dự toán (VNĐ)': Math.round(item.estimatedCost).toLocaleString('vi-VN'),
      'Ghi chú/Chủng loại': item.description
    }));
    const wsMaterial = XLSX.utils.json_to_sheet(materialData);
    XLSX.utils.book_append_sheet(wb, wsMaterial, "Bóc tách vật tư");

    XLSX.writeFile(wb, `Du_toan_xay_dung_${area}m2_${floors}tang.xlsx`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-gray-50 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 font-serif">Hoạch Toán Chi Phí Xây Nhà</h1>
          <p className="text-gray-500 mt-2">Công cụ dự toán chuyên nghiệp dựa trên diện tích và quy mô xây dựng</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md text-sm font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg hover:bg-gold-600 transition-colors shadow-md text-sm font-bold"
          >
            <Download className="w-4 h-4" />
            Xuất PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-8 pb-4 border-b">
              <Calculator className="w-6 h-6 text-gold-500" />
              <h2 className="text-xl font-bold text-navy-900">Thông số công trình</h2>
            </div>

            <div className="space-y-6">
              {/* House Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Loại công trình</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(houseTypeConfigs) as HouseType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setHouseType(type)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        houseType === type 
                          ? 'bg-navy-900 border-navy-900 text-white shadow-md' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                      }`}
                    >
                      <p className="font-bold text-xs">{houseTypeConfigs[type].label}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">{houseTypeConfigs[houseType].description}</p>
              </div>

              {/* Area & Floors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Diện tích sàn (m2)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all font-bold text-navy-900"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">m2</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Số tầng (lầu)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={floors}
                      disabled={houseType === 'level4'}
                      onChange={(e) => setFloors(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all font-bold text-navy-900 ${
                        houseType === 'level4' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-50 border-gray-200'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Tầng</span>
                  </div>
                </div>
              </div>

              {/* Foundation Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Loại móng</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(foundationFactors) as FoundationType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFoundation(type)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        foundation === type 
                          ? 'bg-navy-900 border-navy-900 text-white shadow-lg' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-bold text-sm">{foundationFactors[type].label}</p>
                        <p className={`text-[10px] ${foundation === type ? 'text-gray-300' : 'text-gray-400'}`}>
                          {foundationFactors[type].description}
                        </p>
                      </div>
                      <div className={`text-xs font-bold ${foundation === type ? 'text-gold-400' : 'text-navy-600'}`}>
                        +{foundationFactors[type].coefficient * 100}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Roof Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Loại mái (Phù hợp {houseTypeConfigs[houseType].label})</label>
                <div className="grid grid-cols-2 gap-2">
                  {houseTypeConfigs[houseType].allowedRoofs.map((type) => (
                    <button
                      key={type}
                      onClick={() => setRoof(type)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        roof === type 
                          ? 'bg-navy-900 border-navy-900 text-white shadow-md' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                      }`}
                    >
                      <p className="font-bold text-xs">{roofFactors[type].label}</p>
                      <p className={`text-[10px] font-bold mt-1 ${roof === type ? 'text-gold-400' : 'text-navy-600'}`}>
                        {roofFactors[type].coefficient * 100}%
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Gói xây dựng</label>
                <div className="space-y-2">
                  {(Object.keys(packagePrices) as PackageType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPkg(type)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        pkg === type 
                          ? 'bg-gold-50 border-gold-500 text-navy-900 shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        pkg === type ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {pkg === type ? <CheckCircle2 className="w-6 h-6" /> : <Layers className="w-5 h-5" />}
                      </div>
                      <div className="text-left flex-grow">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-sm">{packagePrices[type].label}</p>
                          <p className="font-black text-navy-900 text-xs">
                            {new Intl.NumberFormat('vi-VN').format(packagePrices[type].price / 1000000)}Tr/m2
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-tight">
                          {packagePrices[type].description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-7 space-y-6">
          {results ? (
            <>
              {/* Main Result Card */}
              <div className="bg-navy-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gold-500 rounded-full opacity-10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gold-500 rounded-lg text-navy-900">
                      <Home className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-gold-400 text-xs font-bold uppercase tracking-widest">Tổng chi phí dự toán</p>
                      <h3 className="text-4xl md:text-5xl font-black mt-1">
                        {formatCurrency(results.totalCost)}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                    <div>
                      <p className="text-white/50 text-[10px] font-bold uppercase">Tổng diện tích tính</p>
                      <p className="text-xl font-bold mt-1">{results.totalArea.toFixed(1)} <span className="text-xs">m2</span></p>
                    </div>
                    <div>
                      <p className="text-white/50 text-[10px] font-bold uppercase">Đơn giá áp dụng</p>
                      <p className="text-xl font-bold mt-1">{formatCurrency(results.unitPrice)}<span className="text-xs">/m2</span></p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-white/50 text-[10px] font-bold uppercase">Thời gian thi công</p>
                      <p className="text-xl font-bold mt-1">~ {Math.ceil(parseNumber(floors) * 1.5 + 2)} <span className="text-xs">Tháng</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Schedule Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b flex items-center justify-between">
                  <h3 className="font-bold text-navy-900 flex items-center gap-2">
                    <Table className="w-5 h-5 text-gold-500" />
                    Chi tiết diện tích xây dựng
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-6 py-4">Hạng mục</th>
                        <th className="px-6 py-4 text-center">Hệ số (%)</th>
                        <th className="px-6 py-4 text-right">Diện tích tính (m2)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {results.breakdown.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-navy-900">{item.label}</td>
                          <td className="px-6 py-4 text-center text-gray-500 font-medium">{item.coefficient}%</td>
                          <td className="px-6 py-4 text-right font-bold text-navy-900">{item.area.toFixed(2)} m2</td>
                        </tr>
                      ))}
                      <tr className="bg-navy-50/50">
                        <td colSpan={2} className="px-6 py-4 font-black text-navy-900 text-right">Tổng diện tích xây dựng:</td>
                        <td className="px-6 py-4 text-right font-black text-gold-600 text-lg">{results.totalArea.toFixed(2)} m2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Material Breakdown Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b flex items-center justify-between bg-navy-900 text-white">
                  <h3 className="font-bold flex items-center gap-2">
                    <List className="w-5 h-5 text-gold-400" />
                    Bóc tách vật tư & Hạng mục chi tiết
                  </h3>
                  <span className="text-[10px] bg-gold-500 text-navy-900 px-2 py-1 rounded-full font-bold">ƯỚC TÍNH</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-6 py-4">Vật tư / Hạng mục</th>
                        <th className="px-6 py-4 text-center">Đơn vị</th>
                        <th className="px-6 py-4 text-center">Số lượng</th>
                        <th className="px-6 py-4 text-right">Thành tiền (đ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Group by Category */}
                      {['Phần Thô', 'Hoàn Thiện'].map(cat => {
                        const catItems = materialBreakdown.filter(i => i.category === cat);
                        if (catItems.length === 0) return null;
                        return (
                          <React.Fragment key={cat}>
                            <tr className="bg-gray-100/50">
                              <td colSpan={4} className="px-6 py-2 font-black text-navy-900 text-xs uppercase tracking-wider">{cat}</td>
                            </tr>
                            {catItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3">
                                  <p className="font-bold text-navy-900">{item.name}</p>
                                  <p className="text-[10px] text-gray-400 italic">{item.description}</p>
                                </td>
                                <td className="px-6 py-3 text-center text-gray-500">{item.unit}</td>
                                <td className="px-6 py-3 text-center font-medium text-navy-700">
                                  {item.quantity.toLocaleString('vi-VN')}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-navy-900">{formatCurrency(item.estimatedCost)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Professional Advice */}
              <div className="bg-gold-50 border border-gold-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gold-500 rounded-xl text-white shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-bold text-navy-900">Lời khuyên từ chuyên gia xây dựng:</h4>
                    <ul className="space-y-2">
                      <li className="text-xs text-navy-800 flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                        Dự toán trên đã bao gồm chi phí vật tư và nhân công theo gói bạn chọn, nhưng chưa bao gồm chi phí ép cọc (nếu móng cọc) và các chi phí pháp lý, hoàn công.
                      </li>
                      <li className="text-xs text-navy-800 flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                        Nên dự phòng khoảng 5-10% chi phí phát sinh cho các hạng mục trang trí hoặc thay đổi vật tư trong quá trình thi công.
                      </li>
                      <li className="text-xs text-navy-800 flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                        Nếu xây dựng ở hẻm nhỏ hoặc địa hình khó khăn, đơn giá có thể tăng thêm 10-15% do chi phí vận chuyển vật tư thủ công.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Calculator className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-400">Vui lòng nhập diện tích và số tầng</h3>
              <p className="text-gray-400 mt-2 max-w-xs">Hệ thống sẽ tự động tính toán chi phí ngay khi bạn nhập thông số</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
