import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Home, 
  Maximize, 
  DollarSign, 
  FileText, 
  Compass, 
  Image as ImageIcon, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Upload,
  X,
  Loader2,
  Info,
  AlertCircle
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { updateVisitorInfo, trackVisitorConsignment } from '../hooks/useVisitorTracker';

type Step = 1 | 2 | 3 | 4;

interface ConsignmentData {
  fullName: string;
  phoneNumber: string;
  zalo: string;
  propertyType: string;
  address: string;
  area: string;
  dimensions: string;
  price: string;
  legalStatus: string;
  direction: string;
  description: string;
  images: string[];
}

const initialData: ConsignmentData = {
  fullName: '',
  phoneNumber: '',
  zalo: '',
  propertyType: 'Đất nền',
  address: '',
  area: '',
  dimensions: '',
  price: '',
  legalStatus: 'Sổ hồng riêng',
  direction: 'Đông',
  description: '',
  images: []
};

export const ConsignmentPage: React.FC = () => {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<ConsignmentData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '');
    if (!number) return '';
    return new Intl.NumberFormat('vi-VN').format(parseInt(number));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ lấy định vị.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        updateFormData({ address: googleMapsUrl });
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Không thể lấy định vị. Vui lòng kiểm tra quyền truy cập vị trí.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const updateFormData = (data: Partial<ConsignmentData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentImagesCount = formData.images.length;
    const remainingSlots = 6 - currentImagesCount;
    
    if (remainingSlots <= 0) {
      alert('Bạn chỉ có thể tải lên tối đa 6 hình ảnh.');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    setIsCompressing(true);
    try {
      for (const file of filesToUpload) {
        try {
          const compressedBase64 = await compressImage(file);
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, compressedBase64]
          }));
        } catch (error) {
          console.error('Error compressing image:', error);
        }
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'consignments'), {
        ...formData,
        status: 'pending',
        createdAt: new Date()
      });

      const visitorId = localStorage.getItem('visitorId');
      if (visitorId) {
        await updateVisitorInfo(visitorId, formData.fullName, formData.phoneNumber);
        await trackVisitorConsignment(visitorId, {
          propertyType: formData.propertyType,
          address: formData.address,
          price: Number(formData.price.replace(/\D/g, '')) || 0,
          contactName: formData.fullName
        });
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting consignment:', error);
      alert('Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => (prev + 1) as Step);
  const prevStep = () => setStep(prev => (prev - 1) as Step);

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md w-full"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy-900 mb-4">Gửi yêu cầu thành công!</h2>
          <p className="text-gray-600 mb-8">
            Cảm ơn bạn đã tin tưởng ký gửi tại Bom Bo Real. Chúng tôi sẽ sớm liên hệ với bạn qua số điện thoại <strong>{formData.phoneNumber}</strong> để xác nhận thông tin.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-navy-900 text-white py-4 rounded-xl font-bold hover:bg-navy-800 transition-all"
          >
            Về trang chủ
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-4">Ký Gửi Bất Động Sản</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Bạn đang có nhu cầu bán hoặc cho thuê bất động sản? Hãy để Bom Bo Real giúp bạn kết nối với hàng ngàn khách hàng tiềm năng.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-gold-400 -translate-y-1/2 transition-all duration-500"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
        <div className="relative flex justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step >= s ? 'bg-gold-400 text-white shadow-lg shadow-gold-400/30' : 'bg-white text-gray-400 border-2 border-gray-100'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
          <span>Liên hệ</span>
          <span>Thông tin</span>
          <span>Hình ảnh</span>
          <span>Xác nhận</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 md:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-gold-500" />
                  Thông tin liên hệ
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Họ và tên *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => updateFormData({ fullName: e.target.value })}
                        placeholder="Nguyễn Văn A"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Số điện thoại *</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => updateFormData({ phoneNumber: e.target.value })}
                        placeholder="09xx xxx xxx"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Zalo (nếu có)</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        value={formData.zalo}
                        onChange={(e) => updateFormData({ zalo: e.target.value })}
                        placeholder="Số điện thoại Zalo"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
                  <Home className="w-5 h-5 text-gold-500" />
                  Thông tin bất động sản
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Loại hình *</label>
                    <select 
                      value={formData.propertyType}
                      onChange={(e) => updateFormData({ propertyType: e.target.value })}
                      className="w-full px-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium appearance-none bg-white"
                    >
                      <option>Đất nền</option>
                      <option>Đất sào/mẫu</option>
                      <option>Nhà phố</option>
                      <option>Biệt thự</option>
                      <option>Căn hộ</option>
                      <option>Khác</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Giá mong muốn (VNĐ) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        value={formData.price}
                        onChange={(e) => updateFormData({ price: formatCurrency(e.target.value) })}
                        placeholder="Ví dụ: 2.500.000.000"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Địa chỉ chi tiết *</label>
                      <button 
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className="text-[10px] font-bold text-navy-600 bg-navy-50 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors flex items-center gap-1"
                      >
                        {isLocating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Compass className="w-3 h-3" />
                        )}
                        {isLocating ? 'Đang lấy vị trí...' : 'Lấy định vị'}
                      </button>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        value={formData.address}
                        onChange={(e) => updateFormData({ address: e.target.value })}
                        placeholder="Số nhà, tên đường, xã, huyện, tỉnh..."
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Diện tích (m2)</label>
                    <div className="relative">
                      <Maximize className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        value={formData.area}
                        onChange={(e) => updateFormData({ area: e.target.value })}
                        placeholder="Ví dụ: 100"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Kích thước (Ngang x Dài)</label>
                    <div className="relative">
                      <Maximize className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text"
                        value={formData.dimensions}
                        onChange={(e) => updateFormData({ dimensions: e.target.value })}
                        placeholder="Ví dụ: 5x20"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pháp lý</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select 
                        value={formData.legalStatus}
                        onChange={(e) => updateFormData({ legalStatus: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium appearance-none bg-white"
                      >
                        <option>Sổ hồng riêng</option>
                        <option>Sổ đỏ</option>
                        <option>Hợp đồng mua bán</option>
                        <option>Đang chờ sổ</option>
                        <option>Khác</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Hướng</label>
                    <div className="relative">
                      <Compass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select 
                        value={formData.direction}
                        onChange={(e) => updateFormData({ direction: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium appearance-none bg-white"
                      >
                        <option>Đông</option>
                        <option>Tây</option>
                        <option>Nam</option>
                        <option>Bắc</option>
                        <option>Đông Bắc</option>
                        <option>Đông Nam</option>
                        <option>Tây Bắc</option>
                        <option>Tây Nam</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gold-500" />
                  Mô tả & Hình ảnh
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Mô tả chi tiết</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => updateFormData({ description: e.target.value })}
                      placeholder="Nhập các ưu điểm của lô đất, tiện ích xung quanh, lý do bán..."
                      className="w-full px-4 py-4 rounded-xl border border-gray-100 focus:ring-2 focus:ring-gold-400 outline-none font-medium min-h-[150px] resize-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Hình ảnh thực tế & Sổ sách</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {formData.images.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                          <img src={img} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                        {isCompressing ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="w-8 h-8 text-gold-500 animate-spin mb-2" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Đang xử lý...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-xs font-bold text-gray-400 uppercase">Tải ảnh</span>
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                              disabled={isCompressing}
                            />
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-gold-500" />
                  Xác nhận thông tin
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Người gửi</h3>
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                      <p className="font-bold text-navy-900">{formData.fullName}</p>
                      <p className="text-sm text-gray-600">{formData.phoneNumber}</p>
                      {formData.zalo && <p className="text-sm text-gray-600">Zalo: {formData.zalo}</p>}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bất động sản</h3>
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                      <p className="font-bold text-navy-900">{formData.propertyType} - {formData.price}</p>
                      <p className="text-sm text-gray-600">{formData.address}</p>
                      <p className="text-sm text-gray-600">{formData.area}m2 ({formData.dimensions})</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Bằng việc nhấn "Gửi yêu cầu", bạn đồng ý cung cấp thông tin cho Bom Bo Real. Chúng tôi cam kết bảo mật thông tin và chỉ sử dụng cho mục đích tư vấn ký gửi.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="mt-12 flex justify-between gap-4">
            {step > 1 && (
              <button 
                onClick={prevStep}
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                Quay lại
              </button>
            )}
            <div className="flex-grow"></div>
            {step < 4 ? (
              <button 
                onClick={nextStep}
                disabled={
                  (step === 1 && (!formData.fullName || !formData.phoneNumber)) ||
                  (step === 2 && (!formData.address || !formData.price))
                }
                className="flex items-center gap-2 px-12 py-4 rounded-xl font-bold bg-navy-900 text-white hover:bg-navy-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-navy-900/20"
              >
                Tiếp tục
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-12 py-4 rounded-xl font-bold bg-gold-500 text-white hover:bg-gold-600 transition-all disabled:opacity-50 shadow-lg shadow-gold-500/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    Gửi yêu cầu ngay
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
