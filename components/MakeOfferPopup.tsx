import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateVisitorInfo, trackVisitorOffer } from '../hooks/useVisitorTracker';

interface Props {
  plotId: string;
  originalPrice: number;
  onClose: () => void;
}

export const MakeOfferPopup: React.FC<Props> = ({ plotId, originalPrice, onClose }) => {
  const [price, setPrice] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const formatPrice = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'offers'), {
        plotId,
        originalPrice,
        offeredPrice: price.replace(/\./g, ''),
        name,
        phone,
        createdAt: serverTimestamp()
      });

      // Update visitor info
      const visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        await updateVisitorInfo(visitorId, name, phone);
        await trackVisitorOffer(visitorId, plotId, price.replace(/\./g, ''), originalPrice);
      }

      setShowSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Gửi yêu cầu thất bại! Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl text-center">
          <h3 className="text-lg font-bold text-navy-900 mb-4">Thông báo</h3>
          <p className="text-gray-700 mb-6">Cám ơn Quý khách đã gửi yêu cầu. Chúng tôi sẽ cân nhắc về yêu cầu của quý vị và liên hệ lại ngay ạ !</p>
          <button onClick={onClose} className="w-full px-4 py-2 bg-gold-500 text-white rounded hover:bg-gold-600">Đóng</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-navy-900">Trả giá cho lô {plotId}</h2>
        <p className="mb-4 text-sm text-gray-600">Giá gốc: {new Intl.NumberFormat('vi-VN').format(originalPrice)} VNĐ</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá trả (VNĐ)</label>
            <input type="text" value={price} onChange={(e) => setPrice(formatPrice(e.target.value))} placeholder="Ví dụ: 1.000.000.000" className="w-full border p-2 rounded" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên của bạn" className="w-full border p-2 rounded" />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại (bắt buộc)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nhập số điện thoại" className="w-full border p-2 rounded" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-gold-500 text-white rounded hover:bg-gold-600" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
