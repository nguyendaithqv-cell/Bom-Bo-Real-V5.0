import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, Calendar, Download, Info, X, ExternalLink, FileText, Table } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type CalculationMethod = 'declining' | 'original';

interface PaymentScheduleItem {
  month: number;
  beginningBalance: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalance: number;
}

interface BankRate {
  name: string;
  logo: string;
  preferentialRate: number;
  normalRate: number;
  term: string;
  maxLoan: string;
}

const bankRates: BankRate[] = [
  { name: 'Vietcombank', logo: 'VCB', preferentialRate: 7.0, normalRate: 10.5, term: '12 tháng', maxLoan: '70%' },
  { name: 'BIDV', logo: 'BIDV', preferentialRate: 7.2, normalRate: 10.7, term: '12 tháng', maxLoan: '80%' },
  { name: 'VietinBank', logo: 'VTB', preferentialRate: 7.1, normalRate: 10.6, term: '12 tháng', maxLoan: '75%' },
  { name: 'Agribank', logo: 'AGR', preferentialRate: 7.0, normalRate: 10.5, term: '12 tháng', maxLoan: '80%' },
  { name: 'Techcombank', logo: 'TCB', preferentialRate: 7.5, normalRate: 11.5, term: '12 tháng', maxLoan: '70%' },
  { name: 'VPBank', logo: 'VPB', preferentialRate: 7.9, normalRate: 12.0, term: '12 tháng', maxLoan: '85%' },
  { name: 'MB Bank', logo: 'MB', preferentialRate: 7.4, normalRate: 11.0, term: '12 tháng', maxLoan: '80%' },
  { name: 'ACB', logo: 'ACB', preferentialRate: 7.3, normalRate: 10.8, term: '12 tháng', maxLoan: '75%' },
  { name: 'VIB', logo: 'VIB', preferentialRate: 8.5, normalRate: 12.5, term: '12 tháng', maxLoan: '80%' },
  { name: 'TPBank', logo: 'TPB', preferentialRate: 7.8, normalRate: 11.8, term: '12 tháng', maxLoan: '75%' },
];

