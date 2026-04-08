import React, { useState, useRef } from 'react';
import { BrainCircuit, Upload, Loader2, Info, Home, Ruler, Calculator, Wand2, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const RealEstateExpertPage: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBaseImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeHouse = async () => {
    if (!baseImage) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const mimeType = baseImage.split(';')[0].split(':')[1] || 'image/jpeg';
      const base64Data = baseImage.split(',')[1];

      const prompt = `
        Bạn là chuyên gia Bất động sản và Kiến trúc sư xây dựng.
        Hãy phân tích bức ảnh ngôi nhà này và trả về kết quả dưới dạng JSON cấu trúc sau để hiển thị trên giao diện:
        {
          "phongThuy": { "danhGia": "...", "diemManh": "...", "diemYeu": "..." },
          "xayDung": { "tinhTrang": "...", "vatLieu": "...", "ketCau": "..." },
          "chiPhi": { "chiTiet": [{ "hangMuc": "...", "gia": "..." }], "tong": "..." },
          "goiY": ["...", "..."]
        }
        LƯU Ý QUAN TRỌNG VỀ CHI PHÍ:
        - Phân tích quy mô thực tế của ngôi nhà trong ảnh (đừng thổi phồng chi phí).
        - Đưa ra mức giá xây dựng thực tế tại Việt Nam cho quy mô này (ví dụ: nhà phố, biệt thự nhỏ).
        - Tổng chi phí phải hợp lý, không được cao quá mức cần thiết.
        Chỉ trả về JSON, không giải thích thêm.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt }
          ]
        }
      });

      const text = response.text || '{}';
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
      setAnalysis(JSON.parse(jsonStr));
    } catch (err: any) {
      console.error('Lỗi phân tích:', err);
      setError('Đã có lỗi xảy ra trong quá trình phân tích. Vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl bg-gray-50 min-h-screen">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-navy-900 font-serif">Chuẩn đoán BĐS</h1>
        <p className="text-gray-500 mt-2">Phân tích chuyên sâu, định giá và gợi ý cải tạo ngôi nhà của bạn</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <label className="block text-sm font-bold text-gray-700 mb-3">Tải ảnh ngôi nhà</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                baseImage ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:border-gold-400 bg-gray-50'
              }`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              {baseImage ? (
                <img src={baseImage} alt="Base" className="max-h-48 mx-auto rounded-lg shadow-md" />
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-500 font-medium">Nhấp để tải ảnh</p>
                </div>
              )}
            </div>
            <button
              onClick={analyzeHouse}
              disabled={isAnalyzing || !baseImage}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                isAnalyzing || !baseImage ? 'bg-gray-400 cursor-not-allowed' : 'bg-navy-900 hover:bg-gold-600'
              }`}
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
              {isAnalyzing ? 'Đang phân tích...' : 'Bắt đầu phân tích'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {analysis ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2"><Home className="w-5 h-5 text-gold-500"/> Phong thủy</h3>
                  <p className="text-sm text-gray-600 mb-2"><strong>Đánh giá:</strong> {analysis.phongThuy.danhGia}</p>
                  <p className="text-sm text-emerald-600 mb-1"><strong>+</strong> {analysis.phongThuy.diemManh}</p>
                  <p className="text-sm text-red-600"><strong>-</strong> {analysis.phongThuy.diemYeu}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2"><Ruler className="w-5 h-5 text-gold-500"/> Xây dựng</h3>
                  <p className="text-sm text-gray-600 mb-2"><strong>Tình trạng:</strong> {analysis.xayDung.tinhTrang}</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Vật liệu:</strong> {analysis.xayDung.vatLieu}</p>
                  <p className="text-sm text-gray-600"><strong>Kết cấu:</strong> {analysis.xayDung.ketCau}</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-gold-500"/> Dự toán chi phí</h3>
                <div className="space-y-2">
                  {analysis.chiPhi.chiTiet.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-1">
                      <span className="text-gray-600">{item.hangMuc}</span>
                      <span className="font-bold text-navy-900">{item.gia}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-lg font-bold text-gold-600 pt-2">
                    <span>Tổng cộng</span>
                    <span>{analysis.chiPhi.tong}</span>
                  </div>
                </div>
              </div>

              <div className="bg-navy-900 p-6 rounded-2xl text-white">
                <h3 className="font-bold text-gold-400 mb-4 flex items-center gap-2"><Wand2 className="w-5 h-5"/> Gợi ý cải thiện</h3>
                <ul className="space-y-2">
                  {analysis.goiY.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2">
                      <CheckCircle2 className="w-5 h-5 text-gold-500 shrink-0"/> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-8 rounded-2xl text-center border border-red-100">{error}</div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-400">
              <BrainCircuit className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p>Tải ảnh và nhấn "Bắt đầu phân tích" để nhận báo cáo chuyên gia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
