export enum Direction {
  North = 'Bắc',
  South = 'Nam',
  East = 'Đông',
  West = 'Tây',
  NorthEast = 'Đông Bắc',
  NorthWest = 'Tây Bắc',
  SouthEast = 'Đông Nam',
  SouthWest = 'Tây Nam'
}

export enum LegalStatus {
  RedBook = 'Sổ hồng riêng',
  Contract = 'Hợp đồng nguyên tắc',
  Waiting = 'Đang chờ sổ'
}

export interface LandPlot {
  id: string;
  area: number;
  pricePerM2: number;
  totalPrice: number;
  direction: Direction;
  legal: LegalStatus;
  description: string;
  images: string[];
  features: string[];
  status: string;
  coordinates: { lat: number; lng: number };
  linkmap?: string;
  phankhu?: string;
  duan?: string;
  size?: string;
  logioi?: string;
  loai?: string;
  cdt?: string;
}
