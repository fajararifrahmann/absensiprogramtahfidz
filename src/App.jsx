import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, Clock, Calendar, CheckCircle, XCircle, Info, Settings, Users, 
  FileText, LogOut, AlertTriangle, Upload, Download, Eye, EyeOff, Trash2, Plus, 
  LayoutGrid, BookOpen, CalendarDays, BarChart3, UserCircle, Menu, Camera,
  Award, TrendingUp, RefreshCw, Lock, User, LogIn, Map, Save, ShieldCheck
} from 'lucide-react';

const INITIAL_CONFIG = {
  appName: "AL HIDAYAH",
  slogan: "Portal Absensi",
  logoUrl: "",
  locationName: "Asrama Tahfidz Al Hidayah",
  lat: -7.630951,
  lng: 109.260551,
  radius: 300,
  baseSalary: 1250000,
  lateDeduction: 10000,
  incentivePerSession: 25000,
  lateTolerance: 10,
  activeHolidays: []
};

const App = () => {
  // --- LOGIN & AUTH STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // --- MAIN APP STATES ---
  const [view, setView] = useState(''); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // DEFAULT SELALU TERTUTUP
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, msg: '', onConfirm: null });

  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [location, setLocation] = useState({ lat: null, lng: null, distance: 0, accuracy: null });
  const [isLocationValid, setIsLocationValid] = useState(true);

  const [attendanceData, setAttendanceData] = useState([]);
  const [permissions, setPermissions] = useState([]);
  
  // Camera & Modal
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStep, setCameraStep] = useState(1);
  const [tempPhotos, setTempPhotos] = useState({ ustadz: null, murid: null });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [isPermitOpen, setIsPermitOpen] = useState(false);
  const [permitForm, setPermitForm] = useState({ type: 'Izin', reason: '', isFullDay: true, selectedSessions: [] });

  const [schedules, setSchedules] = useState([
    { id: 1, name: 'Ngaji Shubuh', start: '05:00', end: '06:30', active: true },
    { id: 2, name: 'Ngaji Ashar', start: '16:00', end: '17:30', active: true },
    { id: 3, name: 'Ngaji Maghrib/Isya', start: '18:15', end: '20:00', active: true },
  ]);

  const [ustadzList, setUstadzList] = useState([
    { id: 1, name: 'Ust. Fajar', role: 'admin', username: 'admin', password: '123' },
    { id: 99, name: 'Bpk. Manajemen', role: 'manajemen', username: 'manajemen', password: '123' },
    { id: 2, name: 'Ust. Ahmad', role: 'ustadz', username: 'ahmad', password: '123' },
    { id: 3, name: 'Ust. Hamzah', role: 'ustadz', username: 'hamzah', password: '123' },
  ]);

  const [userForm, setUserForm] = useState({ id: null, name: '', username: '', password: '', role: 'ustadz' });
  const [schForm, setSchForm] = useState({ id: null, name: '', start: '', end: '' });

  useEffect(() => {
    const isSaved = localStorage.getItem('simpanLogin') === 'true';
    if (isSaved) {
       setRememberMe(true);
       setLoginForm({
          username: localStorage.getItem('savedUsername') || '',
          password: localStorage.getItem('savedPassword') || ''
       });
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = currentTime.toLocaleDateString('id-ID');
  const isHoliday = config.activeHolidays.includes(todayStr);

  const showToastMsg = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

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

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, config.lat, config.lng);
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist.toFixed(0), accuracy: pos.coords.accuracy.toFixed(0) });
      setIsLocationValid(dist <= config.radius);
    }, null, { enableHighAccuracy: true });
  }, [config.lat, config.lng, config.radius]);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const getActiveSession = () => {
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    return schedules.find(s => {
      const [hS, mS] = s.start.split(':').map(Number);
      const [hE, mE] = s.end.split(':').map(Number);
      return nowMin >= (hS * 60 + mS) && nowMin <= (hE * 60 + mE);
    });
  };
  const activeSession = getActiveSession();

  const lateMinutes = (() => {
    if (!activeSession) return 0;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hS, mS] = activeSession.start.split(':').map(Number);
    const startMin = hS * 60 + mS;
    return nowMin > startMin ? nowMin - startMin : 0;
  })();

  const earlyMinutes = (() => {
    if (!activeSession) return 0;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hE, mE] = activeSession.end.split(':').map(Number);
    const endMin = hE * 60 + mE;
    return nowMin < endMin ? endMin - nowMin : 0;
  })();

  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (step = 1) => {
    stopStream();
    setCameraOpen(true);
    setCameraStep(step);
    if(step === 1) setTempPhotos({ ustadz: null, murid: null });
    
    // Memberi nafas 400ms pada hardware HP sebelum menyalakan kamera baru
    setTimeout(async () => {
       try {
         const facing = step === 1 ? 'user' : 'environment';
         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 } } });
         if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.log("Play error:", e));
         }
       } catch (err) {
         try {
            // JURUS FALLBACK: Jika kamera spesifik (depan/belakang) ditolak, paksa nyalakan kamera apa pun yang tersedia
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) { videoRef.current.srcObject = fallbackStream; videoRef.current.play(); }
         } catch (fallbackErr) {
            alert("Akses kamera ditolak. Pastikan browser mengizinkan kamera dan Anda membuka link dari HTTPS.");
            setCameraOpen(false);
         }
       }
    }, 400);
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
      timeIn: ts, timeOut: '-', session: activeSession?.name || 'Sesi Ngaji', sessionId: activeSession?.id,
      status: isLate ? 'Terlambat' : 'Hadir',
      lateMin: lateMinutes, earlyMin: 0,
      photoUstadz: tempPhotos.ustadz, photoMurid: tempPhotos.murid
    };
    setAttendanceData([record, ...attendanceData]);
    stopStream(); setCameraOpen(false); showToastMsg("Berhasil Absen Masuk!");
  };

  const submitLogout = () => {
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setAttendanceData(attendanceData.map(a => 
      (a.userId === user.id && a.date === todayStr && a.timeOut === '-') 
      ? { ...a, timeOut: ts, earlyMin: earlyMinutes } : a
    ));
    showToastMsg("Berhasil Absen Pulang!");
  };

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
       setAttendanceData([record, ...attendanceData]); 
    } else {
       permitForm.selectedSessions.forEach((sId, index) => {
          const sName = schedules.find(x => x.id === sId)?.name;
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
    showToastMsg(`Data ${permitForm.type} Tersimpan!`);
  };

  const calculateTotalSalary = (uId) => {
    const uData = attendanceData.filter(a => a.userId === uId && (a.status === 'Hadir' || a.status === 'Terlambat'));
    const bonus = uData.length * config.incentivePerSession;
    const lates = uData.filter(a => a.status === 'Terlambat').length;
    const denda = lates * config.lateDeduction;
    return config.baseSalary + bonus - denda;
  };

  // --- PDF GENERATOR (Diperbarui dengan Timeout) ---
  const downloadPDFReport = () => {
    try {
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
              <title>Laporan Kehadiran</title>
              <style>
                 @page { margin: 15mm; size: auto; }
                 body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #333; line-height: 1.5; }
                 .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                 h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; }
                 p { margin: 0; color: #555; font-size: 12px; }
                 table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; page-break-inside: auto; }
                 tr { page-break-inside: avoid; page-break-after: auto; }
                 th { background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
                 td { padding: 8px 10px; border: 1px solid #e2e8f0; }
                 .footer { margin-top: 40px; text-align: right; font-size: 12px; page-break-inside: avoid; }
                 .signature { margin-top: 60px; font-weight: bold; }
              </style>
           </head>
           <body>
              <div class="header">
                 <h1>LAPORAN KEHADIRAN USTADZ</h1>
                 <p>${config.locationName}</p>
                 <p>Periode Bulan Ini</p>
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
      doc.open(); doc.write(htmlContent); doc.close();
      
      // Delay agar DOM tabel selesai dimuat sebelum Print dialog terbuka
      setTimeout(() => { 
         iframe.contentWindow.focus(); 
         iframe.contentWindow.print(); 
         setTimeout(() => document.body.removeChild(iframe), 1000); 
      }, 500);
    } catch (err) { 
       alert("Gagal mengunduh PDF. Pastikan browser mendukung cetak."); 
    }
  };

  const renderLoginScreen = () => {
    const handleLoginSubmit = (e) => {
       e.preventDefault();
       setLoginError('');
       const foundUser = ustadzList.find(u => u.username === loginForm.username && u.password === loginForm.password);
       if (foundUser) {
           if (rememberMe) {
               localStorage.setItem('simpanLogin', 'true');
               localStorage.setItem('savedUsername', loginForm.username);
               localStorage.setItem('savedPassword', loginForm.password);
           } else {
               localStorage.removeItem('simpanLogin'); localStorage.removeItem('savedUsername'); localStorage.removeItem('savedPassword');
           }
           setUser(foundUser);
           setIsLoggedIn(true);
           setView(foundUser.role === 'admin' ? 'admin' : foundUser.role === 'manajemen' ? 'management' : 'dashboard');
           setIsSidebarOpen(false); // PASTIKAN SIDEBAR TERTUTUP SAAT LOGIN
           showToastMsg(`Selamat datang, ${foundUser.name}`);
       } else {
           setLoginError('Kredensial tidak valid! Periksa Username & Password.');
       }
    };

    return (
       <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900"></div>
          <div className="max-w-sm w-full bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden relative z-10">
             <div className="px-8 pt-10 pb-6 text-center">
                {config.logoUrl ? (
                   <div className="mx-auto w-32 h-32 flex items-center justify-center mb-6">
                      <img src={config.logoUrl} className="w-full h-full object-contain drop-shadow-xl" alt="Logo" />
                   </div>
                ) : (
                   <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-indigo-600 to-indigo-400 p-1 rounded-2xl shadow-lg flex items-center justify-center mb-6">
                      <div className="w-full h-full bg-white rounded-xl flex items-center justify-center"><BookOpen size={40} className="text-indigo-600"/></div>
                   </div>
                )}
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{config.appName}</h1>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{config.slogan}</p>
             </div>
             <form onSubmit={handleLoginSubmit} className="px-8 pb-10 space-y-5">
                {loginError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold text-center border border-rose-100">{loginError}</div>}
                <div className="space-y-1">
                   <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                      <input type="text" required className="w-full py-3 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="Username..." />
                   </div>
                </div>
                <div className="space-y-1 relative">
                   <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                      <input type={showLoginPassword ? "text" : "password"} required className="w-full py-3 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="Password..." />
                      <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition">
                         {showLoginPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                   </div>
                </div>
                <div className="flex items-center gap-2 pt-1 pl-1">
                   <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 cursor-pointer" />
                   <label htmlFor="remember" className="text-xs font-bold text-slate-500 cursor-pointer">Simpan Info Login</label>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-md hover:bg-indigo-700 transition mt-2">MASUK SISTEM</button>
             </form>
          </div>
       </div>
    );
  };

  const StatusBadge = ({ type }) => {
    const styles = { 'Hadir': 'bg-emerald-100 text-emerald-700', 'Izin': 'bg-sky-100 text-sky-700', 'Sakit': 'bg-amber-100 text-amber-700', 'Terlambat': 'bg-rose-100 text-rose-700' };
    return <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${styles[type] || 'bg-slate-100 text-slate-600'}`}>{type}</span>;
  };

  // FUNGSI INI AKAN MENUTUP SIDEBAR OTOMATIS SAAT MENU DIKLIK
  const handleNav = (targetView) => {
    setView(targetView);
    setIsSidebarOpen(false); 
  };

  if (!isLoggedIn) return renderLoginScreen();

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-800 flex">
      {/* Overlay Gelap Untuk Semua Device Saat Sidebar Terbuka */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      {/* Sidebar - DIUBAH AGAR DEFAULT TERTUTUP DI DESKTOP JUGA */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r shadow-2xl transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm"><ShieldCheck size={24} /></div>
            <div><h1 className="font-bold text-base leading-tight">AL HIDAYAH</h1><p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">Portal Absensi</p></div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white border shadow-sm text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all hover:rotate-90">
            <XCircle size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          {user.role === 'admin' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-2 mb-2">Menu Administrator</p>
              <button onClick={() => handleNav('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutGrid size={18} /> Dashboard Admin</button>
              <button onClick={() => handleNav('admin-users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={18} /> Kelola Ustadz</button>
              <button onClick={() => handleNav('admin-sch')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-sch' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><CalendarDays size={18} /> Jadwal & Libur</button>
              <button onClick={() => handleNav('admin-loc')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-loc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Map size={18} /> Zona Lokasi</button>
              <button onClick={() => handleNav('admin-set')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-set' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> Pengaturan Aplikasi</button>
            </>
          )}
          {user.role === 'manajemen' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-2 mb-2">Menu Manajemen</p>
              <button onClick={() => handleNav('management')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'management' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={18} /> Monitoring Gaji</button>
            </>
          )}
          {user.role === 'ustadz' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-2 mb-2">Menu Ustadz</p>
              <button onClick={() => handleNav('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Camera size={18} /> Absensi Ngaji</button>
            </>
          )}
        </nav>
        <div className="p-6 border-t bg-slate-50">
          <button onClick={() => { setIsLoggedIn(false); setUser(null); }} className="w-full flex items-center gap-2 justify-center px-4 py-2.5 text-rose-600 bg-white border shadow-sm hover:bg-rose-50 rounded-xl transition text-xs font-bold"><LogOut size={16} /> Keluar Akun</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-50 border shadow-sm rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all">
               <LayoutGrid size={20} />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-black tracking-tight">{view.includes('admin') ? 'Portal Admin' : view === 'management' ? 'Portal Manajemen' : "Assalamu'alaikum"}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{config.locationName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-lg font-black leading-none text-slate-800">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{todayStr}</p>
             </div>
             
             {/* Dropdown Profil Kanan Atas */}
             <div className="relative">
                <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black border border-indigo-200 hover:bg-indigo-200 transition">
                   {user.name.charAt(0)}
                </button>
                {isProfileDropdownOpen && (
                   <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in">
                      <div className="p-4 bg-slate-50 border-b">
                         <p className="text-sm font-black text-slate-800 truncate">{user.name}</p>
                         <p className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">{user.role}</p>
                      </div>
                      <button onClick={() => { setIsLoggedIn(false); setUser(null); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition"><LogOut size={16}/> Keluar Aplikasi</button>
                   </div>
                )}
             </div>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-32">
          
          {/* VIEW: DASHBOARD USTADZ */}
          {view === 'dashboard' && (
             <div className="space-y-6 animate-in fade-in duration-500">
                {isHoliday && (
                   <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex items-center gap-4">
                      <div className="bg-amber-500 p-3 rounded-xl text-white"><Coffee size={24}/></div>
                      <div><h4 className="font-bold text-amber-900 text-lg">Hari Libur</h4><p className="text-amber-700 text-sm font-medium">Asrama hari ini diliburkan.</p></div>
                   </div>
                )}

                <div className="bg-white p-8 rounded-2xl border shadow-sm text-center">
                   <h3 className="text-2xl font-black text-slate-800 mb-2">{isHoliday ? 'Diliburkan' : activeSession ? activeSession.name : 'Jadwal Ngaji Belum Mulai'}</h3>
                   <p className="text-sm font-bold text-slate-400 mb-8">{activeSession ? `Jam: ${activeSession.start} - ${activeSession.end}` : 'Tunggu waktu jadwal berikutnya'}</p>

                   {activeSession && !isHoliday && lateMinutes > config.lateTolerance && !attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession.name) && (
                      <div className="mb-6 inline-block bg-orange-50 text-orange-600 px-6 py-3 rounded-xl font-bold text-sm border border-orange-100 animate-pulse">Terlambat {lateMinutes} Menit!</div>
                   )}
                   {earlyMinutes > 0 && attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession.name && a.timeOut === '-') && (
                      <div className="mb-6 inline-block bg-rose-50 text-rose-600 px-6 py-3 rounded-xl font-bold text-sm border border-rose-100 animate-pulse">Peringatan: Pulang Terlalu Cepat {earlyMinutes} Menit!</div>
                   )}

                   <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto">
                      {!attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession?.name) ? (
                         <button onClick={() => startCamera(1)} disabled={isHoliday || (!isLocationValid && !simulationMode) || !activeSession} className={`flex-1 py-5 rounded-xl font-black text-lg transition-all shadow-md flex items-center justify-center gap-3 ${isHoliday || (!isLocationValid && !simulationMode) || !activeSession ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                            <Camera size={24} /> Absen Masuk
                         </button>
                      ) : (
                         attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.session === activeSession?.name && a.timeOut !== '-') ? (
                            <button disabled className="flex-1 py-5 bg-emerald-50 text-emerald-600 font-black text-lg rounded-xl border border-emerald-200 cursor-not-allowed">Sesi Selesai</button>
                         ) : (
                            <button onClick={submitLogout} disabled={isHoliday || (!isLocationValid && !simulationMode)} className="flex-1 py-5 rounded-xl font-black text-lg transition-all shadow-md flex items-center justify-center gap-3 bg-rose-500 text-white hover:bg-rose-600">
                               <LogOut size={24} /> Absen Pulang
                            </button>
                         )
                      )}
                      <button onClick={() => setIsPermitOpen(true)} disabled={attendanceData.some(a => a.userId === user.id && a.date === todayStr && (a.status === 'Izin' || a.status === 'Sakit') && (a.session === 'Satu Hari Penuh' || a.session === activeSession?.name))} className="px-8 py-5 border-2 border-slate-200 text-slate-500 font-black text-lg rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2 disabled:opacity-50">
                         <AlertTriangle size={20} /> Izin
                      </button>
                   </div>
                   
                   <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-500 border">
                      <MapPin size={14} className={isLocationValid || simulationMode ? "text-emerald-500" : "text-rose-500"}/>
                      GPS Akurasi: ±{location.accuracy}m | Jarak: {location.distance}m
                      <button onClick={fetchLocation} className="ml-2 text-indigo-600 p-1 hover:bg-indigo-50 rounded"><RefreshCw size={14}/></button>
                   </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                   <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800">Riwayat Presensi Pribadi</h4></div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-white border-b text-[10px] font-bold text-slate-400 uppercase">
                            <tr><th className="p-4">Tanggal</th><th className="p-4">Waktu Ngaji</th><th className="p-4">Masuk</th><th className="p-4">Pulang</th><th className="p-4">Keterangan</th></tr>
                         </thead>
                         <tbody className="divide-y">
                            {attendanceData.filter(a => a.userId === user.id).slice(0,10).map(a => (
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

          {/* VIEW: ADMIN / MANAGEMENT */}
          {(view === 'admin' || view === 'management') && (
            <div className="space-y-6 animate-in fade-in duration-500">
               {/* Kalkulasi Alpa & Disiplin */}
               <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
                     <h4 className="font-bold text-slate-800">Rekapitulasi Kehadiran & Kalkulasi Gaji</h4>
                     <button onClick={downloadPDFReport} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 text-xs shadow-md transition"><Download size={14}/> Unduh Laporan PDF</button>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           <tr>
                              <th className="p-4">Nama Ustadz</th>
                              <th className="p-4 text-center">Total Hadir</th>
                              <th className="p-4 text-center text-rose-500">Terlambat</th>
                              <th className="p-4 text-center">Estimasi Gaji</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {ustadzList.filter(u => u.role === 'ustadz').map(u => (
                                 <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{u.name}</td>
                                    <td className="p-4 text-center font-bold text-emerald-600">{attendanceData.filter(a => a.userId === u.id && (a.status === 'Hadir' || a.status === 'Terlambat')).length} Sesi</td>
                                    <td className="p-4 text-center font-bold text-rose-500">{attendanceData.filter(a => a.userId === u.id && a.status === 'Terlambat').length} Kali</td>
                                    <td className="p-4 text-center font-black text-indigo-600">Rp {calculateTotalSalary(u.id).toLocaleString('id-ID')}</td>
                                 </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Audit 1:1 Foto */}
               <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800">Verifikasi Foto Ganda (1:1)</h4></div>
                  <div className="overflow-x-auto p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {attendanceData.map(a => (
                              <div key={a.id} className="p-4 border rounded-2xl bg-white shadow-sm flex flex-col gap-4">
                                 <div className="flex gap-2">
                                    <div className="flex-1 aspect-square bg-slate-100 rounded-xl overflow-hidden relative border">
                                       {a.photoUstadz ? <img src={a.photoUstadz} className="w-full h-full object-cover"/> : <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-400">NO FOTO</div>}
                                       <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] font-bold px-2 py-0.5 rounded-md">USTADZ</div>
                                    </div>
                                    <div className="flex-1 aspect-square bg-slate-100 rounded-xl overflow-hidden relative border">
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
                                    {a.lateMin > 0 && <p className="text-[10px] font-bold text-rose-500 mt-0.5">Telat: {a.lateMin} Mnt</p>}
                                    {a.earlyMin > 0 && <p className="text-[10px] font-bold text-amber-500 mt-0.5">Pulang Cepat: {a.earlyMin} Mnt</p>}
                                 </div>
                              </div>
                           ))}
                        </div>
                  </div>
               </div>
            </div>
          )}

          {/* Pengaturan Aplikasi ADMIN */}
          {view === 'admin-set' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="bg-white rounded-2xl border shadow-sm p-6">
                   <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings size={20} className="text-indigo-600"/> Identitas & Parameter Gaji</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Nama Aplikasi</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" value={config.appName} onChange={e => setConfig({...config, appName: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Gaji Pokok</label><input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm" value={config.baseSalary} onChange={e => setConfig({...config, baseSalary: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Bonus Sesi</label><input type="number" className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-bold text-sm text-emerald-700" value={config.incentivePerSession} onChange={e => setConfig({...config, incentivePerSession: parseInt(e.target.value) || 0})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Denda Telat</label><input type="number" className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl font-bold text-sm text-rose-600" value={config.lateDeduction} onChange={e => setConfig({...config, lateDeduction: parseInt(e.target.value) || 0})} /></div>
                   </div>
                   <button onClick={(e) => { e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ TERSIMPAN"; e.target.classList.add('bg-emerald-600'); setTimeout(()=> {e.target.innerText="Simpan Pengaturan"; e.target.classList.remove('bg-emerald-600');}, 2000)}, 800) }} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md transition-colors">Simpan Pengaturan</button>
                </div>
             </div>
          )}

          {/* Modal Kamera Double Step */}
          {cameraOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                   <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                      <div><h3 className="text-xl font-black">{cameraStep === 1 ? 'Foto Ustadz' : 'Foto Santri'}</h3></div>
                      <button onClick={() => { stopStream(); setCameraOpen(false); }} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20"><XCircle size={20}/></button>
                   </div>
                   <div className="p-6 space-y-4">
                      <div className={`p-3 rounded-lg text-center font-bold text-[10px] uppercase ${cameraStep===1?'bg-indigo-50 text-indigo-600':'bg-emerald-50 text-emerald-600'}`}>
                         {cameraStep===1?'1. Selfie Wajah':'2. Foto Suasana Ngaji'}
                      </div>
                      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-100">
                         {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                           <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${cameraStep === 1 ? 'transform rotate-y-180' : ''}`} />
                         ) : (
                           <div className="relative w-full h-full">
                              <img src={cameraStep===1 ? tempPhotos.ustadz : tempPhotos.murid} className="w-full h-full object-cover" />
                           </div>
                         )}
                         <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex gap-3">
                         {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                           <button onClick={capture} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-2"><Camera size={18}/> Ambil Foto</button>
                         ) : (
                           <>
                             <button onClick={() => cameraStep === 1 ? setTempPhotos({...tempPhotos, ustadz: null}) : setTempPhotos({...tempPhotos, murid: null})} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-xl font-bold text-sm">Ulangi</button>
                             {cameraStep === 1 ? (
                               <button onClick={() => startCamera(2)} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700">Lanjut</button>
                             ) : (
                               <button onClick={submitAttendance} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 animate-bounce">Kirim Absen</button>
                             )}
                           </>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* Modal Izin Compact */}
          {isPermitOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                   <div className="p-4 bg-indigo-600 text-white text-center"><h3 className="text-lg font-black tracking-tight">Form Izin / Sakit</h3></div>
                   <form onSubmit={submitPermit} className="p-5 space-y-4">
                      <div className="flex gap-3">
                         {['Izin', 'Sakit'].map(t => (
                           <label key={t} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border-2 cursor-pointer font-bold text-sm transition ${permitForm.type === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}>
                              <input type="radio" className="hidden" name="permitType" value={t} checked={permitForm.type === t} onChange={(e) => setPermitForm({...permitForm, type: e.target.value})} />{t}
                           </label>
                         ))}
                      </div>
                      <div className="p-3 bg-slate-50 border rounded-xl space-y-3">
                         <label className="flex items-center gap-2 font-bold text-xs text-slate-700"><input type="checkbox" checked={permitForm.isFullDay} onChange={e => setPermitForm({...permitForm, isFullDay: e.target.checked, selectedSessions: []})} className="w-4 h-4 text-indigo-600 rounded" /> Izin Satu Hari Penuh</label>
                         {!permitForm.isFullDay && (
                            <div className="pt-2 border-t flex flex-wrap gap-2">
                               {schedules.map(s => (
                                  <label key={s.id} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-white px-2 py-1.5 rounded border cursor-pointer hover:border-indigo-200">
                                     <input type="checkbox" checked={permitForm.selectedSessions.includes(s.id)} onChange={e => { const ns = e.target.checked ? [...permitForm.selectedSessions, s.id] : permitForm.selectedSessions.filter(x=>x!==s.id); setPermitForm({...permitForm, selectedSessions: ns}); }} className="w-3 h-3 text-indigo-600 rounded" /> {s.name}
                                  </label>
                               ))}
                            </div>
                         )}
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Keterangan</label>
                         <textarea required className="w-full p-3 bg-slate-50 border rounded-xl font-medium text-xs outline-none focus:bg-white focus:border-indigo-200 min-h-[80px]" placeholder="Misal: Sakit demam..." value={permitForm.reason} onChange={(e) => setPermitForm({...permitForm, reason: e.target.value})}></textarea>
                      </div>
                      <div className="flex gap-3 pt-2">
                         <button type="button" onClick={() => setIsPermitOpen(false)} className="flex-1 py-3 font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition text-xs">TUTUP</button>
                         <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition">SIMPAN IZIN</button>
                      </div>
                   </form>
                </div>
             </div>
          )}

        </div>
      </main>

      {/* Simulator Tools Bawah */}
      {simulationMode && (
         <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full flex gap-2 shadow-2xl scale-75 md:scale-100">
            {['admin', 'manajemen', 'ustadz'].map(r => (
              <button key={r} onClick={() => { setUser({...user, role: r}); setView(r === 'manajemen' ? 'management' : r === 'admin' ? 'admin' : 'dashboard'); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${user.role === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{r}</button>
            ))}
            <button onClick={() => setSimulationMode(false)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-amber-500 text-white ml-2">Tutup Simulator</button>
         </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
         <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-2xl animate-in slide-in-from-top flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-400" /> {toast.msg}
         </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slide-in-top { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.4s ease-out forwards; }
        .zoom-in { animation: zoom-in 0.2s ease-out forwards; }
        .slide-in-from-top { animation: slide-in-top 0.3s ease-out forwards; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;