export const InterestRatePage: React.FC = () => {
  // State
  const [loanAmount, setLoanAmount] = useState<string>('1000000000');
  const [loanTermYears, setLoanTermYears] = useState<string>('15');
  const [interestRate, setInterestRate] = useState<string>('10.5');
  
  const [usePreferentialRate, setUsePreferentialRate] = useState<boolean>(true);
  const [preferentialRate, setPreferentialRate] = useState<string>('7.5');
  const [preferentialTermMonths, setPreferentialTermMonths] = useState<string>('12');
  
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('declining');
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(value)).replace('₫', 'đ');
  };

  const parseNumber = (value: string) => {
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calculations
  const schedule = useMemo(() => {
    const amount = parseNumber(loanAmount);
    const months = parseNumber(loanTermYears) * 12;
    const normalRate = parseNumber(interestRate) / 100 / 12;
    const prefRate = parseNumber(preferentialRate) / 100 / 12;
    const prefMonths = parseNumber(preferentialTermMonths);

    if (amount <= 0 || months <= 0) return [];

    let currentBalance = amount;
    const principalPerMonth = amount / months;
    const result: PaymentScheduleItem[] = [];

    for (let i = 1; i <= months; i++) {
      const currentRate = (usePreferentialRate && i <= prefMonths) ? prefRate : normalRate;
      
      let interestPayment = 0;
      let principalPayment = 0;

      if (calculationMethod === 'declining') {
        interestPayment = currentBalance * currentRate;
        principalPayment = principalPerMonth;
      } else {
        // Original balance
        interestPayment = amount * currentRate;
        principalPayment = principalPerMonth;
      }

      // Handle last month rounding
      if (i === months) {
        principalPayment = currentBalance;
      }

      const totalPayment = principalPayment + interestPayment;
      const remainingBalance = Math.max(0, currentBalance - principalPayment);

      result.push({
        month: i,
        beginningBalance: currentBalance,
        principalPayment,
        interestPayment,
        totalPayment,
        remainingBalance,
      });

      currentBalance = remainingBalance;
    }

    return result;
  }, [loanAmount, loanTermYears, interestRate, usePreferentialRate, preferentialRate, preferentialTermMonths, calculationMethod]);

  const summary = useMemo(() => {
    if (schedule.length === 0) return { firstMonthPayment: 0, totalInterest: 0, totalPayment: 0, totalPrincipal: 0 };
    
    const totalPrincipal = parseNumber(loanAmount);
    const totalInterest = schedule.reduce((sum, item) => sum + item.interestPayment, 0);
    
    return {
      firstMonthPayment: schedule[0].totalPayment,
      totalInterest,
      totalPayment: totalPrincipal + totalInterest,
      totalPrincipal
    };
  }, [schedule, loanAmount]);

  // Chart Data
  const pieData = [
    { name: 'Tổng gốc', value: summary.totalPrincipal, color: '#3b82f6' },
    { name: 'Tổng lãi', value: summary.totalInterest, color: '#10b981' },
  ];

  const areaData = schedule.map(item => ({
    name: `Tháng ${item.month}`,
    'Gốc': item.remainingBalance,
    'Lãi': item.interestPayment,
  }));

  // Handlers
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('LICH TRA NO CHI TIET', 105, 15, { align: 'center' });
    
    // Add loan summary
    doc.setFontSize(12);
    doc.text(`So tien vay: ${formatCurrency(parseNumber(loanAmount))}`, 14, 25);
    doc.text(`Thoi han vay: ${loanTermYears} nam`, 14, 32);
    doc.text(`Lai suat: ${interestRate}%/nam`, 14, 39);
    doc.text(`Tong lai: ${formatCurrency(summary.totalInterest)}`, 14, 46);
    doc.text(`Tong thanh toan: ${formatCurrency(summary.totalPayment)}`, 14, 53);
    
    const tableColumn = ["Ky tra no", "Du no dau ky", "Goc phai tra", "Lai phai tra", "Tong thanh toan", "Du no con lai"];
    const tableRows = schedule.map(item => [
      `Thang ${item.month}`,
      new Intl.NumberFormat('vi-VN').format(Math.round(item.beginningBalance)),
      new Intl.NumberFormat('vi-VN').format(Math.round(item.principalPayment)),
      new Intl.NumberFormat('vi-VN').format(Math.round(item.interestPayment)),
      new Intl.NumberFormat('vi-VN').format(Math.round(item.totalPayment)),
      new Intl.NumberFormat('vi-VN').format(Math.round(item.remainingBalance))
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save('lich_tra_no.pdf');
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    const data = schedule.map(item => ({
      'Kỳ trả nợ': `Tháng ${item.month}`,
      'Dư nợ đầu kỳ': Math.round(item.beginningBalance),
      'Gốc phải trả': Math.round(item.principalPayment),
      'Lãi phải trả': Math.round(item.interestPayment),
      'Tổng thanh toán': Math.round(item.totalPayment),
      'Dư nợ còn lại': Math.round(item.remainingBalance)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lịch trả nợ");
    XLSX.writeFile(wb, "lich_tra_no.xlsx");
    setIsExportMenuOpen(false);
  };

  const handlePrint = () => {
    window.print();
    setIsExportMenuOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tính Lãi Suất Vay</h1>
        <p className="text-gray-500 mt-2">Công cụ tính toán chi tiết lịch trả nợ hàng tháng</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Inputs */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div 
            onClick={() => setIsBankModalOpen(true)}
            className="bg-blue-50 border border-blue-200 p-4 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg text-white">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="text-blue-800 font-bold text-sm">Thông tin lãi suất các ngân hàng</p>
                <p className="text-blue-600 text-xs">Cập nhật tháng 04/2026</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800">Thông tin khoản vay</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền cần vay</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={new Intl.NumberFormat('vi-VN').format(parseNumber(loanAmount))}
                    onChange={(e) => setLoanAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-8 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">VNĐ</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian vay</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={loanTermYears}
                      onChange={(e) => setLoanTermYears(e.target.value)}
                      className="w-full pl-3 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Năm</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lãi suất</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full pl-3 pr-16 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%/năm</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center cursor-pointer mb-4">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={usePreferentialRate}
                      onChange={(e) => setUsePreferentialRate(e.target.checked)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${usePreferentialRate ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${usePreferentialRate ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-700">
                    Áp dụng lãi suất ưu đãi ban đầu
                  </div>
                </label>

                {usePreferentialRate && (
                  <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lãi suất ưu đãi</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={preferentialRate}
                          onChange={(e) => setPreferentialRate(e.target.value)}
                          className="w-full pl-3 pr-14 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%/năm</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Thời gian ưu đãi</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={preferentialTermMonths}
                          onChange={(e) => setPreferentialTermMonths(e.target.value)}
                          className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Tháng</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">Phương thức tính lãi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCalculationMethod('declining')}
                    className={`py-2 px-4 text-sm font-medium rounded-lg border transition-all ${
                      calculationMethod === 'declining' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Dư nợ giảm dần
                  </button>
                  <button
                    onClick={() => setCalculationMethod('original')}
                    className={`py-2 px-4 text-sm font-medium rounded-lg border transition-all ${
                      calculationMethod === 'original' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Dư nợ ban đầu
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3 flex items-start gap-1">
                  <Info className="w-4 h-4 shrink-0" />
                  {calculationMethod === 'declining' 
                    ? 'Tiền lãi giảm dần theo số dư nợ thực tế. Phổ biến nhất khi vay mua nhà đất.'
                    : 'Tiền lãi tính trên số tiền gốc ban đầu trong suốt thời gian vay. Thường dùng vay tiêu dùng.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Dashboard */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500 rounded-full opacity-50 blur-xl"></div>
              <p className="text-blue-100 text-sm font-medium mb-1">Thanh toán tháng đầu</p>
              <h3 className="text-3xl font-bold mb-2">{formatCurrency(summary.firstMonthPayment)}</h3>
              {calculationMethod === 'declining' && (
                <p className="text-blue-200 text-xs flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                  Giảm dần các tháng sau
                </p>
              )}
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center">
              <p className="text-gray-500 text-sm font-medium mb-1">Tổng tiền phải trả</p>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{formatCurrency(summary.totalPayment)}</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Gốc: <span className="font-medium text-gray-900">{formatCurrency(summary.totalPrincipal)}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600">Lãi: <span className="font-medium text-emerald-600">{formatCurrency(summary.totalInterest)}</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800">Phân bổ & Lộ trình trả nợ</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-500">Tổng cộng</span>
                  <span className="text-sm font-bold text-gray-800">{new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(summary.totalPayment)}</span>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Tổng gốc</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600">Tổng lãi</span>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={areaData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorGoc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLai" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value)}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="Gốc" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGoc)" />
                    <Area type="monotone" dataKey="Lãi" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLai)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Schedule Table */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800">Lịch trả nợ chi tiết</h2>
          </div>
          <div className="flex gap-2 relative no-print">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Xuất dữ liệu
            </button>

            <AnimatePresence>
              {isExportMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-30 py-2"
                  >
                    <button
                      onClick={handleExportPDF}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      Xuất file PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Table className="w-4 h-4 text-green-600" />
                      Xuất file Excel
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Calculator className="w-4 h-4 text-gray-500" />
                      In lịch trả nợ
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Kỳ trả nợ</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Dư nợ đầu kỳ</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Gốc phải trả</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Lãi phải trả</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Tổng thanh toán</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Dư nợ còn lại</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.month} className="bg-white border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    Tháng {row.month}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {new Intl.NumberFormat('vi-VN').format(Math.round(row.beginningBalance))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {new Intl.NumberFormat('vi-VN').format(Math.round(row.principalPayment))}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                    {new Intl.NumberFormat('vi-VN').format(Math.round(row.interestPayment))}
                  </td>
                  <td className="px-6 py-4 text-right text-blue-600 font-medium">
                    {new Intl.NumberFormat('vi-VN').format(Math.round(row.totalPayment))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {new Intl.NumberFormat('vi-VN').format(Math.round(row.remainingBalance))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Rates Modal */}
      <AnimatePresence>
        {isBankModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBankModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Lãi suất vay các ngân hàng</h3>
                    <p className="text-blue-100 text-xs">Cập nhật mới nhất tháng 04/2026</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsBankModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 font-bold">Ngân hàng</th>
                        <th className="px-6 py-4 font-bold text-center">Lãi suất ưu đãi</th>
                        <th className="px-6 py-4 font-bold text-center">Lãi suất sau ưu đãi</th>
                        <th className="px-6 py-4 font-bold text-center">Thời gian ưu đãi</th>
                        <th className="px-6 py-4 font-bold text-center">Vay tối đa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bankRates.map((bank, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setPreferentialRate(bank.preferentialRate.toString());
                            setInterestRate(bank.normalRate.toString());
                            setPreferentialTermMonths('12');
                            setIsBankModalOpen(false);
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-blue-600 text-xs">
                                {bank.logo}
                              </div>
                              <span className="font-bold text-gray-900">{bank.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                              {bank.preferentialRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-gray-700">
                            {bank.normalRate}%
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600">
                            {bank.term}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600">
                            {bank.maxLoan}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    * Lưu ý: Bảng lãi suất trên chỉ mang tính chất tham khảo. Lãi suất thực tế có thể thay đổi tùy theo từng thời điểm, khu vực và điều kiện hồ sơ của khách hàng. Vui lòng liên hệ trực tiếp ngân hàng để có thông tin chính xác nhất. 
                    <br />
                    <strong>Mẹo:</strong> Nhấp vào một ngân hàng để tự động áp dụng lãi suất vào bảng tính.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
