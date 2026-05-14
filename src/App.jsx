import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, Clock, Calendar, CheckCircle, XCircle, Info, Settings, Users, 
  LogOut, AlertTriangle, Upload, Download, Eye, Trash2,
  RefreshCw, LayoutGrid, BookOpen, Coffee, CalendarDays, BarChart3, 
  Wallet, TrendingUp, DollarSign, Camera, UserCheck, 
  Users2, ArrowRight, ShieldCheck, Map, Save
} from 'lucide-react';

// Lokasi Default: Asrama Putra Program Tahfidzul Qur'an MTs Plus Al Hidayah Kroya
const INITIAL_CONFIG = {
  locationName: "Asrama Tahfidz Al Hidayah",
  lat: -7.630951,
  lng: 109.260551,
  radius: 300,
  baseSalary: 1200000,
  lateDeduction: 10000,
  incentivePerSession: 25000,
  lateTolerance: 10,
  activeHolidays: []
};

const App = () => {
  // --- State Utama ---
  const [user, setUser] = useState({ id: 1, name: 'Ust. Fajar', role: 'admin' });
  const [view, setView] = useState('admin'); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // FIX: Sidebar tertutup secara default
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [simulationMode, setSimulationMode] = useState(true);
  const [config, setConfig] = useState(INITIAL_CONFIG);
  
  // Data Lokasi
  const [location, setLocation] = useState({ lat: null, lng: null, distance: 0, accuracy: null });
  const [isLocationValid, setIsLocationValid] = useState(true);

  // Data Kehadiran
  const [attendanceData, setAttendanceData] = useState([]);
  const [permissions, setPermissions] = useState([]);
  
  // State Kamera
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStep, setCameraStep] = useState(1);
  const [tempPhotos, setTempPhotos] = useState({ ustadz: null, murid: null });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Modal Izin & Konfirmasi
  const [isPermitOpen, setIsPermitOpen] = useState(false);
  const [permitForm, setPermitForm] = useState({ type: 'Izin', reason: '', isFullDay: true, selectedSessions: [] });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, msg: '', onConfirm: null });

  // Jadwal Ngaji
  const [schedules, setSchedules] = useState([
    { id: 1, name: 'Ngaji Shubuh', start: '05:00', end: '06:30', active: true },
    { id: 2, name: 'Ngaji Ashar', start: '16:00', end: '17:30', active: true },
    { id: 3, name: 'Ngaji Maghrib/Isya', start: '18:15', end: '20:00', active: true },
  ]);

  const [ustadzList, setUstadzList] = useState([
    { id: 1, name: 'Ust. Fajar', role: 'admin', username: 'admin', password: '123' },
    { id: 4, name: 'Bpk. Manajemen', role: 'manajemen', username: 'manajemen', password: '123' },
    { id: 2, name: 'Ust. Ahmad', role: 'ustadz', username: 'ahmad', password: '123' },
    { id: 3, name: 'Ust. Hamzah', role: 'ustadz', username: 'hamzah', password: '123' },
  ]);

  // Modul User Form Admin
  const [userForm, setUserForm] = useState({ id: null, name: '', username: '', password: '', role: 'ustadz' });
  const [schForm, setSchForm] = useState({ id: null, name: '', start: '', end: '' });

  // --- Logic Sistem ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = currentTime.toLocaleDateString('id-ID');

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, config.lat, config.lng);
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist.toFixed(0), accuracy: pos.coords.accuracy });
      setIsLocationValid(dist <= config.radius);
    }, null, { enableHighAccuracy: true });
  }, [config.lat, config.lng, config.radius]);

  const activeSession = schedules.find(s => {
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hS, mS] = s.start.split(':').map(Number);
    const [hE, mE] = s.end.split(':').map(Number);
    return nowMin >= (hS * 60 + mS) && nowMin <= (hE * 60 + mE);
  });

  const getLateMinutes = () => {
    if (!activeSession) return 0;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hS, mS] = activeSession.start.split(':').map(Number);
    const startMin = hS * 60 + mS;
    return nowMin > startMin ? nowMin - startMin : 0;
  };

  const getEarlyMinutes = () => {
    if (!activeSession) return 0;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hE, mE] = activeSession.end.split(':').map(Number);
    const endMin = hE * 60 + mE;
    return nowMin < endMin ? endMin - nowMin : 0;
  };

  const lateMinutes = getLateMinutes();
  const earlyMinutes = getEarlyMinutes();

  // FIX: Kamera Anti Layar Hitam & Anti Ditolak
  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null; // Pastikan memori kamera benar-benar dikosongkan
    }
  };

  const startCamera = async (step = 1) => {
    stopStream();
    setCameraOpen(true);
    setCameraStep(step);
    if(step === 1) setTempPhotos({ ustadz: null, murid: null });
    
    // Trik Jeda Waktu agar hardware kamera HP sempat 'bernapas' saat perpindahan
    setTimeout(async () => {
       try {
         const facing = step === 1 ? 'user' : 'environment';
         const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } 
         });
         
         if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.log("Play error:", e)); // Paksa play untuk HP iPhone/Safari
         }
       } catch (err) {
         console.warn("Kamera spesifik gagal, mencoba kamera cadangan...", err);
         
         // Fallback (Percobaan Kedua): Panggil kamera apapun jika kamera utama/belakang ditolak sistem
         try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
               videoRef.current.srcObject = fallbackStream;
               videoRef.current.play();
            }
         } catch (fallbackErr) {
            alert("Akses kamera ditolak/gagal! Pastikan:\n1. Bapak sudah menekan 'Allow/Izinkan' saat browser meminta akses.\n2. Aplikasi ini dibuka menggunakan link HTTPS yang aman.\n3. Kamera HP tidak sedang dipakai oleh aplikasi lain (seperti WA/Zoom).");
            setCameraOpen(false);
         }
       }
    }, 400); // 400ms delay agar sangat aman
  };

  const capture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const img = canvas.toDataURL('image/jpeg');
      if (cameraStep === 1) setTempPhotos(prev => ({ ...prev, ustadz: img }));
      else setTempPhotos(prev => ({ ...prev, murid: img }));
    }
  };

  const submitAttendance = () => {
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isLate = lateMinutes > config.lateTolerance;
    
    const record = {
      id: Date.now(), userId: user.id, userName: user.name, date: todayStr,
      timeIn: ts, timeOut: '-', session: activeSession?.name || 'Sesi Ngaji',
      status: isLate ? 'Terlambat' : 'Hadir',
      lateMin: lateMinutes, earlyMin: 0,
      photoUstadz: tempPhotos.ustadz, photoMurid: tempPhotos.murid
    };
    setAttendanceData([record, ...attendanceData]);
    stopStream();
    setCameraOpen(false);
  };

  const submitLogout = () => {
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setAttendanceData(attendanceData.map(a => 
      (a.userId === user.id && a.date === todayStr && a.timeOut === '-') 
      ? { ...a, timeOut: ts, earlyMin: earlyMinutes } 
      : a
    ));
  };

  // Logic Izin 
  const submitPermit = (e) => {
    e.preventDefault();
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    if (permitForm.isFullDay) {
       const record = {
          id: Date.now(), userId: user.id, userName: user.name, date: todayStr,
          timeIn: ts, timeOut: ts, session: 'Satu Hari Penuh', status: permitForm.type,
          lateMin: 0, earlyMin: 0, note: permitForm.reason
       };
       setPermissions([record, ...permissions]);
       setAttendanceData([record, ...attendanceData]); // Masukkan ke riwayat utama agar terkunci
    } else {
       permitForm.selectedSessions.forEach((sName, index) => {
          const record = {
             id: Date.now() + index, userId: user.id, userName: user.name, date: todayStr,
             timeIn: ts, timeOut: ts, session: sName, status: permitForm.type,
             lateMin: 0, earlyMin: 0, note: permitForm.reason
          };
          setPermissions([record, ...permissions]);
          setAttendanceData([record, ...attendanceData]);
       });
    }
    setIsPermitOpen(false);
    setPermitForm({ type: 'Izin', reason: '', isFullDay: true, selectedSessions: [] });
    alert(`Pengajuan ${permitForm.type} Berhasil Disimpan!`);
  };

  const calculateTotalSalary = (uId) => {
    const uData = attendanceData.filter(a => a.userId === uId && (a.status === 'Hadir' || a.status === 'Terlambat'));
    const bonus = uData.length * config.incentivePerSession;
    const lates = uData.filter(a => a.status === 'Terlambat').length;
    const denda = lates * config.lateDeduction;
    return config.baseSalary + bonus - denda;
  };

  // FIX: CUSTOM PDF GENERATOR (Anti-Blocker & Clean Margin)
  const downloadPDFReport = () => {
    try {
      // Menggunakan Iframe tak terlihat agar aman dari Pop-up blocker browser
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const tableRows = attendanceData.length === 0 
        ? '<tr><td colspan="4" style="text-align: center; padding: 20px;">Belum ada data kehadiran</td></tr>'
        : attendanceData.map(a => {
            let keterangan = a.status;
            if (a.lateMin > config.lateTolerance) keterangan += ` (Telat ${a.lateMin} Mnt)`;
            if (a.earlyMin > 0) keterangan += ` (Pulang Cepat ${a.earlyMin} Mnt)`;
            if (a.note) keterangan += ` - ${a.note}`;
            
            return `
              <tr>
                 <td>${a.date}</td>
                 <td style="font-weight: bold;">${a.userName}</td>
                 <td>${a.status === 'Izin' || a.status === 'Sakit' ? '-' : `${a.timeIn} s/d ${a.timeOut}`}</td>
                 <td>${keterangan}</td>
              </tr>
            `;
          }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
           <head>
              <title>Laporan Kehadiran - ${config.locationName}</title>
              <style>
                 @media print {
                    @page { margin: 1cm; size: auto; }
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                 }
                 body { font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                 .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                 h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; }
                 p { margin: 0; color: #555; font-size: 12px; }
                 table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
                 th { background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
                 td { padding: 8px 10px; border: 1px solid #e2e8f0; }
                 .footer { margin-top: 40px; text-align: right; font-size: 12px; }
                 .signature { margin-top: 60px; font-weight: bold; }
              </style>
           </head>
           <body>
              <div class="header">
                 <h1>LAPORAN KEHADIRAN USTADZ</h1>
                 <p>${config.locationName}</p>
                 <p>Bulan: ${currentTime.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
              </div>
              <table>
                 <thead>
                    <tr>
                       <th width="15%">Tanggal</th>
                       <th width="25%">Nama Ustadz</th>
                       <th width="25%">Waktu Ngaji</th>
                       <th width="35%">Keterangan</th>
                    </tr>
                 </thead>
                 <tbody>${tableRows}</tbody>
              </table>
              <div class="footer">
                 <p>Mengetahui,</p>
                 <p class="signature">Admin / Pengurus Asrama</p>
              </div>
           </body>
        </html>
      `;

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Beri waktu sedikit agar browser memuat HTML sebelum diprint
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 500);

    } catch (error) {
      alert("Gagal mengunduh PDF. Pastikan browser mendukung fitur cetak.");
      console.error(error);
    }
  };

  // --- Navigasi Sidebar ---
  const handleNav = (targetView) => {
    setView(targetView);
    setIsSidebarOpen(false); // Otomatis menutup sidebar jika menu diklik
  };

  const StatusBadge = ({ type }) => {
    const styles = { 'Hadir': 'bg-emerald-100 text-emerald-700', 'Izin': 'bg-sky-100 text-sky-700', 'Sakit': 'bg-amber-100 text-amber-700', 'Terlambat': 'bg-rose-100 text-rose-700' };
    return <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${styles[type] || 'bg-slate-100 text-slate-600'}`}>{type}</span>;
  };

  // --- RENDER SIDEBAR ---
  const Sidebar = () => (
    <>
      {/* Overlay Gelap Untuk HP */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r shadow-2xl transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md"><ShieldCheck size={24} /></div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight">AL HIDAYAH</h1>
              <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">Portal Absensi</p>
            </div>
          </div>
          {/* Tombol Tutup Sidebar Keren (Berlaku Desktop & HP) */}
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white border shadow-sm text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all hover:rotate-90">
            <XCircle size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          {user.role === 'admin' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-4 mb-2">Menu Administrator</p>
              <button onClick={() => handleNav('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutGrid size={18} /> Dashboard Admin</button>
              <button onClick={() => handleNav('admin-users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={18} /> Kelola Ustadz</button>
              <button onClick={() => handleNav('admin-sch')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-sch' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><CalendarDays size={18} /> Jadwal & Libur</button>
              <button onClick={() => handleNav('admin-loc')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-loc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Map size={18} /> Zona Lokasi</button>
              <button onClick={() => handleNav('admin-set')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-set' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> Pengaturan Aplikasi</button>
            </>
          )}
          {user.role === 'manajemen' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-4 mb-2">Menu Manajemen</p>
              <button onClick={() => handleNav('management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'management' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={18} /> Monitoring Gaji</button>
              <button onClick={() => handleNav('admin-set')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-set' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> Parameter Keuangan</button>
            </>
          )}
          {user.role === 'ustadz' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-4 mb-2">Menu Ustadz</p>
              <button onClick={() => handleNav('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Camera size={18} /> Absensi Ngaji</button>
              <button onClick={() => handleNav('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><FileText size={18} /> Riwayat Saya</button>
            </>
          )}
        </nav>

        <div className="p-6 border-t bg-slate-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
            <div className="overflow-hidden"><p className="text-sm font-bold truncate">{user.name}</p><p className="text-[10px] text-slate-500 uppercase font-bold">{user.role}</p></div>
          </div>
          <button className="w-full flex items-center gap-2 justify-center px-4 py-2.5 text-rose-600 bg-white border shadow-sm hover:bg-rose-50 rounded-xl transition text-xs font-bold"><LogOut size={16} /> Keluar Akun</button>
        </div>
      </aside>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-800 flex">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        
        {/* Header Responsif */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Tombol Hamburger Untuk Buka Menu (Selalu Muncul) */}
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-50 border shadow-sm rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all">
               <LayoutGrid size={20} />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-black tracking-tight">{view.includes('admin') ? 'Portal Administrator' : view === 'management' ? 'Portal Manajemen' : "Assalamu'alaikum"}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{config.locationName}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-lg font-black leading-none text-slate-800">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
             </div>
             {user.role === 'ustadz' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg border text-xs font-bold">
                   <MapPin size={14} className={isLocationValid || simulationMode ? "text-emerald-500" : "text-rose-500"} />
                   {isLocationValid || simulationMode ? 'Area Valid' : 'Luar Area'}
                </div>
             )}
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-32">
          
          {/* VIEW: ADMIN (Dashboard Utama) */}
          {(view === 'admin' || view === 'management') && (
            <div className="space-y-6 animate-in fade-in duration-500">
               {/* Kalkulasi Alpa & Disiplin */}
               <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
                     <h4 className="font-bold text-slate-800">Rekapitulasi Kehadiran & Alpa (Bulan Ini)</h4>
                     <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">Target: {schedules.length * 30} Sesi/Bulan</span>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           <tr>
                              <th className="p-4">Nama Ustadz</th>
                              <th className="p-4 text-center">Total Hadir</th>
                              <th className="p-4 text-center">Total Izin/Sakit</th>
                              <th className="p-4 text-center text-rose-500">Alpa (Belum Absen)</th>
                              <th className="p-4 text-center">Estimasi Gaji</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {ustadzList.filter(u => u.role === 'ustadz').map(u => {
                              const attend = attendanceData.filter(a => a.userId === u.id && (a.status === 'Hadir' || a.status === 'Terlambat')).length;
                              const permit = attendanceData.filter(a => a.userId === u.id && (a.status === 'Izin' || a.status === 'Sakit')).length;
                              const alpa = (schedules.length * 30) - attend - permit;
                              return (
                                 <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{u.name}</td>
                                    <td className="p-4 text-center font-bold text-emerald-600">{attend} Sesi</td>
                                    <td className="p-4 text-center font-bold text-sky-600">{permit} Hari</td>
                                    <td className="p-4 text-center font-black text-rose-500">{alpa > 0 ? alpa : 0} Sesi</td>
                                    <td className="p-4 text-center font-black text-indigo-600">Rp {calculateTotalSalary(u.id).toLocaleString('id-ID')}</td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Audit 1:1 Foto & PDF */}
               <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-5 border-b bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                     <h4 className="font-bold text-slate-800">Verifikasi Foto Ganda</h4>
                     <button onClick={downloadPDFReport} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-rose-700 text-xs shadow-md transition">
                        <Download size={16}/> Unduh Laporan PDF
                     </button>
                  </div>
                  <div className="overflow-x-auto p-4">
                     {attendanceData.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold italic">Belum ada data absensi untuk diverifikasi.</div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {attendanceData.map(a => (
                              <div key={a.id} className="p-4 border rounded-2xl bg-white shadow-sm flex flex-col gap-4">
                                 <div className="flex gap-2">
                                    <div className="flex-1 h-32 bg-slate-100 rounded-xl overflow-hidden relative border">
                                       {a.photoUstadz ? <img src={a.photoUstadz} className="w-full h-full object-cover"/> : <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-400">NO FOTO</div>}
                                       <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] font-bold px-2 py-0.5 rounded-md">USTADZ</div>
                                    </div>
                                    <div className="flex-1 h-32 bg-slate-100 rounded-xl overflow-hidden relative border">
                                       {a.photoMurid ? <img src={a.photoMurid} className="w-full h-full object-cover"/> : <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-400">NO FOTO</div>}
                                       <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] font-bold px-2 py-0.5 rounded-md">SANTRI</div>
                                    </div>
                                 </div>
                                 <div>
                                    <div className="flex items-center justify-between mb-1">
                                       <p className="font-bold text-slate-800">{a.userName}</p>
                                       <StatusBadge type={a.status} />
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{a.session} | {a.date}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-1">Waktu: {a.timeIn} - {a.timeOut}</p>
                                    {a.lateMin > 0 && <p className="text-[10px] font-bold text-rose-500 mt-0.5">Telat: {a.lateMin} Menit</p>}
                                    {a.earlyMin > 0 && <p className="text-[10px] font-bold text-amber-500 mt-0.5">Pulang Cepat: {a.earlyMin} Menit</p>}
                                    {a.note && <p className="text-[10px] font-medium text-slate-500 italic mt-1">"{a.note}"</p>}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: KELOLA USER (Admin) */}
          {view === 'admin-users' && (
             <div className="bg-white rounded-2xl border shadow-sm p-6 animate-in fade-in">
                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Users size={20} className="text-indigo-600"/> Manajemen Akun Ustadz</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-xl border mb-6">
                   <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</label><input type="text" className="w-full p-2.5 bg-white border rounded-lg font-bold text-sm" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} /></div>
                   <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Username</label><input type="text" className="w-full p-2.5 bg-white border rounded-lg font-bold text-sm" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} /></div>
                   <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                      <input type="text" className="w-full p-2.5 bg-white border rounded-lg font-bold text-sm" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                   </div>
                   <button onClick={() => {
                      if(!userForm.name || !userForm.username) return alert("Nama & Username wajib diisi!");
                      if(userForm.id) setUstadzList(ustadzList.map(u => u.id === userForm.id ? {...u, ...userForm} : u));
                      else setUstadzList([...ustadzList, {...userForm, id: Date.now()}]);
                      setUserForm({ id: null, name: '', username: '', password: '', role: 'ustadz' });
                      alert("User Disimpan!");
                   }} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700">Simpan User</button>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-4">Nama</th><th className="p-4">Username</th><th className="p-4">Password</th><th className="p-4">Aksi</th></tr></thead>
                      <tbody className="divide-y">
                         {ustadzList.filter(u => u.role === 'ustadz').map(u => (
                           <tr key={u.id} className="hover:bg-slate-50">
                              <td className="p-4 font-bold text-slate-800">{u.name}</td>
                              <td className="p-4">{u.username}</td>
                              <td className="p-4 font-mono font-bold text-indigo-600">{u.password}</td>
                              <td className="p-4 flex gap-3">
                                 <button onClick={() => setUserForm(u)} className="text-indigo-600 font-bold text-xs">Edit</button>
                                 <button onClick={() => { if(window.confirm("Hapus user ini?")) setUstadzList(ustadzList.filter(x => x.id !== u.id)); }} className="text-rose-600 font-bold text-xs">Hapus</button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {/* VIEW: JADWAL & LIBUR (Admin) */}
          {view === 'admin-sch' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="bg-white rounded-2xl border shadow-sm p-6">
                   <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock size={20} className="text-indigo-600"/> Jadwal Ngaji Harian</h4>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-xl border mb-6">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Nama Sesi</label><input type="text" className="w-full p-2.5 bg-white border rounded-lg font-bold text-sm" value={schForm.name} onChange={e => setSchForm({...schForm, name: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Jam Masuk</label><input type="time" className="w-full p-2.5 bg-white border rounded-lg font-bold text-sm" value={schForm.start} onChange={e => setSchForm({...schForm, start: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Jam Pulang</label><input type="time" className="w-full p-2.5 bg-white border rounded-lg font-bold text-sm" value={schForm.end} onChange={e => setSchForm({...schForm, end: e.target.value})} /></div>
                      <button onClick={() => {
                         if(!schForm.name || !schForm.start) return alert("Nama & Jam wajib diisi!");
                         if(schForm.id) setSchedules(schedules.map(s => s.id === schForm.id ? {...s, ...schForm} : s));
                         else setSchedules([...schedules, {...schForm, id: Date.now(), active: true}]);
                         setSchForm({ id: null, name: '', start: '', end: '' });
                         alert("Jadwal Disimpan!");
                      }} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700">Simpan Jadwal</button>
                   </div>
                   <div className="space-y-3">
                      {schedules.map(s => (
                         <div key={s.id} className="flex justify-between items-center p-4 border rounded-xl bg-white shadow-sm">
                            <div><p className="font-bold text-slate-800">{s.name}</p><p className="text-xs font-mono text-indigo-600 mt-1">{s.start} - {s.end}</p></div>
                            <div className="flex gap-4">
                               <button onClick={() => setSchForm(s)} className="text-indigo-600 font-bold text-xs">Edit</button>
                               <button onClick={() => { if(window.confirm("Hapus jadwal?")) setSchedules(schedules.filter(x => x.id !== s.id)); }} className="text-rose-600 font-bold text-xs">Hapus</button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm p-6">
                   <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><CalendarDays size={20} className="text-indigo-600"/> Manajemen Libur Khusus</h4>
                   <div className="flex gap-4 mb-6">
                      <input type="date" id="newHoliday" className="p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none" />
                      <button onClick={() => {
                         const val = document.getElementById('newHoliday').value;
                         if(val) { 
                            const d = new Date(val).toLocaleDateString('id-ID');
                            setConfig({...config, activeHolidays: [...config.activeHolidays, d]}); 
                            document.getElementById('newHoliday').value = ''; 
                            alert("Hari Libur Ditambahkan!");
                         }
                      }} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md">Tambah Libur</button>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {config.activeHolidays.map(h => (
                         <span key={h} className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-bold text-sm flex items-center gap-3">
                            {h} <button onClick={() => setConfig({...config, activeHolidays: config.activeHolidays.filter(x => x !== h)})} className="hover:text-rose-500"><XCircle size={16}/></button>
                         </span>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {/* VIEW: PENGATURAN APLIKASI & ZONA (Admin / Manajemen) */}
          {(view === 'admin-set' || view === 'admin-loc') && (
             <div className="space-y-6 animate-in fade-in">
                {view === 'admin-loc' && (
                  <div className="bg-white rounded-2xl border shadow-sm p-6">
                     <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Map size={20} className="text-indigo-600"/> Koordinat Asrama (GPS)</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Latitude</label><input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold font-mono text-sm" value={config.lat} onChange={e => setConfig({...config, lat: parseFloat(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Longitude</label><input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold font-mono text-sm" value={config.lng} onChange={e => setConfig({...config, lng: parseFloat(e.target.value)})} /></div>
                     </div>
                     <button onClick={() => alert("Lokasi Disimpan!")} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md">Simpan Lokasi</button>
                  </div>
                )}
                
                <div className="bg-white rounded-2xl border shadow-sm p-6">
                   <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Wallet size={20} className="text-indigo-600"/> Parameter Keuangan (Gaji & Denda)</h4>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Gaji Pokok</label><input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" value={config.baseSalary} onChange={e => setConfig({...config, baseSalary: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Bonus Sesi</label><input type="number" className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-bold text-sm text-emerald-700" value={config.incentivePerSession} onChange={e => setConfig({...config, incentivePerSession: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Denda Telat</label><input type="number" className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl font-bold text-sm text-rose-600" value={config.lateDeduction} onChange={e => setConfig({...config, lateDeduction: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Toleransi Telat (Menit)</label><input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" value={config.lateTolerance} onChange={e => setConfig({...config, lateTolerance: parseInt(e.target.value) || 0})} /></div>
                   </div>
                   <button onClick={(e) => { e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ TERSIMPAN"; e.target.classList.add('bg-emerald-600'); setTimeout(()=> {e.target.innerText="Simpan Parameter"; e.target.classList.remove('bg-emerald-600');}, 2000)}, 800) }} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md transition-colors">Simpan Parameter</button>
                </div>
             </div>
          )}

          {/* VIEW: DASHBOARD USTADZ */}
          {view === 'dashboard' && (
             <div className="space-y-6 animate-in fade-in duration-500">
                {isHoliday && (
                   <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex items-center gap-4">
                      <div className="bg-amber-500 p-3 rounded-xl text-white"><Coffee size={24}/></div>
                      <div><h4 className="font-bold text-amber-900 text-lg">Hari Libur</h4><p className="text-amber-700 text-sm font-medium">Asrama hari ini diliburkan. Selamat istirahat.</p></div>
                   </div>
                )}

                <div className="bg-white p-8 rounded-2xl border shadow-sm text-center">
                   <h3 className="text-2xl font-black text-slate-800 mb-2">{isHoliday ? 'Diliburkan' : activeSession ? activeSession.name : 'Jadwal Ngaji Belum Mulai'}</h3>
                   <p className="text-sm font-bold text-slate-400 mb-8">{activeSession ? `Jam: ${activeSession.start} - ${activeSession.end}` : 'Tunggu waktu jadwal berikutnya'}</p>

                   {/* Peringatan Waktu (Telat / Cepat) */}
                   {activeSession && !isHoliday && lateMinutes > config.lateTolerance && !attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession.name) && (
                      <div className="mb-6 inline-block bg-orange-50 text-orange-600 px-6 py-3 rounded-xl font-bold text-sm border border-orange-100 animate-pulse">Peringatan: Anda Terlambat {lateMinutes} Menit!</div>
                   )}
                   {earlyMinutes > 0 && attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession.name && a.timeOut === '-') && (
                      <div className="mb-6 inline-block bg-rose-50 text-rose-600 px-6 py-3 rounded-xl font-bold text-sm border border-rose-100 animate-pulse">Peringatan: Pulang Terlalu Cepat {earlyMinutes} Menit!</div>
                   )}

                   <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto">
                      {!attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession?.name) ? (
                         <button onClick={() => startCamera(1)} disabled={isHoliday || (!isLocationValid && !simulationMode) || !activeSession} className={`flex-1 py-5 rounded-xl font-black text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${isHoliday || (!isLocationValid && !simulationMode) || !activeSession ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                            <Camera size={24} /> Absen Masuk
                         </button>
                      ) : (
                         attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession?.name && a.timeOut !== '-') ? (
                            <button disabled className="flex-1 py-5 bg-emerald-50 text-emerald-600 font-black text-lg rounded-xl border border-emerald-200 cursor-not-allowed">Sesi Selesai</button>
                         ) : (
                            <button onClick={submitLogout} disabled={isHoliday || (!isLocationValid && !simulationMode)} className="flex-1 py-5 rounded-xl font-black text-lg transition-all shadow-lg flex items-center justify-center gap-3 bg-rose-500 text-white hover:bg-rose-600">
                               <LogOut size={24} /> Absen Pulang
                            </button>
                         )
                      )}
                      
                      {/* Tombol Izin Terkunci Jika Sudah Izin */}
                      <button 
                         onClick={() => setIsPermitOpen(true)} 
                         disabled={attendanceData.some(a => a.userId === user.id && a.date === todayStr && (a.status === 'Izin' || a.status === 'Sakit') && (a.session === 'Satu Hari Penuh' || a.session === activeSession?.name))}
                         className="px-8 py-5 border-2 border-slate-200 text-slate-500 font-black text-lg rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-100"
                      >
                         <AlertTriangle size={20} /> Izin
                      </button>
                   </div>
                </div>

                {/* Riwayat Pribadi Tabel */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                   <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800">Riwayat Presensi Saya</h4></div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-white border-b text-[10px] font-bold text-slate-400 uppercase">
                            <tr><th className="p-4">Tanggal</th><th className="p-4">Waktu Ngaji</th><th className="p-4">Masuk</th><th className="p-4">Pulang</th><th className="p-4">Keterangan</th></tr>
                         </thead>
                         <tbody className="divide-y">
                            {attendanceData.filter(a => a.userId === user.id).length === 0 ? <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold italic">Belum ada riwayat.</td></tr> : attendanceData.filter(a => a.userId === user.id).slice(0,10).map(a => (
                               <tr key={a.id} className="hover:bg-slate-50">
                                  <td className="p-4 font-bold text-slate-800">{a.date}</td>
                                  <td className="p-4 font-bold text-indigo-700">{a.session}</td>
                                  <td className="p-4 font-mono text-slate-600">{a.timeIn}</td>
                                  <td className="p-4 font-mono text-slate-600">{a.status === 'Izin' || a.status === 'Sakit' ? '-' : a.timeOut}</td>
                                  <td className="p-4">
                                     <StatusBadge type={a.status} />
                                     {a.lateMin > config.lateTolerance && <p className="text-[10px] font-bold text-rose-500 mt-1">Telat: {a.lateMin} Menit</p>}
                                     {a.earlyMin > 0 && <p className="text-[10px] font-bold text-amber-500 mt-1">Pulang Cepat: {a.earlyMin} Menit</p>}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {/* --- MODAL KAMERA (Double Capture Fix) --- */}
          {cameraOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
                <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                   <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                      <div><h3 className="text-2xl font-black tracking-tight">{cameraStep === 1 ? 'Foto Ustadz' : 'Foto Santri'}</h3><p className="text-[10px] font-bold uppercase tracking-widest mt-1">Langkah {cameraStep} / 2</p></div>
                      <button onClick={() => { stopStream(); setCameraOpen(false); }} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition"><XCircle size={24}/></button>
                   </div>
                   <div className="p-8 space-y-6">
                      <div className={`p-4 rounded-xl text-center font-bold text-xs uppercase tracking-widest ${cameraStep===1?'bg-indigo-50 text-indigo-600':'bg-emerald-50 text-emerald-600'}`}>
                         {cameraStep===1?'1. Silakan Selfie Wajah':'2. Silakan Foto Suasana Ngaji'}
                      </div>
                      <div className="relative aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner">
                         {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                           <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${cameraStep === 1 ? 'transform rotate-y-180' : ''}`} />
                         ) : (
                           <div className="relative w-full h-full">
                              <img src={cameraStep===1 ? tempPhotos.ustadz : tempPhotos.murid} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><span className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-black text-sm shadow-lg">FOTO TERSIMPAN ✓</span></div>
                           </div>
                         )}
                         <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex gap-4">
                         {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                           <button onClick={capture} className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition"><Camera size={24} className="inline mr-2"/> Ambil Foto</button>
                         ) : (
                           <>
                             <button onClick={() => cameraStep === 1 ? setTempPhotos({...tempPhotos, ustadz: null}) : setTempPhotos({...tempPhotos, murid: null})} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-lg hover:bg-slate-200 transition">Ulangi</button>
                             {cameraStep === 1 ? (
                               <button onClick={() => startCamera(2)} className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition">Lanjut <ArrowRight size={20} className="inline ml-1"/></button>
                             ) : (
                               <button onClick={submitAttendance} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 active:scale-95 transition animate-bounce"><CheckCircle size={24} className="inline mr-2"/> Kirim Absen</button>
                             )}
                           </>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* --- MODAL IZIN (COMPACT) --- */}
          {isPermitOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                   <div className="p-6 bg-indigo-600 text-white text-center"><h3 className="text-2xl font-black tracking-tight">Form Izin / Sakit</h3></div>
                   <form onSubmit={submitPermit} className="p-6 space-y-6">
                      <div className="flex gap-4">
                         {['Izin', 'Sakit'].map(t => (
                           <label key={t} className={`flex-1 flex items-center justify-center py-4 rounded-xl border-2 cursor-pointer font-black text-lg transition ${permitForm.type === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                              <input type="radio" className="hidden" name="permitType" value={t} checked={permitForm.type === t} onChange={(e) => setPermitForm({...permitForm, type: e.target.value})} />{t}
                           </label>
                         ))}
                      </div>
                      <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                         <label className="flex items-center gap-3 font-bold text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={permitForm.isFullDay} onChange={e => setPermitForm({...permitForm, isFullDay: e.target.checked, selectedSessions: []})} className="w-5 h-5 text-indigo-600 rounded" /> Izin Satu Hari Penuh
                         </label>
                         {!permitForm.isFullDay && (
                            <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                               <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Sesi Ngaji:</p>
                               {schedules.map(s => (
                                  <label key={s.id} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 py-2 rounded-lg border shadow-sm cursor-pointer hover:border-indigo-200 transition">
                                     <input type="checkbox" checked={permitForm.selectedSessions.includes(s.name)} onChange={e => { const ns = e.target.checked ? [...permitForm.selectedSessions, s.name] : permitForm.selectedSessions.filter(x=>x!==s.name); setPermitForm({...permitForm, selectedSessions: ns}); }} className="w-4 h-4 text-indigo-600 rounded" /> {s.name}
                                  </label>
                               ))}
                            </div>
                         )}
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Alasan</label>
                         <textarea required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-200 min-h-[100px]" placeholder="Misal: Sakit demam..." value={permitForm.reason} onChange={(e) => setPermitForm({...permitForm, reason: e.target.value})}></textarea>
                      </div>
                      <div className="flex gap-4 pt-2">
                         <button type="button" onClick={() => setIsPermitOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest text-xs">TUTUP</button>
                         <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition uppercase tracking-widest">SIMPAN IZIN</button>
                      </div>
                   </form>
                </div>
             </div>
          )}

        </div>
      </main>

      {/* Sesi Pengujian Role - Bawah Layar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl scale-90 md:scale-100">
         <div className="flex gap-2">
            {['admin', 'manajemen', 'ustadz'].map(r => (
              <button key={r} onClick={() => { setUser({...user, role: r}); setView(r === 'manajemen' ? 'management' : r === 'admin' ? 'admin' : 'dashboard'); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${user.role === r ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{r}</button>
            ))}
         </div>
         <button onClick={() => setSimulationMode(!simulationMode)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${simulationMode ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>Dev Mode</button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
        .zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;