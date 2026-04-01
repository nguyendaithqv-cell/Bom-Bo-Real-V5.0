import { GoogleGenAI } from "@google/genai";
import { LandPlot } from "../types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const generatePlotAnalysis = async (plot: LandPlot): Promise<string> => {
  // Lấy API key từ biến môi trường
  const apiKey = process.env.GEMINI_API_KEY;

  // Kiểm tra Key trước khi gọi để tránh lỗi hệ thống
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API_KEY_MISSING");
  }

  // Khởi tạo instance mới mỗi lần gọi
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    Bạn là một chuyên gia tư vấn bất động sản cao cấp, chuyên nghiệp và đầy sức thuyết phục.
    Hãy phân tích tiềm năng đầu tư và những điểm nổi bật của lô đất sau đây cho khách hàng VIP:
    
    - Mã nền: ${plot.id}
    - Diện tích: ${plot.area} m2
    - Hướng: ${plot.direction}
    - Giá: ${new Intl.NumberFormat('vi-VN').format(plot.totalPrice)} VNĐ (${new Intl.NumberFormat('vi-VN').format(plot.pricePerM2)} triệu/m2)
    - Pháp lý: ${plot.legal}
    - Đặc điểm: ${plot.features.join(', ')}
    - Mô tả thêm: ${plot.description}
    
    Yêu cầu:
    1. Viết ngắn gọn khoảng 150-200 từ.
    2. KHÔNG sử dụng các ký tự định dạng markdown như #, *, **.
    2. Giọng văn sang trọng, đẳng cấp, tạo cảm giác khan hiếm và giá trị cao.
    3. Tập trung vào lợi ích tương lai (giá trị sở hữu, dự án độc tôn, khu quy hoạch bài bản duy nhất trong khu vực, món quà đẳng cấp cha mẹ dành cho con cái, phong thủy).
    4. Sử dụng tiếng Việt.
  `;

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
      });

      return response.text || "Hiện tại trợ lý AI đang bận, vui lòng thử lại sau.";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Kiểm tra lỗi 503
      try {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError.error && parsedError.error.code === 503 && retries > 1) {
          retries--;
          console.warn(`Gemini 503 error, retrying... (${retries} retries left)`);
          await delay(2000);
          continue;
        }
      } catch (e) {
        // Not JSON, proceed to check other error types
      }

      if (errorMessage.includes("Requested entity was not found.")) {
        throw new Error("API_KEY_INVALID");
      }
      
      // Trả về thông báo nhẹ nhàng thay vì lỗi kỹ thuật
      return "Hệ thống phân tích đang bảo trì, vui lòng tham khảo thông tin chi tiết bên dưới.";
    }
  }
  return "Hệ thống phân tích đang bảo trì, vui lòng tham khảo thông tin chi tiết bên dưới.";
};

export const analyzeVisitorBehavior = async (visitor: any, plots: LandPlot[]): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const viewedPlotsDetails = visitor.viewedPlots.map((id: string) => {
    const plot = plots.find(p => p.id.toUpperCase() === id.toUpperCase());
    return plot ? `- Lô ${plot.id}: ${plot.area}m2, giá ${new Intl.NumberFormat('vi-VN').format(plot.totalPrice)} VNĐ, hướng ${plot.direction}` : `- Lô ${id} (không tìm thấy data)`;
  }).join('\n');

  const offersDetails = visitor.offers && visitor.offers.length > 0 
    ? visitor.offers.map((o: any) => {
        const diff = o.originalPrice ? Number(o.offeredPrice) - o.originalPrice : 0;
        const diffText = diff >= 0 ? `(+${new Intl.NumberFormat('vi-VN').format(diff)})` : `(${new Intl.NumberFormat('vi-VN').format(diff)})`;
        return `- Trả giá lô ${o.plotId}: ${new Intl.NumberFormat('vi-VN').format(Number(o.offeredPrice))} VNĐ (Giá gốc: ${o.originalPrice ? new Intl.NumberFormat('vi-VN').format(o.originalPrice) : 'N/A'} VNĐ, Chênh lệch: ${diffText}) vào lúc ${new Date(o.timestamp).toLocaleString()}`;
      }).join('\n')
    : 'Chưa có yêu cầu trả giá nào.';

  const prompt = `
    Bạn là một chuyên gia phân tích hành vi khách hàng trong lĩnh vực bất động sản.
    Hãy đánh giá khách hàng dựa trên các thông tin sau:
    
    - Tên khách (nếu có): ${visitor.name || 'Ẩn danh'}
    - Số điện thoại (nếu có): ${visitor.phoneNumber || 'Ẩn danh'}
    - Thiết bị: ${visitor.device}
    - Nguồn truy cập: ${visitor.source || 'Trực tiếp'}
    - Các lô đất đã xem:
    ${viewedPlotsDetails}
    - Các yêu cầu trả giá đã gửi:
    ${offersDetails}
    - Tổng số trang đã xem: ${visitor.pageHistory.length}
    
    Yêu cầu trả về JSON với các trường sau:
    1. assessment: Nhận xét tổng quan (không dùng markdown).
    2. score: Điểm tiềm năng từ 0-100 dựa trên hành vi (xem nhiều, trả giá = điểm cao).
    3. smartMatching: Danh sách 2-3 mã lô đất khác (ID) phù hợp với gu của khách kèm lý do ngắn gọn.
    4. messageTemplate: Một đoạn tin nhắn Zalo mẫu cực kỳ thuyết phục để sale gửi cho khách.
    5. interestLevel: Mức độ quan tâm (Rất Cao/Cao/Trung bình/Thấp).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      config: {
        responseMimeType: "application/json",
      },
      contents: prompt,
    });
    return response.text || "{}";
  } catch (error) {
    console.error("Visitor Analysis Error:", error);
    return "{}";
  }
};
