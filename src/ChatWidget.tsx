import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { fetchLandPlots } from './services/dataService';
import { LandPlot } from './types';
import { db } from './firebase';
import { doc, setDoc, updateDoc, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
import { updateVisitorInfo } from './hooks/useVisitorTracker';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Dạ em chào Quý khách! Em là Tiểu Mỹ, trợ lý ảo của Bom Bo Real. Em có thể giúp gì cho Quý khách về các sản phẩm bất động sản tại đây ạ?' }
  ]);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [input, setInput] = useState('');
  const [plots, setPlots] = useState<LandPlot[]>([]);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => localStorage.getItem('convId') || crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('convId', conversationId);
    fetchLandPlots().then(setPlots);
  }, [conversationId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generatePersonalizedGreeting = async (visitorData: any) => {
    const { name, viewedPlots, aiAssessment, status } = visitorData;
    
    const isStaff = status === 'employee';
    
    const prompt = `Bạn là Tiểu Mỹ, trợ lý ảo của Bom Bo Real. 
    Bạn đang chào đón một ${isStaff ? 'NHÂN VIÊN CỦA CÔNG TY' : 'khách hàng QUAY LẠI'} trang web.
    Thông tin:
    - Tên: ${name || 'Chưa biết'}
    - Trạng thái: ${isStaff ? 'Nhân viên công ty' : 'Khách hàng'}
    - Các lô đất đã xem: ${viewedPlots?.join(', ') || 'Chưa xem lô nào'}
    - Đánh giá trước đó: ${aiAssessment || 'Chưa có'}
    
    Hãy viết một lời chào tự nhiên, thân thiện.
    ${isStaff 
      ? 'Vì đây là NHÂN VIÊN, hãy chào một cách đồng nghiệp, hỗ trợ. Ví dụ: "Chào anh Đại, chúc anh một ngày làm việc hiệu quả! Em có thể giúp gì cho anh trong việc tư vấn khách hàng hôm nay không?"' 
      : 'Vì đây là KHÁCH HÀNG, hãy chào như đã quen biết. Ví dụ: "Chào anh Đại, Tiểu Mỹ thấy anh quay lại xem thêm thông tin về lô Giai đoạn 3 ạ? Rất vui được gặp lại anh!"'}
    
    Yêu cầu:
    - Xưng "em", gọi khách là "Quý khách" hoặc "anh/chị" nếu biết tên.
    - Ngắn gọn, ấm áp.
    - KHÔNG sử dụng markdown.
    - Chỉ trả về nội dung lời chào, không kèm giải thích.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt
      });
      return response.text?.trim() || 'Dạ em chào Quý khách quay trở lại ạ!';
    } catch (error) {
      console.error('Error generating greeting:', error);
      return 'Dạ em chào Quý khách quay trở lại ạ!';
    }
  };

  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 1) {
      const visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        const fetchVisitorAndGreet = async () => {
          try {
            const visitorDoc = await getDoc(doc(db, 'visitor_logs', visitorId));
            if (visitorDoc.exists()) {
              const data = visitorDoc.data();
              if (data.name) setVisitorName(data.name);
              if (data.status === 'employee') setIsEmployee(true);
              if (data.name || (data.viewedPlots && data.viewedPlots.length > 0) || data.status === 'employee') {
                setIsLoading(true);
                const greeting = await generatePersonalizedGreeting(data);
                setMessages([{ role: 'ai', text: greeting }]);
                setIsLoading(false);
              }
            }
          } catch (error) {
            console.error('Error fetching visitor for greeting:', error);
          } finally {
            setHasGreeted(true);
          }
        };
        fetchVisitorAndGreet();
      } else {
        setHasGreeted(true);
      }
    }
  }, [isOpen, hasGreeted, messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message to Firebase
      const convRef = doc(db, 'conversations', conversationId);
      await setDoc(convRef, {
        userId: 'anonymous',
        createdAt: serverTimestamp(),
        messages: arrayUnion(userMessage)
      }, { merge: true });

      // Update visitor info if provided
      const visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        // Basic phone extraction
        const phoneMatch = input.match(/(\d{10,11})/);
        if (phoneMatch) {
          await updateVisitorInfo(visitorId, undefined, phoneMatch[0]);
        }
      }

      const context = plots.map(p => `ID: ${p.id}, Dự án: ${p.duan}, Giá: ${p.totalPrice}`).join('\n');
      
      console.log('Sending request to Gemini...');
      
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview', 
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  reply: { type: Type.STRING, description: "Câu trả lời cho khách hàng" },
                  extractedName: { type: Type.STRING, description: "Tên thật của khách hàng nếu họ có giới thiệu, nếu không có thì để trống" },
                  extractedPhone: { type: Type.STRING, description: "Số điện thoại của khách hàng nếu họ có cung cấp, nếu không có thì để trống" }
                },
                required: ["reply"]
              }
            },
            contents: `Bạn là Tiểu Mỹ, trợ lý tư vấn bất động sản cho Bom Bo Real. Hãy xưng hô là "em" và gọi khách hàng là "Quý khách", nếu đã xác định được giới tính của khách rồi thì đổi qua gọi họ là anh hoặc chị, không nhất thiết phải gọi là quý khách nữa. 
            ${visitorName ? `Khách hàng tên là: ${visitorName}. Hãy chào và xưng hô thân mật với tên này.` : ''}
            ${isEmployee ? 'LƯU Ý: Người đang chat là NHÂN VIÊN của công ty. Hãy trả lời với tư cách đồng nghiệp hỗ trợ, cung cấp thông tin chính xác để họ tư vấn khách hàng tốt hơn.' : ''}
            Dưới đây là danh sách các lô đất hiện có (ID và Giá):
            ${context}
            
            Nhiệm vụ của bạn:
            1. Trả lời câu hỏi của khách hàng một cách lịch sự, chuyên nghiệp.
            2. Nếu trong câu nói của khách có giới thiệu tên (ví dụ: "Anh là Đại đây", "Mình là Lan nhé", "Chị là Mỹ Tâm"), hãy trích xuất đúng TÊN THẬT của họ (ví dụ: "Đại", "Lan", "Mỹ Tâm").
            3. Nếu khách có để lại số điện thoại, hãy trích xuất đúng số đó.
            4. Trả về kết quả dưới dạng JSON.
            
            Lưu ý về thông tin công ty: anh Đại là chủ/quản lý, có 10 nhân viên, đang tuyển dụng NV kinh doanh và cộng tác viên.
            KHÔNG sử dụng các ký tự định dạng markdown như #, *, ** trong phần reply.
            
            Câu hỏi của khách: ${input}`,
          });
          break;
        } catch (error: any) {
          let errorMessage = error instanceof Error ? error.message : String(error);
          try {
            const parsedError = JSON.parse(errorMessage);
            if (parsedError.error && parsedError.error.code === 503 && retries > 1) {
              retries--;
              console.warn(`Gemini 503 error, retrying... (${retries} retries left)`);
              await delay(2000);
              continue;
            }
          } catch (e) {
            // Not JSON, proceed to throw
          }
          throw error;
        }
      }
      
      console.log('Gemini response:', response);

      let aiData: { reply: string; extractedName?: string; extractedPhone?: string } = { reply: '' };
      if (response && response.text) {
        try {
          aiData = JSON.parse(response.text);
        } catch (e) {
          aiData = { reply: response.text };
        }
      }

      const responseText = aiData.reply || 'Xin lỗi, Tiểu Mỹ đang phải trả lời nhiều KH nên bận một chút, Quý vị vui lòng trở lại sau ạ.';
      
      // Update visitor info if AI extracted something
      if (visitorId && (aiData.extractedName || aiData.extractedPhone)) {
        await updateVisitorInfo(visitorId, aiData.extractedName, aiData.extractedPhone);
        if (aiData.extractedName) setVisitorName(aiData.extractedName);
      }

      const cleanText = responseText
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .trim();

      const aiMessage = { role: 'ai' as const, text: cleanText };
      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      // Save AI message to Firebase
      await setDoc(convRef, {
        messages: arrayUnion(aiMessage)
      }, { merge: true });

    } catch (error) {
      console.error('Chat error details:', error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Xin lỗi, Tiểu Mỹ đang phải trả lời nhiều KH nên bận một chút, Quý vị vui lòng trở lại sau ạ.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gold-500 text-white p-4 rounded-full shadow-lg hover:bg-gold-600 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      ) : (
        <div className="bg-white w-80 h-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          <div className="bg-navy-900 text-white p-4 flex justify-between items-center">
            <h3 className="font-serif">Trợ lý Bom Bo Real</h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-gold-400">✕</button>
          </div>
          <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-lg text-sm whitespace-pre-line ${m.role === 'user' ? 'bg-purple-200 self-end' : 'bg-gold-100 self-start'}`}>
                {m.text}
              </div>
            ))}
            {isLoading && <div className="text-xs text-gray-400">Đang trả lời...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t flex">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-grow border rounded-l-lg p-2 text-sm"
              placeholder="Nhập câu hỏi..."
            />
            <button onClick={handleSend} className="bg-gold-500 text-white px-4 rounded-r-lg text-sm">Gửi</button>
          </div>
        </div>
      )}
    </div>
  );
};
