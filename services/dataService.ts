import { LandPlot, Direction, LegalStatus } from '../types';
import { GOOGLE_SHEET_CSV_URL, SAMPLE_PLOTS } from '../constants';
import { parseCSV } from '../utils/csvParser';

let cachedPlots: LandPlot[] | null = null;

export const fetchLandPlots = async (): Promise<LandPlot[]> => {
  if (cachedPlots) return cachedPlots;

  // Nếu chưa cấu hình URL, dùng ngay dữ liệu mẫu
  if (!GOOGLE_SHEET_CSV_URL || GOOGLE_SHEET_CSV_URL.trim() === "") {
    return SAMPLE_PLOTS;
  }

  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();

    // KIỂM TRA QUAN TRỌNG:
    // Nếu Google Sheet chưa được Public, nó sẽ trả về mã HTML của trang đăng nhập Google thay vì CSV.
    if (csvText.trim().startsWith("<!DOCTYPE html") || csvText.includes("<html")) {
        console.error("Lỗi: Link Google Sheet chưa được Public hoặc sai định dạng. Vui lòng kiểm tra quyền truy cập 'Anyone with the link'.");
        return SAMPLE_PLOTS; // Fallback an toàn để web không bị trắng trang
    }

    const rawData = parseCSV(csvText);

    const parseNumber = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      let str = String(val).trim().toLowerCase();
      
      let multiplier = 1;
      if (str.includes('tỷ') || str.includes('ty')) {
        multiplier = 1000000000;
        str = str.replace(/tỷ|ty/g, '');
      } else if (str.includes('triệu') || str.includes('trieu') || str.includes('tr')) {
        multiplier = 1000000;
        str = str.replace(/triệu|trieu|tr/g, '');
      }

      // Remove all spaces
      str = str.replace(/\s/g, '');
      
      // If it looks like a number with thousands separators (e.g. 600.000.000 or 600,000,000)
      if ((str.match(/\./g) || []).length > 1) str = str.replace(/\./g, '');
      if ((str.match(/,/g) || []).length > 1) str = str.replace(/,/g, '');
      // If there's one dot and 3 digits after it, it's likely a thousands separator
      if (/^\d+\.\d{3}$/.test(str)) str = str.replace(/\./g, '');
      // If there's one comma and 3 digits after it, it's likely a thousands separator
      if (/^\d+,\d{3}$/.test(str)) str = str.replace(/,/g, '');
      // Replace remaining comma with dot for decimal parsing
      str = str.replace(/,/g, '.');
      
      // Remove any remaining non-digit/dot characters
      str = str.replace(/[^\d.-]/g, '');

      const num = Number(str);
      return isNaN(num) ? 0 : num * multiplier;
    };

    // Map raw CSV data to Typescript Interface
    const plots: LandPlot[] = rawData.map((row: any) => ({
      id: row.id ? row.id.toString().trim() : "UNKNOWN",
      area: parseNumber(row.area),
      pricePerM2: parseNumber(row.pricePerM2),
      totalPrice: parseNumber(row.totalPrice),
      direction: (row.direction as Direction) || Direction.North,
      legal: (row.legal as LegalStatus) || LegalStatus.Waiting,
      description: row.description || "",
      // Tách chuỗi ảnh bằng dấu phẩy hoặc xuống dòng
      images: row.images ? row.images.split(/,|\n/).map((s: string) => s.trim().replace(/^"|"$/g, '')).filter((s: string) => s.length > 0) : [],
      features: row.features ? row.features.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [],
      status: row.status || 'Available',
      coordinates: { lat: 0, lng: 0 },
      linkmap: row.linkmap ? row.linkmap.trim() : undefined,
      phankhu: row.phankhu ? row.phankhu.trim() : undefined,
      duan: row.duan ? row.duan.trim() : undefined,
      size: row.size ? row.size.trim() : undefined,
      logioi: row.logioi ? row.logioi.trim() : undefined,
      loai: row.loai ? row.loai.trim() : undefined,
      cdt: row.cdt ? row.cdt.trim() : undefined
    }));

    if (plots.length > 0) {
        cachedPlots = plots;
        return plots;
    } else {
        return SAMPLE_PLOTS; 
    }
  } catch (error) {
    console.warn("Không tải được dữ liệu từ Google Sheets (đang dùng dữ liệu mẫu):", error);
    return SAMPLE_PLOTS; 
  }
};

export const getPlotById = async (id: string): Promise<LandPlot | undefined> => {
  const plots = await fetchLandPlots();
  return plots.find(p => p.id.toUpperCase() === id.toUpperCase());
};