import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { 
  Users, 
  UserPlus, 
  LogOut, 
  Phone, 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  Plus,
  X,
  Save,
  Trash2,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  status: 'new' | 'contacting' | 'negotiating' | 'closed' | 'lost';
  assignedTo: string;
  notes: { text: string; createdAt: any }[];
  createdAt: any;
  updatedAt: any;
}

interface StaffProfile {
  uid: string;
  name: string;
  email: string;
  role: 'staff' | 'admin';
}

export const CRMPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'staff'>('leads');
  const [allStaff, setAllStaff] = useState<StaffProfile[]>([]);

  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'CRM Manual'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch profile
        const profileDoc = await getDoc(doc(db, 'staff_profiles', currentUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as StaffProfile);
        } else {
          // Create a default profile if it doesn't exist (first time staff login)
          const newProfile: StaffProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Nhân viên',
            email: currentUser.email || '',
            role: 'staff'
          };
          await setDoc(doc(db, 'staff_profiles', currentUser.uid), {
            ...newProfile,
            role: currentUser.email === 'nguyendai.thqv@gmail.com' ? 'admin' : 'staff',
            createdAt: serverTimestamp()
          });
          setProfile({
            ...newProfile,
            role: currentUser.email === 'nguyendai.thqv@gmail.com' ? 'admin' : 'staff'
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin' && activeTab === 'staff') {
      const q = query(collection(db, 'staff_profiles'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const staffData = snapshot.docs.map(doc => doc.data() as StaffProfile);
        setAllStaff(staffData);
      });
      return () => unsubscribe();
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (!user) return;

    let q = query(collection(db, 'leads'), orderBy('updatedAt', 'desc'));
    
    // If not admin, only show assigned leads
    if (profile?.role !== 'admin') {
      q = query(collection(db, 'leads'), where('assignedTo', '==', user.uid), orderBy('updatedAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadsData);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      if (isRegistering) {
        setLoginError('Không thể đăng ký. Có thể email đã tồn tại hoặc mật khẩu quá yếu.');
      } else {
        setLoginError('Email hoặc mật khẩu không đúng.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setLoginError('Không thể đăng nhập bằng Google.');
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'leads'), {
        ...newLead,
        status: 'new',
        assignedTo: user.uid,
        notes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewLead({ name: '', phone: '', email: '', source: 'CRM Manual' });
    } catch (error) {
      console.error('Error adding lead:', error);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: 'staff' | 'admin') => {
    try {
      await updateDoc(doc(db, 'staff_profiles', uid), {
        role: newRole
      });
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleAddNote = async (leadId: string) => {
    if (!newNote.trim()) return;
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const updatedNotes = [
        { text: newNote, createdAt: new Date().toISOString() },
        ...lead.notes
      ];

      await updateDoc(doc(db, 'leads', leadId), {
        notes: updatedNotes,
        updatedAt: serverTimestamp()
      });
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         lead.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'contacting': return 'bg-yellow-100 text-yellow-700';
      case 'negotiating': return 'bg-purple-100 text-purple-700';
      case 'closed': return 'bg-green-100 text-green-700';
      case 'lost': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Mới';
      case 'contacting': return 'Đang liên hệ';
      case 'negotiating': return 'Đang thương lượng';
      case 'closed': return 'Đã chốt';
      case 'lost': return 'Tạm dừng';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-navy-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users size={32} />
            </div>
            <h1 className="text-2xl font-bold text-navy-900">CRM Bom Bo Real</h1>
            <p className="text-gray-500">{isRegistering ? 'Tạo tài khoản nhân viên mới' : 'Đăng nhập dành cho nhân viên'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-navy-900 outline-none transition-all"
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-navy-900 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle size={14} /> {loginError}
              </p>
            )}
            <button 
              type="submit"
              className="w-full bg-navy-900 text-white py-4 rounded-xl font-bold hover:bg-navy-800 transition-all shadow-lg transform hover:-translate-y-1"
            >
              {isRegistering ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              TIẾP TỤC VỚI GOOGLE
            </button>

            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-navy-900 font-bold hover:underline"
              >
                {isRegistering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy-900 text-white rounded-xl flex items-center justify-center shadow-md">
                <Users size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-navy-900">Bom Bo CRM</h1>
                <p className="text-xs text-gray-400">Xin chào, {profile?.name} {profile?.role === 'admin' && <span className="text-navy-900 font-bold">(Admin)</span>}</p>
              </div>
            </div>

            {profile?.role === 'admin' && (
              <nav className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('leads')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-navy-900'}`}
                >
                  Khách hàng
                </button>
                <button 
                  onClick={() => setActiveTab('staff')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'staff' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-navy-900'}`}
                >
                  Nhân viên
                </button>
              </nav>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
        {activeTab === 'leads' ? (
          <>
            {/* Sidebar / List */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-navy-900">Danh sách khách hàng</h2>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="p-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tìm tên, số điện thoại..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-navy-900 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['all', 'new', 'contacting', 'negotiating', 'closed', 'lost'].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        statusFilter === status 
                          ? 'bg-navy-900 text-white' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'Tất cả' : getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {filteredLeads.map(lead => (
                  <motion.div
                    key={lead.id}
                    layoutId={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      selectedLead?.id === lead.id 
                        ? 'bg-white border-navy-900 shadow-md' 
                        : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-navy-900">{lead.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusColor(lead.status)}`}>
                        {getStatusLabel(lead.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Phone size={12} /> {lead.phone}
                    </div>
                    {profile?.role === 'admin' && (
                      <div className="flex items-center gap-1 text-[10px] text-navy-900 font-bold mt-2">
                        <ShieldCheck size={10} /> NV: {allStaff.find(s => s.uid === lead.assignedTo)?.name || 'Hệ thống'}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {new Date(lead.updatedAt?.seconds * 1000).toLocaleDateString('vi-VN')}
                      </span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </motion.div>
                ))}
                {filteredLeads.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Users size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Không tìm thấy khách hàng nào</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detail View */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              {selectedLead ? (
                <>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h2 className="text-2xl font-bold text-navy-900">{selectedLead.name}</h2>
                      <div className="flex gap-4 mt-2">
                        <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-1 text-sm text-navy-900 hover:underline">
                          <Phone size={14} /> {selectedLead.phone}
                        </a>
                        {selectedLead.email && (
                          <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-1 text-sm text-navy-900 hover:underline">
                            <Mail size={14} /> {selectedLead.email}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <select 
                        className={`px-4 py-2 rounded-xl text-sm font-bold outline-none border-none shadow-sm ${getStatusColor(selectedLead.status)}`}
                        value={selectedLead.status}
                        onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
                      >
                        <option value="new">Mới</option>
                        <option value="contacting">Đang liên hệ</option>
                        <option value="negotiating">Đang thương lượng</option>
                        <option value="closed">Đã chốt</option>
                        <option value="lost">Tạm dừng</option>
                      </select>
                      <span className="text-[10px] text-gray-400">Nguồn: {selectedLead.source}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Notes Section */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Lịch sử chăm sóc</h3>
                      
                      <div className="flex gap-2 mb-6">
                        <input 
                          type="text" 
                          placeholder="Thêm ghi chú mới..."
                          className="flex-1 px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-navy-900 outline-none"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddNote(selectedLead.id)}
                        />
                        <button 
                          onClick={() => handleAddNote(selectedLead.id)}
                          className="p-2 bg-navy-900 text-white rounded-xl hover:bg-navy-800 transition-all"
                        >
                          <Plus size={20} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {selectedLead.notes.map((note, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-2xl relative">
                            <p className="text-gray-700 text-sm">{note.text}</p>
                            <span className="text-[10px] text-gray-400 block mt-2">
                              {new Date(note.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        ))}
                        {selectedLead.notes.length === 0 && (
                          <div className="text-center py-8 text-gray-300 italic text-sm">
                            Chưa có ghi chú nào.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-12 text-center">
                  <MessageSquare size={64} className="mb-4 opacity-20" />
                  <h3 className="text-xl font-bold">Chọn một khách hàng</h3>
                  <p className="max-w-xs">Chọn khách hàng từ danh sách bên trái để xem chi tiết và cập nhật tiến độ chăm sóc.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-2xl font-bold text-navy-900">Quản lý nhân viên</h2>
              <p className="text-sm text-gray-500">Phân quyền và quản lý tài khoản nhân viên trong hệ thống.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allStaff.map(staff => (
                  <div key={staff.uid} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-navy-900 text-white rounded-full flex items-center justify-center font-bold text-xl">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-navy-900">{staff.name}</h3>
                        <p className="text-xs text-gray-500">{staff.email}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-1 text-xs font-bold text-navy-900">
                        <UserCog size={14} /> {staff.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                      </div>
                      {staff.email !== 'nguyendai.thqv@gmail.com' && (
                        <button 
                          onClick={() => handleUpdateRole(staff.uid, staff.role === 'admin' ? 'staff' : 'admin')}
                          className="text-[10px] font-bold text-navy-900 hover:underline"
                        >
                          Chuyển sang {staff.role === 'admin' ? 'Nhân viên' : 'Admin'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-navy-900">Thêm khách hàng mới</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddLead} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-navy-900 outline-none"
                    value={newLead.name}
                    onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại *</label>
                  <input 
                    type="tel" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-navy-900 outline-none"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-navy-900 outline-none"
                    value={newLead.email}
                    onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-navy-900 text-white py-3 rounded-xl font-bold hover:bg-navy-800 shadow-lg"
                  >
                    LƯU KHÁCH HÀNG
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};
