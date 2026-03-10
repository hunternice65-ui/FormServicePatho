import React, { useState, useEffect } from 'react';
import { 
  User, 
  FileText, 
  Clock, 
  Presentation, 
  Beaker, 
  Wrench, 
  HandHelping, 
  MoreHorizontal, 
  Search,
  ChevronRight,
  LogOut,
  Settings,
  Bell
} from 'lucide-react';
import { UserProfile, ServiceRequest, DOCTORS, REQUEST_TYPES } from './types';
import liff from '@line/liff';
import { motion, AnimatePresence } from 'motion/react';

const LIFF_ID = "2001660324-RmYPaWAj";

export default function App() {
  const [liffUser, setLiffUser] = useState<{ userId: string; displayName: string; pictureUrl?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'menu' | 'profile' | 'form' | 'status' | 'admin'>('menu');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [adminRequests, setAdminRequests] = useState<ServiceRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLiffUser({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
          });
          
          // Check if admin
          if (profile.userId === "Ufe0c7b62214f28847e54440cb58e7267") {
            setIsAdmin(true);
          }

          // Fetch user profile from DB
          const res = await fetch(`/api/user/${profile.userId}`);
          const userData = await res.json();
          if (userData) {
            setProfile(userData);
          } else {
            setView('profile');
          }
        } else {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF init failed", err);
      } finally {
        setLoading(false);
      }
    };
    initLiff();
  }, []);

  const fetchUserRequests = async () => {
    if (!liffUser) return;
    const res = await fetch(`/api/requests/${liffUser.userId}`);
    const data = await res.json();
    setRequests(data);
  };

  const fetchAdminRequests = async () => {
    const res = await fetch(`/api/admin/requests`);
    const data = await res.json();
    setAdminRequests(data);
  };

  useEffect(() => {
    if (view === 'status') fetchUserRequests();
    if (view === 'admin') fetchAdminRequests();
  }, [view]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      lineUserId: liffUser!.userId,
      name: formData.get('name') as string,
      position: formData.get('position') as string,
      department: formData.get('department') as string,
      phone: formData.get('phone') as string,
    };

    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setProfile(data);
      setView('menu');
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineUserId: liffUser!.userId,
        type: selectedType,
        data,
      }),
    });

    if (res.ok) {
      alert("ส่งคำร้องเรียบร้อยแล้ว");
      setView('menu');
    }
  };

  const updateRequestStatus = async (id: number, status: string, adminNote: string) => {
    const res = await fetch(`/api/admin/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote }),
    });
    if (res.ok) {
      fetchAdminRequests();
      alert("อัพเดตสถานะเรียบร้อยแล้ว");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-primary text-white p-6 rounded-b-3xl shadow-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {liffUser?.pictureUrl && (
              <img src={liffUser.pictureUrl} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white/20" />
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{liffUser?.displayName}</h1>
              <p className="text-white/70 text-sm">ยินดีต้อนรับสู่ระบบติดตาม</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button onClick={() => setView('admin')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <Settings size={20} />
              </button>
            )}
            <button onClick={() => setView('profile')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4">
        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 gap-4"
            >
              <h2 className="font-bold text-slate-800 mb-2 px-2">เลือกบริการที่ต้องการ</h2>
              
              <MenuButton 
                icon={<FileText className="text-blue-500" />} 
                title={REQUEST_TYPES.REVIEW} 
                onClick={() => { setSelectedType(REQUEST_TYPES.REVIEW); setView('form'); }}
              />
              <MenuButton 
                icon={<Clock className="text-orange-500" />} 
                title={REQUEST_TYPES.URGENT} 
                onClick={() => { setSelectedType(REQUEST_TYPES.URGENT); setView('form'); }}
              />
              <MenuButton 
                icon={<Presentation className="text-purple-500" />} 
                title={REQUEST_TYPES.CONFERENCE} 
                onClick={() => { setSelectedType(REQUEST_TYPES.CONFERENCE); setView('form'); }}
              />
              <MenuButton 
                icon={<Beaker className="text-emerald-500" />} 
                title={REQUEST_TYPES.REAGENTS} 
                onClick={() => { setSelectedType(REQUEST_TYPES.REAGENTS); setView('form'); }}
              />
              <MenuButton 
                icon={<Wrench className="text-slate-500" />} 
                title={REQUEST_TYPES.EQUIPMENT} 
                onClick={() => { setSelectedType(REQUEST_TYPES.EQUIPMENT); setView('form'); }}
              />
              <MenuButton 
                icon={<HandHelping className="text-rose-500" />} 
                title={REQUEST_TYPES.BORROW} 
                onClick={() => { setSelectedType(REQUEST_TYPES.BORROW); setView('form'); }}
              />
              <MenuButton 
                icon={<MoreHorizontal className="text-indigo-500" />} 
                title={REQUEST_TYPES.OTHERS} 
                onClick={() => { setSelectedType(REQUEST_TYPES.OTHERS); setView('form'); }}
              />
              
              <div className="mt-6">
                <button 
                  onClick={() => setView('status')}
                  className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                      <Search size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">ติดตามสถานะ</p>
                      <p className="text-xs text-slate-500">ตรวจสอบคำร้องของคุณ</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-400" />
                </button>
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="text-primary" /> ข้อมูลส่วนตัว
              </h2>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <Input label="ชื่อ-นามสกุล ผู้ขอใช้บริการ" name="name" defaultValue={profile?.name} required />
                <Input label="ตำแหน่ง" name="position" defaultValue={profile?.position} required />
                <Input label="หน่วยงาน" name="department" defaultValue={profile?.department} required />
                <Input label="เบอร์โทรติดต่อ" name="phone" type="tel" defaultValue={profile?.phone} required />
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                  บันทึกข้อมูล
                </button>
                {profile && (
                  <button type="button" onClick={() => setView('menu')} className="w-full text-slate-500 py-2">
                    ยกเลิก
                  </button>
                )}
              </form>
            </motion.div>
          )}

          {view === 'form' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
            >
              <h2 className="text-lg font-bold mb-6 text-slate-800">{selectedType}</h2>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                {selectedType === REQUEST_TYPES.REVIEW || selectedType === REQUEST_TYPES.URGENT ? (
                  <>
                    <Input label="หมายเลขพยาธิ" name="pathologyId" required />
                    <Input label="ลงทะเบียนรับวันที่" name="receivedDate" type="date" required />
                    <Select label="พยาธิแพทย์" name="doctor" options={DOCTORS} required />
                    <TextArea label={selectedType === REQUEST_TYPES.REVIEW ? "เหตุผลการขอทบทวน" : "เหตุผลการขอตามผลด่วน"} name="reason" required />
                    <TextArea label="สรุปผล" name="summary" />
                  </>
                ) : selectedType === REQUEST_TYPES.CONFERENCE ? (
                  <>
                    <Select label="หนังสือจากภาควิชา" name="hasLetter" options={["มีหนังสือจากภาควิชา", "ไม่มีหนังสือจากภาควิชา"]} required />
                    <Select label="ประเภทการประชุม" name="conferenceType" options={["SPC (Surgico-Pathological Conference)", "MM (Dead case conference)", "ประชุมวิชาการอื่นๆ"]} required />
                    <Input label="ชื่อการประชุม" name="conferenceName" required />
                    <Input label="วันที่ประชุม" name="conferenceDate" type="date" required />
                    <Input label="เวลาจัดการประชุม" name="conferenceTime" type="time" required />
                    <Input label="สถานที่ประชุม" name="location" required />
                    <Input label="หมายเลขพยาธิ" name="pathologyId" required />
                    <Input label="ลงทะเบียนรับวันที่" name="receivedDate" type="date" required />
                    <Select label="พยาธิแพทย์" name="doctor" options={DOCTORS} required />
                  </>
                ) : (
                  <>
                    <TextArea label="ระบุรายละเอียด" name="details" required />
                    <TextArea label="หมายเหตุ / เหตุผลการขอใช้บริการ" name="reason" required />
                  </>
                )}
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20">
                  ส่งคำร้อง
                </button>
                <button type="button" onClick={() => setView('menu')} className="w-full text-slate-500 py-2">
                  กลับหน้าเมนู
                </button>
              </form>
            </motion.div>
          )}

          {view === 'status' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="font-bold text-slate-800">ติดตามสถานะการขอใช้บริการ</h2>
                <button onClick={() => setView('menu')} className="text-primary text-sm font-medium">กลับหน้าเมนู</button>
              </div>
              {requests.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={48} className="mx-auto mb-2 opacity-20" />
                  <p>ยังไม่มีรายการคำร้อง</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded-lg">{req.type}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        req.status === 'เสร็จสิ้น' ? 'bg-emerald-50 text-emerald-600' : 
                        req.status === 'กำลังดำเนินการ' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                      {req.data.pathologyId ? `หมายเลขพยาธิ: ${req.data.pathologyId}` : req.data.details}
                    </p>
                    <p className="text-[10px] text-slate-400 mb-2">{new Date(req.createdAt).toLocaleString('th-TH')}</p>
                    {req.adminNote && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-1">หมายเหตุจากแอดมิน:</p>
                        <p className="text-xs text-slate-700">{req.adminNote}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="font-bold text-slate-800">จัดการคำร้อง (Admin)</h2>
                <button onClick={() => setView('menu')} className="text-primary text-sm font-medium">กลับหน้าเมนู</button>
              </div>
              {adminRequests.map((req) => (
                <AdminRequestCard key={req.id} request={req} onUpdate={updateRequestStatus} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MenuButton({ icon, title, onClick }: { icon: React.ReactNode, title: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-all shadow-sm border border-slate-100 group active:scale-95"
    >
      <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="font-bold text-slate-700 text-sm text-left flex-1">{title}</span>
      <ChevronRight size={18} className="text-slate-300" />
    </button>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
      <input 
        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
        {...props}
      />
    </div>
  );
}

function TextArea({ label, ...props }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
      <textarea 
        rows={3}
        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
        {...props}
      />
    </div>
  );
}

function Select({ label, options, ...props }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
      <select 
        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
        {...props}
      >
        <option value="">เลือก...</option>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function AdminRequestCard({ request, onUpdate }: { request: ServiceRequest, onUpdate: (id: number, status: string, note: string) => void }) {
  const [status, setStatus] = useState(request.status);
  const [note, setNote] = useState(request.adminNote || "");

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">{request.type}</span>
          <h3 className="font-bold text-slate-800 mt-1">{request.userName}</h3>
          <p className="text-xs text-slate-500">{request.userPhone}</p>
        </div>
        <span className="text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleDateString('th-TH')}</span>
      </div>
      
      <div className="bg-slate-50 p-3 rounded-2xl text-xs text-slate-600 space-y-1">
        {Object.entries(request.data).map(([key, val]: [string, any]) => (
          <p key={key}><span className="font-bold">{key}:</span> {val}</p>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <Select 
          label="อัพเดตสถานะ" 
          value={status} 
          onChange={(e: any) => setStatus(e.target.value)}
          options={["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น", "ยกเลิก"]}
        />
        <TextArea 
          label="หมายเหตุตอบกลับ" 
          value={note} 
          onChange={(e: any) => setNote(e.target.value)}
        />
        <button 
          onClick={() => onUpdate(request.id!, status, note)}
          className="w-full bg-slate-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
        >
          บันทึกและแจ้งเตือนผู้ใช้
        </button>
      </div>
    </div>
  );
}
