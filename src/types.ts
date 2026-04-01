export enum Direction {
  East = 'Đông',
  West = 'Tây',
  South = 'Nam',
  North = 'Bắc',
  SouthEast = 'Đông Nam',
  SouthWest = 'Tây Nam',
  NorthEast = 'Đông Bắc',
  NorthWest = 'Tây Bắc',
}

export enum LegalStatus {
  RedBook = 'Sổ đỏ chính chủ',
  Contract = 'Hợp đồng mua bán',
  Waiting = 'Đang chờ sổ',
}

export interface LandPlot {
  id: string; // The code, e.g., "H11"
  area: number; // in m2
  pricePerM2: number; // in million VND
  totalPrice: number; // in billion VND
  direction: Direction;
  legal: LegalStatus;
  description: string;
  images: string[];
  features: string[];
  status: string;
  coordinates: { lat: number; lng: number }; // Mock coordinates
  linkmap?: string;
  phankhu?: string;
  duan?: string;
  size?: string;
  logioi?: string;
  loai?: string;
  cdt?: string;
}
