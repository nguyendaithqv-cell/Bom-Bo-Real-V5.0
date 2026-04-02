import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrors';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const HOTLINE = '0969 320 229';
  const ZALO = '0969 320 229';
  const ADDRESS = 'Bình Phước, Việt Nam';
  const FACEBOOK = 'https://facebook.com/bombreal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        createdAt: serverTimestamp()
      });

      // Update visitor info
      const visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        const visitorRef = doc(db, 'visitor_logs', visitorId);
        await updateDoc(visitorRef, {
          name: formData.name,
          phoneNumber: formData.phone
        });
      }

      setShowSuccess(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contacts');
    }
  };

  return (
    <div className="pt-32 pb-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <h1 className="text-4xl font-bold text-navy-900 mb-12 font-serif text-center">Liên Hệ Với Chúng Tôi</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold text-navy-900 mb-6">Thông tin liên hệ</h2>
            <div className="space-y-4 text-gray-600">
              <p><strong>Hotline:</strong> {HOTLINE}</p>
              <p><strong>Zalo:</strong> {ZALO}</p>
              {FACEBOOK && <p><strong>Facebook:</strong> <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ghé thăm Fanpage</a></p>}
              <p><strong>Địa chỉ:</strong> {ADDRESS}</p>
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-bold text-navy-900 mb-4">Vị trí văn phòng</h3>
              <div className="w-full h-64 rounded-lg overflow-hidden shadow-inner">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3916.638640323924!2d107.1887481!3d11.9201522!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTHCsDU1JzEyLjUiTiAxMDfCsDExJzI4LjgiRQ!5e0!3m2!1svi!2s!4v1711429947211!5m2!1svi!2s" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold text-navy-900 mb-6">Gửi tin nhắn cho chúng tôi</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-navy-900 focus:border-navy-900" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-navy-900 focus:border-navy-900" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input type="tel" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-navy-900 focus:border-navy-900" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tin nhắn</label>
                <textarea required rows={4} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-navy-900 focus:border-navy-900" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
              </div>
              <button type="submit" className="w-full bg-navy-900 text-white py-3 rounded-lg font-bold hover:bg-navy-800 transition-colors">Gửi tin nhắn</button>
            </form>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-navy-900 mb-4">Gửi thành công!</h3>
            <p className="text-gray-600 mb-6">Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất.</p>
            <button onClick={() => setShowSuccess(false)} className="bg-navy-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-navy-800 transition-colors">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};
