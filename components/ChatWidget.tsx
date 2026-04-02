import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { fetchLandPlots } from '../services/dataService';
import { LandPlot } from '../types';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, arrayUnion, serverTimestamp, query, collection, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { updateVisitorInfo } from '../hooks/useVisitorTracker';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrors';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole] = useState(() => localStorage.getItem('userRole') || 'customer');
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: userRole === 'employee' 
      ? `Chào ${userName || 'đồng nghiệp'}, em có thể hỗ trợ gì cho anh/chị hôm nay?` 
      : 'Dạ em chào Quý khách! Em là Tiểu Mỹ, trợ lý ảo của Bom Bo Real. Em có thể giúp gì cho Quý khách về các sản phẩm bất động sản tại đây ạ?' }
  ]);
  const [input, setInput] = useState('');
  const [plots, setPlots] = useState<LandPlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => localStorage.getItem('convId') || crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('convId', conversationId);
    fetchLandPlots().then(setPlots);

    if (isOpen) {
      const visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        // Fetch visitor name
        getDoc(doc(db, 'visitor_logs', visitorId)).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) setUserName(data.name);
          }
        });

        // Fetch conversation history
        const convQuery = query(collection(db, 'conversations'), where('userId', '==', visitorId), orderBy('createdAt', 'desc'), limit(1));
        getDocs(convQuery).then(querySnapshot => {
          if (!querySnapshot.empty) {
            const convDoc = querySnapshot.docs[0];
            const data = convDoc.data();
            setMessages(prev => [
              { role: 'ai', text: `Chào ${data.name || 'Quý khách'} đã quay lại! Tiểu Mỹ rất vui được gặp lại anh/chị.` },
              ...data.messages
            ]);
          }
        });
      }
    }
  }, [isOpen, conversationId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      try {
        await setDoc(convRef, {
          userId: localStorage.getItem('visitorId') || 'anonymous',
          createdAt: serverTimestamp(),
          messages: arrayUnion(userMessage)
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}`);
      }

      // Update visitor info if provided
      const visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        // Basic phone extraction
        const phoneMatch = input.match(/(\d{10,11})/);
        if (phoneMatch) {
          await updateVisitorInfo(visitorId, undefined, phoneMatch[0]);
        }
      }

      const context = plots.map(p => `ID: ${p.id}, Dự án: ${p.cdt ? `${p.cdt} - ` : ''}${p.duan}, Giá: ${p.totalPrice}`).join('\n');
      
      console.log('Sending request to Gemini...');
      
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          const systemInstruction = userRole === 'employee'
            ? `Bạn là Tiểu Mỹ, đồng nghiệp hỗ trợ nhân viên tại Bom Bo Real. Hãy nói chuyện chuyên nghiệp, hỗ trợ đồng nghiệp. Tên nhân viên là ${userName || 'đồng nghiệp'}.`
            : `Bạn là Tiểu Mỹ, trợ lý tư vấn bất động sản cho Bom Bo Real. Hãy xưng hô là "em" và gọi khách hàng là "Quý khách", nếu đã xác định được giới tính của khách rồi thì đổi qua gọi họ là anh hoặc chị, không nhất thiết phải gọi là quý khách nữa.`;

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
            contents: `${systemInstruction}
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
