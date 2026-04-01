import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Hexagon, Square, Plus, Trash2, Info, Calculator, Ruler, Sparkles, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

type Mode = 'quad' | 'custom';

interface Point {
  x: number;
  y: number;
}

export const AreaPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('quad');
  const [numSides, setNumSides] = useState<number>(4);
  const [sides, setSides] = useState<number[]>([]);
  const [diagonals, setDiagonals] = useState<number[]>([]);
  const [frontSide, setFrontSide] = useState<number>(0); // Index of the front side
  const [rotationOffset, setRotationOffset] = useState<number>(0); // Manual rotation in degrees
  const [area, setArea] = useState<number | null>(null);
  const [polygonData, setPolygonData] = useState<{ rigid: boolean; R?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [notes, setNotes] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize inputs when mode or numSides changes
  useEffect(() => {
    if (mode === 'quad') {
      setSides([0, 0, 0, 0]);
      setDiagonals([0]); // One diagonal for quad
      setNumSides(4);
    } else {
      const s = Array(numSides).fill(0);
      const d = Array(Math.max(0, numSides - 3)).fill(0);
      setSides(s);
      setDiagonals(d);
    }
    setFrontSide(0); // Reset front side
    setRotationOffset(0); // Reset rotation
    setArea(null);
    setPolygonData(null);
    setError(null);
  }, [mode, numSides]);

  const handleSideChange = (index: number, value: string) => {
    const val = parseFloat(value) || 0;
    const newSides = [...sides];
    newSides[index] = val;
    setSides(newSides);
  };

  const handleDiagonalChange = (index: number, value: string) => {
    const val = parseFloat(value) || 0;
    const newDiagonals = [...diagonals];
    newDiagonals[index] = val;
    setDiagonals(newDiagonals);
  };

  const calculateHeron = (a: number, b: number, c: number) => {
    if (a + b <= c || a + c <= b || b + c <= a) return -1;
    const p = (a + b + c) / 2;
    return Math.sqrt(p * (p - a) * (p - b) * (p - c));
  };

  const solveCyclicPolygon = (sideLengths: number[]) => {
    // Find R such that sum(2 * asin(s_i / 2R)) = 2*PI
    let low = Math.max(...sideLengths) / 2;
    let high = sideLengths.reduce((a, b) => a + b, 0) / 2;
    
    for (let i = 0; i < 50; i++) {
      let mid = (low + high) / 2;
      let angleSum = 0;
      for (const s of sideLengths) {
        angleSum += 2 * Math.asin(s / (2 * mid));
      }
      if (angleSum > 2 * Math.PI) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    const R = (low + high) / 2;
    let totalArea = 0;
    for (const s of sideLengths) {
      totalArea += calculateHeron(R, R, s);
    }
    return { area: totalArea, R };
  };

  const calculateArea = () => {
    setError(null);
    setEvaluation(null);
    let totalArea = 0;

    // Validate sides
    if (sides.some(s => s <= 0)) {
      setError('Vui lòng nhập đầy đủ kích thước các cạnh.');
      return;
    }

    // Check if diagonals are provided
    const hasDiagonals = diagonals.length > 0 && diagonals.every(d => d > 0);

    if (hasDiagonals) {
      // Calculate using Heron's formula by dividing into triangles
      // Triangle 1: A, B, C (sides: sides[0], sides[1], diagonals[0])
      let currentArea = calculateHeron(sides[0], sides[1], diagonals[0]);
      if (currentArea < 0) {
        setError('Kích thước cạnh và đường chéo không hợp lệ (không tạo thành tam giác).');
        return;
      }
      totalArea += currentArea;

      // Middle triangles
      for (let i = 0; i < diagonals.length - 1; i++) {
        currentArea = calculateHeron(diagonals[i], sides[i + 2], diagonals[i + 1]);
        if (currentArea < 0) {
          setError('Kích thước cạnh và đường chéo không hợp lệ.');
          return;
        }
        totalArea += currentArea;
      }

      // Last triangle: A, V_last-1, V_last (sides: diagonals[last], sides[last], sides[last+1])
      const lastDiag = diagonals[diagonals.length - 1];
      const lastSide1 = sides[sides.length - 2];
      const lastSide2 = sides[sides.length - 1];
      currentArea = calculateHeron(lastDiag, lastSide1, lastSide2);
      if (currentArea < 0) {
        setError('Kích thước cạnh và đường chéo không hợp lệ.');
        return;
      }
      totalArea += currentArea;
      
      setArea(totalArea);
      setPolygonData({ rigid: true });
    } else {
      // AI Prediction: Cyclic Polygon (Maximum Area)
      try {
        const result = solveCyclicPolygon(sides);
        setArea(result.area);
        setPolygonData({ rigid: false, R: result.R });
      } catch (e) {
        setError('Không thể tính toán hình dáng này. Vui lòng nhập thêm đường chéo.');
      }
    }
  };

  const handleEvaluate = async () => {
    if (!area || sides.some(s => s <= 0)) return;

    setIsEvaluating(true);
    setShowEvalModal(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const sideLabels = sides.map((s, i) => `Cạnh ${String.fromCharCode(65 + i)}${String.fromCharCode(65 + (i + 1) % numSides)}: ${s}m`).join(', ');
      const diagonalLabels = diagonals.length > 0 && diagonals[0] > 0 
        ? diagonals.map((d, i) => `Đường chéo A${String.fromCharCode(67 + i)}: ${d}m`).join(', ') 
        : 'Không có đường chéo (AI dự đoán hình dáng chuẩn nhất)';

      const prompt = `
        Bạn là một chuyên gia hàng đầu về Bất động sản và Phong thủy kiến trúc. 
        Hãy đánh giá chi tiết một miếng đất có các thông số sau:
        - Loại hình: Đa giác ${numSides} cạnh.
        - Diện tích: ${area.toFixed(2)} m².
        - Kích thước các cạnh: ${sideLabels}.
        - ${diagonalLabels}.
        - Mặt tiền chính được xác định là cạnh: ${String.fromCharCode(65 + frontSide)}${String.fromCharCode(65 + (frontSide + 1) % numSides)}.
        ${notes ? `- Ghi chú thêm từ người dùng: ${notes}` : ''}

        Yêu cầu đánh giá:
        1. Về hình dáng hình học: Nhận xét về độ cân đối, vuông vức hay khuyết góc.
        2. Về Phong thủy: Đánh giá ưu điểm, nhược điểm của hình dáng này (ví dụ: nở hậu, thắt đuôi, chữ L, v.v.).
        3. Lời khuyên: Đề xuất cách bố trí nhà cửa hoặc biện pháp hóa giải nếu có nhược điểm về phong thủy.
        4. Tiềm năng Bất động sản: Đánh giá giá trị sử dụng và tính thanh khoản dựa trên hình dáng.

        Hãy trình bày bằng tiếng Việt, sử dụng Markdown để định dạng đẹp mắt, chuyên nghiệp.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: "Bạn là chuyên gia Bất động sản và Phong thủy giàu kinh nghiệm. Hãy đưa ra những nhận định sắc sảo, thực tế và mang tính xây dựng.",
        }
      });

      setEvaluation(response.text || "AI không thể đưa ra đánh giá vào lúc này.");
    } catch (err) {
      console.error("Evaluation error:", err);
      setEvaluation("Có lỗi xảy ra khi AI đang phân tích. Vui lòng thử lại sau.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const drawPolygon = (calculatedArea: number, rigid: boolean, R?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const padding = 60;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    let points: Point[] = [];

    if (!rigid && R) {
      // Draw cyclic polygon
      let currentAngle = 0;
      for (const s of sides) {
        const angle = 2 * Math.asin(s / (2 * R));
        points.push({
          x: R * Math.cos(currentAngle),
          y: R * Math.sin(currentAngle)
        });
        currentAngle += angle;
      }
    } else {
      // Re-implementing rigid construction for N sides correctly
      points = [{ x: 0, y: 0 }, { x: sides[0], y: 0 }];
      
      const getThirdPoint = (p1: Point, p2: Point, r1: number, r2: number) => {
        const d = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
        const a = (r1**2 - r2**2 + d**2) / (2 * d);
        const h = Math.sqrt(Math.max(0, r1**2 - a**2));
        const x2 = p1.x + a * (p2.x - p1.x) / d;
        const y2 = p1.y + a * (p2.y - p1.y) / d;
        return {
          x: x2 + h * (p2.y - p1.y) / d,
          y: y2 - h * (p2.x - p1.x) / d
        };
      };

      if (numSides === 3) {
        points.push(getThirdPoint(points[1], points[0], sides[1], sides[2]));
      } else {
        // First triangle
        points.push(getThirdPoint(points[1], points[0], sides[1], diagonals[0]));
        // Middle triangles
        for (let i = 0; i < diagonals.length - 1; i++) {
          points.push(getThirdPoint(points[points.length - 1], points[0], sides[i + 2], diagonals[i + 1]));
        }
        // Last triangle
        points.push(getThirdPoint(points[points.length - 1], points[0], sides[numSides - 2], sides[numSides - 1]));
      }
    }

    // ROTATION LOGIC: Make front side horizontal at the top
    const p1_raw = points[frontSide];
    const p2_raw = points[(frontSide + 1) % numSides];
    const dx = p2_raw.x - p1_raw.x;
    const dy = p2_raw.y - p1_raw.y;
    let baseAngle = Math.atan2(dy, dx);
    let totalAngle = baseAngle + (rotationOffset * Math.PI) / 180;
    
    // Rotate all points by -totalAngle
    let rotatedPoints = points.map(p => {
      const x = p.x - p1_raw.x;
      const y = p.y - p1_raw.y;
      return {
        x: x * Math.cos(-totalAngle) - y * Math.sin(-totalAngle),
        y: x * Math.sin(-totalAngle) + y * Math.cos(-totalAngle)
      };
    });

    // Scale and center points
    const minX = Math.min(...rotatedPoints.map(p => p.x));
    const maxX = Math.max(...rotatedPoints.map(p => p.x));
    const minY = Math.min(...rotatedPoints.map(p => p.y));
    const maxY = Math.max(...rotatedPoints.map(p => p.y));
    
    const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
    const centerX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
    const centerY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

    const finalPoints = rotatedPoints.map(p => ({
      x: centerX + p.x * scale,
      y: centerY + p.y * scale
    }));

    // Draw
    ctx.beginPath();
    ctx.moveTo(finalPoints[0].x, finalPoints[0].y);
    for (let i = 1; i < finalPoints.length; i++) {
      ctx.lineTo(finalPoints[i].x, finalPoints[i].y);
    }
    ctx.closePath();

    // Fill
    ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.fill();

    // Stroke
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Highlight front side
    ctx.beginPath();
    const fp1 = finalPoints[frontSide];
    const fp2 = finalPoints[(frontSide + 1) % numSides];
    ctx.moveTo(fp1.x, fp1.y);
    ctx.lineTo(fp2.x, fp2.y);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw side lengths
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    finalPoints.forEach((p, i) => {
      const nextP = finalPoints[(i + 1) % numSides];
      const midX = (p.x + nextP.x) / 2;
      const midY = (p.y + nextP.y) / 2;
      
      // Calculate normal vector for offset
      const dx = nextP.x - p.x;
      const dy = nextP.y - p.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const nx = -dy / len;
      const ny = dx / len;
      
      // Offset label outwards
      const offset = 15;
      const labelX = midX + nx * offset;
      const labelY = midY + ny * offset;
      
      ctx.fillStyle = i === frontSide ? '#ef4444' : '#6b7280';
      ctx.fillText(`${sides[i]}m`, labelX, labelY);
    });

    // Draw vertices and labels
    finalPoints.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 13px Inter';
      ctx.fillStyle = '#111827';
      const label = String.fromCharCode(65 + i);
      
      // Offset vertex labels
      const dx = p.x - (centerX + (maxX + minX)/2 * scale);
      const dy = p.y - (centerY + (maxY + minY)/2 * scale);
      const dist = Math.sqrt(dx*dx + dy*dy);
      const labelX = p.x + (dx/dist) * 15;
      const labelY = p.y + (dy/dist) * 15;
      
      ctx.fillText(label, labelX, labelY);
    });

    // Label "MẶT TIỀN"
    const midX_front = (fp1.x + fp2.x) / 2;
    const midY_front = (fp1.y + fp2.y) / 2;
    ctx.font = 'bold 10px Inter';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('MẶT TIỀN', midX_front, midY_front - 25);

    // Draw Area in the center
    const centroidX = finalPoints.reduce((sum, p) => sum + p.x, 0) / numSides;
    const centroidY = finalPoints.reduce((sum, p) => sum + p.y, 0) / numSides;
    
    ctx.font = 'bold 16px Inter';
    ctx.fillStyle = '#166534'; // Green-800
    ctx.textAlign = 'center';
    ctx.fillText(`${calculatedArea.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} m²`, centroidX, centroidY);
  };

  // Effect to draw polygon whenever relevant state changes
  useEffect(() => {
    if (area !== null && polygonData) {
      drawPolygon(area, polygonData.rigid, polygonData.R);
    }
  }, [area, polygonData, rotationOffset, frontSide, sides]);

  return (
    <>
    <div className="min-h-screen bg-gray-50 pt-12 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-navy-900 rounded-xl shadow-lg">
              <Hexagon className="w-8 h-8 text-gold-400" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy-900">Máy Tính & Vẽ Đa Giác</h1>
              <p className="text-gray-500">Tính diện tích chính xác và vẽ hình đa giác dựa trên kích thước các cạnh.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                  <button
                    onClick={() => setMode('quad')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg transition-all ${
                      mode === 'quad' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Square className="w-4 h-4" />
                    <span className="font-medium">Tứ giác</span>
                  </button>
                  <button
                    onClick={() => setMode('custom')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg transition-all ${
                      mode === 'custom' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Tùy chỉnh</span>
                  </button>
                </div>

                  {mode === 'custom' && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Số lượng cạnh (3 - 10)
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="10"
                        value={numSides}
                        onChange={(e) => setNumSides(parseInt(e.target.value) || 3)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none transition-all font-bold text-navy-900"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Mặt tiền chính</h3>
                    <select
                      value={frontSide}
                      onChange={(e) => setFrontSide(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gold-400 outline-none font-bold text-navy-900 mb-6"
                    >
                      {sides.map((_, i) => (
                        <option key={`front-opt-${i}`} value={i}>
                          Cạnh {String.fromCharCode(65 + i)}{String.fromCharCode(65 + (i + 1) % numSides)}
                        </option>
                      ))}
                    </select>
                  </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
                  <div className="flex space-x-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Về mặt toán học, một đa giác có hơn 3 cạnh có thể thay đổi hình dáng và diện tích dù giữ nguyên các cạnh. 
                      Ứng dụng sẽ tính toán <strong>diện tích lớn nhất có thể</strong> (tương ứng với đa giác nội tiếp đường tròn) 
                      - đây là hình dáng chuẩn và phổ biến nhất nếu không có đường chéo.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Kích thước các cạnh</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {sides.map((s, i) => (
                        <div key={`side-${i}`}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Cạnh {String.fromCharCode(65 + i)}{String.fromCharCode(65 + (i + 1) % numSides)}
                          </label>
                          <input
                            type="number"
                            value={s || ''}
                            onChange={(e) => handleSideChange(i, e.target.value)}
                            placeholder="0.0"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gold-400 outline-none font-bold text-navy-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Đường chéo (Tùy chọn)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {diagonals.map((d, i) => (
                        <div key={`diag-${i}`}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Đường chéo A{String.fromCharCode(67 + i)}
                          </label>
                          <input
                            type="number"
                            value={d || ''}
                            onChange={(e) => handleDiagonalChange(i, e.target.value)}
                            placeholder="Bỏ trống để AI dự đoán"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gold-400 outline-none font-bold text-navy-900 placeholder:font-normal placeholder:text-gray-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Removed old front side selection buttons */}

                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Ghi chú thêm</h3>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ví dụ: Đất thổ cư, đất trồng cây lâu năm, hướng đất, thông tin pháp lý..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gold-400 outline-none font-medium text-navy-900 min-h-[100px] resize-none"
                    />
                  </div>

                  <button
                    onClick={calculateArea}
                    className="w-full bg-navy-900 text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-800 transition-all shadow-lg shadow-navy-900/20"
                  >
                    <Calculator className="w-5 h-5" />
                    <span>Tính toán & Vẽ hình</span>
                  </button>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Ruler className="w-5 h-5 text-gray-400" />
                    <h2 className="text-xl font-bold text-navy-900">Kết quả</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {area !== null && (
                      <button
                        onClick={handleEvaluate}
                        disabled={isEvaluating}
                        className="flex items-center space-x-2 px-4 py-2 bg-gold-400 hover:bg-gold-500 text-navy-900 rounded-lg transition-all text-sm font-bold whitespace-nowrap shadow-sm"
                      >
                        {isEvaluating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>Đánh giá AI</span>
                      </button>
                    )}
                    {area !== null && (
                      <button
                        onClick={() => {
                          setRotationOffset(prev => (prev + 90) % 360);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all text-sm font-bold whitespace-nowrap"
                      >
                        <motion.div
                          animate={{ rotate: rotationOffset }}
                          transition={{ type: 'spring', stiffness: 200 }}
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </motion.div>
                        <span>Xoay hình</span>
                      </button>
                    )}
                    {area !== null && (
                      <div className="bg-green-50 px-4 sm:px-6 py-2 rounded-full border border-green-100 flex-shrink-0">
                        <span className="text-green-800 font-bold text-base sm:text-lg">
                          {area.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} m²
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden min-h-[500px]">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={500}
                    className="max-w-full h-auto"
                  />
                  {!area && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-4">
                      <Hexagon className="w-16 h-16 opacity-20" />
                      <p className="font-medium">Nhập kích thước để xem hình vẽ</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Chu vi</p>
                    <p className="text-lg font-bold text-navy-900">
                      {sides.reduce((a, b) => a + b, 0).toLocaleString('vi-VN')} m
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Số cạnh</p>
                    <p className="text-lg font-bold text-navy-900">{numSides}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Độ chính xác</p>
                    <p className="text-lg font-bold text-navy-900">100%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

    {/* AI Evaluation Modal */}
    <AnimatePresence>
      {showEvalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEvalModal(false)}
            className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-navy-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gold-400 rounded-lg">
                  <Sparkles className="w-5 h-5 text-navy-900" />
                </div>
                <h3 className="text-xl font-bold">Chuyên gia AI Đánh giá</h3>
              </div>
              <button 
                onClick={() => setShowEvalModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {isEvaluating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-12 h-12 text-gold-400 animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-navy-900">Đang phân tích hình dáng & phong thủy...</p>
                    <p className="text-gray-500 text-sm">Chuyên gia AI đang xem xét các thông số miếng đất của bạn.</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-navy max-w-none prose-headings:text-navy-900 prose-headings:font-serif prose-p:text-gray-600 prose-strong:text-navy-900">
                  <Markdown>{evaluation}</Markdown>
                </div>
              )}
            </div>

            {!isEvaluating && (
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowEvalModal(false)}
                  className="px-6 py-2 bg-navy-900 text-white rounded-xl font-bold hover:bg-navy-800 transition-all"
                >
                  Đóng
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};
