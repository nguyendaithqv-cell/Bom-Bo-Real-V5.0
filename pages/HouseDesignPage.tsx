import React, { useState, useRef } from 'react';
import { Palette, Upload, Image as ImageIcon, Wand2, RefreshCw, Download, Info, AlertCircle, CheckCircle2, Loader2, ArrowRight, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

type DesignMode = 'prompt' | 'land' | 'edit';

export const HouseDesignPage: React.FC = () => {
  const [mode, setMode] = useState<DesignMode>('prompt');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Hiện đại');
  const [floors, setFloors] = useState('2 tầng');
  const [roof, setRoof] = useState('Mái bằng');
  const [materials, setMaterials] = useState<string[]>(['Kính', 'Bê tông']);
  const [width, setWidth] = useState('5');
  const [depth, setDepth] = useState('15');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | 'auto'>('16:9');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const styles = ['Hiện đại', 'Tân cổ điển', 'Indochine', 'Tối giản', 'Địa Trung Hải', 'Công nghiệp', 'Truyền thống'];
  const floorOptions = ['1 tầng', '2 tầng', '3 tầng', '4 tầng', '5 tầng+'];
  const roofOptions = ['Mái bằng', 'Mái Thái', 'Mái Nhật', 'Mái Mansard', 'Mái lệch'];
  const materialOptions = ['Kính', 'Gỗ', 'Đá tự nhiên', 'Bê tông', 'Gạch trần', 'Kim loại'];

  const toggleMaterial = (mat: string) => {
    setMaterials(prev => prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]);
  };

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

  const generateDesign = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    // Cuộn xuống khu vực kết quả trên mobile
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let finalAspectRatio = aspectRatio === 'auto' ? '16:9' : aspectRatio;

      // Nếu chọn tự động và có ảnh gốc, cố gắng xác định tỷ lệ
      if (aspectRatio === 'auto' && baseImage) {
        try {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = baseImage;
          });
          const ratio = img.width / img.height;
          if (ratio > 1.2) finalAspectRatio = '16:9';
          else if (ratio < 0.8) finalAspectRatio = '9:16';
          else finalAspectRatio = '1:1';
        } catch (e) {
          console.warn('Không thể xác định tỷ lệ ảnh gốc, dùng mặc định 16:9');
        }
      }

      // Tối ưu hóa prompt: Tập trung vào các từ khóa mô tả hình ảnh thay vì hội thoại
      const visualPrompt = `
        Architectural visualization of a luxury house. 
        Style: ${style}. 
        Structure: ${floors}. 
        Roof: ${roof}. 
        Dimensions: Width ${width}m x Depth ${depth}m (Strictly follow this aspect ratio).
        Materials: ${materials.join(', ')}. 
        Additional details: ${prompt || 'Modern living space, airy and bright'}.
        Environment: Luxury neighborhood with lush landscaping, trees, and elegant garden.
        Lighting: Golden hour natural lighting, soft shadows, realistic reflections.
        Quality: Photorealistic, 8K resolution, architectural photography style, extremely detailed textures.
      `.trim();

      let contents: any;
      
      if (mode === 'prompt') {
        contents = {
          parts: [{ text: visualPrompt }]
        };
      } else if ((mode === 'land' || mode === 'edit') && baseImage) {
        const mimeType = baseImage.split(';')[0].split(':')[1] || 'image/jpeg';
        const base64Data = baseImage.split(',')[1];
        
        const instruction = mode === 'land' 
          ? `TASK: Architectural Inpainting.
             ORIGINAL PHOTO IS THE GROUND TRUTH: You MUST preserve 100% of the surrounding environment, including the sky, trees, background, and foreground elements from the original photo.
             ACTION: Only draw the house on the empty land area. Do NOT modify any other part of the image.
             PERSPECTIVE: Match the camera angle, lens focal length, and horizon line of the original photo perfectly.
             DIMENSIONS: The house footprint is exactly ${width}m wide by ${depth}m deep. Scale it accurately relative to the trees and objects in the photo.
             LIGHTING: Match the sun direction, color temperature, and shadow intensity of the original photo so the house looks like it was actually there.
             DESIGN SPECS: ${visualPrompt}.`
          : `Modify the house in this image using these new specs: ${visualPrompt}. 
             Maintain the original camera angle, lighting, and environmental context. Only transform the building's facade, materials, and architectural details.`;

        contents = {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: instruction }
          ]
        };
      } else {
        throw new Error('Vui lòng tải ảnh lên cho chức năng này.');
      }

      let response;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents,
            config: {
              imageConfig: {
                aspectRatio: finalAspectRatio as any,
              }
            }
          });
          break; // Thành công
        } catch (err: any) {
          let isRateLimit = false;
          try {
            const errorObj = JSON.parse(err.message);
            if (errorObj.error?.code === 429) isRateLimit = true;
          } catch (e) {
            if (err.message.includes('429')) isRateLimit = true;
          }

          if (isRateLimit && retries < maxRetries) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
            continue;
          }
          throw err;
        }
      }

      let foundImage = false;
      const candidate = response!.candidates?.[0];

      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('Yêu cầu của bạn bị từ chối do chính sách an toàn. Vui lòng thử mô tả khác.');
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        // Nếu không tìm thấy ảnh, kiểm tra xem có text phản hồi không để biết lý do
        const feedbackText = candidate?.content?.parts?.find(p => p.text)?.text;
        console.warn('AI Feedback:', feedbackText);
        throw new Error(feedbackText || 'Không thể tạo hình ảnh. Vui lòng thử lại với yêu cầu rõ ràng hơn.');
      }

    } catch (err: any) {
      console.error('Lỗi thiết kế:', err);
      setError(err.message || 'Đã có lỗi xảy ra trong quá trình thiết kế. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `thiet-ke-nha-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900 font-serif">Kiến Trúc Sư AI</h1>
        <p className="text-gray-500 mt-2">Thiết kế ngôi nhà mơ ước của bạn chỉ trong vài giây với trí tuệ nhân tạo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b">
              <Palette className="w-6 h-6 text-gold-500" />
              <h2 className="text-xl font-bold text-navy-900">Tùy chọn thiết kế</h2>
            </div>

            {/* Mode Selection */}
            <div className="grid grid-cols-1 gap-3 mb-8">
              <button
                onClick={() => { setMode('prompt'); setBaseImage(null); setGeneratedImage(null); }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  mode === 'prompt' ? 'bg-navy-900 border-navy-900 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode === 'prompt' ? 'bg-gold-500 text-navy-900' : 'bg-gray-100'}`}>
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Thiết kế từ yêu cầu</p>
                  <p className={`text-[10px] ${mode === 'prompt' ? 'text-gray-300' : 'text-gray-400'}`}>Mô tả ý tưởng của bạn bằng lời</p>
                </div>
              </button>

              <button
                onClick={() => { setMode('land'); setBaseImage(null); setGeneratedImage(null); }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  mode === 'land' ? 'bg-navy-900 border-navy-900 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode === 'land' ? 'bg-gold-500 text-navy-900' : 'bg-gray-100'}`}>
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Thiết kế trên nền đất</p>
                  <p className={`text-[10px] ${mode === 'land' ? 'text-gray-300' : 'text-gray-400'}`}>Tải ảnh mảnh đất và vẽ nhà lên đó</p>
                </div>
              </button>

              <button
                onClick={() => { setMode('edit'); setBaseImage(null); setGeneratedImage(null); }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  mode === 'edit' ? 'bg-navy-900 border-navy-900 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode === 'edit' ? 'bg-gold-500 text-navy-900' : 'bg-gray-100'}`}>
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Thay đổi thiết kế</p>
                  <p className={`text-[10px] ${mode === 'edit' ? 'text-gray-300' : 'text-gray-400'}`}>Cải tạo từ hình ảnh nhà có sẵn</p>
                </div>
              </button>
            </div>

            {/* Image Upload for Land/Edit modes */}
            {(mode === 'land' || mode === 'edit') && (
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  {mode === 'land' ? 'Tải ảnh nền đất' : 'Tải ảnh nhà hiện tại'}
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    baseImage ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:border-gold-400 bg-gray-50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  {baseImage ? (
                    <div className="relative group">
                      <img src={baseImage} alt="Base" className="max-h-48 mx-auto rounded-lg shadow-md" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <p className="text-white text-xs font-bold">Thay đổi ảnh</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-500 font-medium">Nhấp để tải ảnh lên</p>
                      <p className="text-[10px] text-gray-400">Hỗ trợ JPG, PNG (Tối đa 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Structured Options */}
            <div className="space-y-6 mb-8">
              {/* Style */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Phong cách kiến trúc</label>
                <div className="flex flex-wrap gap-2">
                  {styles.map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        style === s ? 'bg-gold-500 border-gold-500 text-navy-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floors & Roof */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Số tầng</label>
                  <select 
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-gold-500"
                  >
                    {floorOptions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Kiểu mái</label>
                  <select 
                    value={roof}
                    onChange={(e) => setRoof(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-gold-500"
                  >
                    {roofOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Chiều rộng đất (m)</label>
                  <input 
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="Ví dụ: 5"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Chiều dài đất (m)</label>
                  <input 
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    placeholder="Ví dụ: 15"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Tỷ lệ ảnh xuất ra</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '16:9', label: 'Ngang (16:9)' },
                    { id: '9:16', label: 'Dọc (9:16)' },
                    { id: '1:1', label: 'Vuông (1:1)' },
                    { id: 'auto', label: 'Tự động' }
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id as any)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                        aspectRatio === r.id ? 'bg-gold-500 border-gold-500 text-navy-900' : 'bg-white border-gray-200 text-gray-500 hover:border-gold-400'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Vật liệu chủ đạo</label>
                <div className="flex flex-wrap gap-2">
                  {materialOptions.map(m => (
                    <button
                      key={m}
                      onClick={() => toggleMaterial(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        materials.includes(m) ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gold-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-3">Yêu cầu bổ sung (Tùy chọn)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Có hồ bơi vô cực, sân vườn phong cách Nhật Bản, gara để được 2 ô tô..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all font-medium text-navy-900 h-24 resize-none text-sm"
              />
            </div>

            <button
              onClick={generateDesign}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-navy-900 hover:bg-gold-600'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang thiết kế...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Bắt đầu thiết kế
                </>
              )}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-navy-900 mb-1">Mẹo thiết kế hiệu quả:</h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
                  <li>Mô tả chi tiết về phong cách (Hiện đại, Cổ điển, Indochine...).</li>
                  <li>Đề cập đến vật liệu (Kính, Gỗ, Đá, Bê tông...).</li>
                  <li>Nêu rõ số tầng và các đặc điểm đặc biệt (Hồ bơi, Sân thượng...).</li>
                  <li>Với ảnh nền đất, hãy chọn góc chụp bao quát và rõ ràng.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-7" ref={resultRef}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-gold-500" />
                <h2 className="text-xl font-bold text-navy-900">Kết quả thiết kế</h2>
              </div>
              {generatedImage && (
                <button 
                  onClick={downloadImage}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-navy-900 rounded-lg hover:bg-gold-500 hover:text-white transition-all text-xs font-bold"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống
                </button>
              )}
            </div>

            <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] relative">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-4"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
                      <Wand2 className="w-8 h-8 text-gold-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <p className="text-navy-900 font-bold">Kiến trúc sư AI đang phác thảo...</p>
                      <p className="text-gray-400 text-xs mt-1 italic">Quá trình này có thể mất 10-20 giây</p>
                    </div>
                  </motion.div>
                ) : generatedImage ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full"
                  >
                    <img 
                      src={generatedImage} 
                      alt="Generated Design" 
                      className="w-full h-auto rounded-2xl shadow-2xl border border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <p className="text-sm text-emerald-800 font-medium">Thiết kế đã hoàn tất! Bạn có thể tải xuống hoặc yêu cầu thay đổi.</p>
                    </div>
                  </motion.div>
                ) : error ? (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-4"
                  >
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
                    <div className="max-w-xs">
                      <p className="text-red-600 font-bold">Rất tiếc, đã có lỗi xảy ra</p>
                      <p className="text-gray-500 text-xs mt-1">{error}</p>
                    </div>
                    <button 
                      onClick={generateDesign}
                      className="px-6 py-2 bg-navy-900 text-white rounded-lg font-bold text-xs"
                    >
                      Thử lại
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-6"
                  >
                    <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-gray-200">
                      <ImageIcon className="w-12 h-12 text-gray-200" />
                    </div>
                    <div className="max-w-xs">
                      <h3 className="text-lg font-bold text-gray-400">Chưa có thiết kế nào</h3>
                      <p className="text-gray-400 text-xs mt-2">Nhập yêu cầu và nhấn "Bắt đầu thiết kế" để thấy phép màu của AI</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Disclaimer */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                * Lưu ý: Hình ảnh được tạo bởi AI chỉ mang tính chất tham khảo ý tưởng kiến trúc. Để thi công thực tế, bạn cần có bản vẽ kỹ thuật chi tiết từ kiến trúc sư chuyên nghiệp và tuân thủ các quy định xây dựng tại địa phương.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
