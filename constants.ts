import { LandPlot, Direction, LegalStatus } from './types';

// HƯỚNG DẪN CẤU HÌNH GOOGLE SHEETS:
// 1. Tạo Google Sheet với các cột: id, area, pricePerM2, totalPrice, direction, legal, description, images, features, status
// 2. Vào File > Share > Publish to web (Tệp > Chia sẻ > Công bố lên web)
// 3. Chọn "Entire Document" (Toàn bộ tài liệu) và định dạng "Comma-separated values (.csv)"
// 4. Copy đường link đó và dán vào biến GOOGLE_SHEET_CSV_URL bên dưới.
// Lưu ý: Nếu biến này để trống (""), web sẽ chạy bằng dữ liệu mẫu (SAMPLE_PLOTS).

// Đã chuyển đổi link edit thành link export CSV
export const GOOGLE_SHEET_CSV_URL: string = "https://docs.google.com/spreadsheets/d/1ntEdOfoh3VKodvr3xv6QHRjNmhXA0MLrWcT162RLUKs/export?format=csv"; 

// ==========================================
// HÌNH NỀN TRANG CHỦ (HERO IMAGE)
// ==========================================
// Để thay đổi hình nền trang chủ thành bức ảnh của bạn:
// 1. Upload ảnh của bạn lên một trang web lưu trữ (ví dụ: imgur.com, upanh.org...) để lấy link trực tiếp (đuôi .jpg, .png).
// 2. Thay thế đường link màu xanh bên dưới bằng link ảnh của bạn.
export const PROJECT_HERO_IMAGE = "https://i.postimg.cc/50QGh1dC/n.jpg"; 

// Dữ liệu mẫu dùng khi không kết nối được Google Sheets
export const SAMPLE_PLOTS: LandPlot[] = [
  {
    id: "H11",
    area: 120,
    pricePerM2: 25,
    totalPrice: 3,
    direction: Direction.SouthEast,
    legal: LegalStatus.RedBook,
    description: "Lô góc 2 mặt tiền view công viên. Vị trí đắc địa ngay trung tâm dự án, thích hợp kinh doanh hoặc xây biệt thự vườn.",
    images: [
      "https://images.unsplash.com/photo-1600596542815-2a429fe53119?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80"
    ],
    features: ["View công viên", "Lô góc", "Gần TTTM"],
    status: 'Available',
    coordinates: { lat: 10.123, lng: 106.456 },
    linkmap: "https://maps.app.goo.gl/example1",
    size: "5m x 24m",
    logioi: "16m"
  },
  {
    id: "B2-10",
    area: 100,
    pricePerM2: 22,
    totalPrice: 2.2,
    direction: Direction.North,
    legal: LegalStatus.Contract,
    description: "Nằm trên trục đường chính 20m, thuận tiện giao thông. Gần trường học và bệnh viện quốc tế.",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    features: ["Mặt tiền đường lớn", "Gần trường học"],
    status: 'Available',
    coordinates: { lat: 10.124, lng: 106.457 },
    linkmap: "https://maps.app.goo.gl/example2",
    size: "5m x 20m",
    logioi: "20m"
  },
  {
    id: "C5-12",
    area: 150,
    pricePerM2: 18,
    totalPrice: 2.7,
    direction: Direction.West,
    legal: LegalStatus.RedBook,
    description: "Biệt thự vườn ven sông, không gian yên tĩnh, thoáng mát quanh năm.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
    ],
    features: ["Ven sông", "Yên tĩnh", "Giá tốt"],
    status: 'Sold',
    coordinates: { lat: 10.125, lng: 106.458 },
    linkmap: "https://maps.app.goo.gl/example3",
    size: "7.5m x 20m",
    logioi: "12m"
  }
];
