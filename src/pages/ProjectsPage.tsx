import React from 'react';
import { PROJECT_HERO_IMAGE } from '../constants';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="pt-24 pb-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <h1 className="text-4xl font-bold text-navy-900 mb-8 font-serif text-center">Thái Thành Bom Bo</h1>
        
        {/* Hero Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
          <img 
            src={PROJECT_HERO_IMAGE}
            alt="Thái Thành Bom Bo" 
            className="w-full h-auto"
            referrerPolicy="no-referrer"
          />
          <div className="p-8">
            <h2 className="text-2xl font-bold text-navy-900 mb-4">Thời cơ vàng đầu tư bất động sản Bù Đăng – Bình Phước</h2>
            <p className="text-gray-600 leading-relaxed">
              Dự án Thái Thành – Bom Bo được chủ đầu tư Thái Thành triển khai tại trung tâm hành chính mới của vùng đô thị du lịch Bom Bo.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-12">
          <section className="bg-white p-8 rounded-xl shadow-sm">
            <h3 className="text-2xl font-bold text-navy-900 mb-6 border-b pb-2">Tổng quan dự án</h3>
            <p className="text-gray-600 leading-relaxed">
              Dự án Thái Thành Bom Bo mang đến cơ hội đầu tư hấp dẫn tại Bù Đăng, Bình Phước. Với vị trí chiến lược và quy hoạch bài bản, đây là điểm đến lý tưởng cho các nhà đầu tư và cư dân tương lai.
            </p>
          </section>
          
          <section className="bg-white p-8 rounded-xl shadow-sm">
            <h3 className="text-2xl font-bold text-navy-900 mb-6 border-b pb-2">Vị trí dự án: “Trái tim mới” của đô thị du lịch Bom Bo</h3>
            <p className="text-gray-600 leading-relaxed">
              Tọa lạc tại vị trí đắc địa, dự án kết nối giao thông thuận tiện, thừa hưởng hạ tầng đồng bộ và tiềm năng tăng giá cao trong tương lai.
            </p>
          </section>

          <section className="bg-white p-8 rounded-xl shadow-sm">
            <h3 className="text-2xl font-bold text-navy-900 mb-6 border-b pb-2">Tiện ích dự án: Không gian sống chuẩn chất</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Sống cân bằng giữa thiên nhiên nguyên bản</li>
              <li>Kiến tạo phong cách sống thịnh vượng</li>
              <li>Nhịp sống sôi động trong “Xứ sở cồng chiêng”</li>
              <li>Sống văn minh – an toàn</li>
              <li>Lợi thế “kép” từ hệ tiện ích ngoại khu đa dạng</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
