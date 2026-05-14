import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, Clock, Calendar, CheckCircle, XCircle, Info, Settings, Users, 
  FileText, LogOut, AlertTriangle, Upload, Download, Eye, EyeOff, Trash2, Plus, 
  LayoutGrid, BookOpen, CalendarDays, BarChart3, UserCircle, Menu, Camera,
  Award, TrendingUp, RefreshCw, Lock, User, LogIn, Map, Save, ShieldCheck, Coffee,
  DollarSign
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
  permitDeduction: 15000, 
  incentivePerSession: 25000,
  lateTolerance: 10,
  activeHolidays: []
};

// --- CUSTOM PDF GENERATOR (TANPA TAB BARU) ---
const generateCleanPDF = (data, config, currentTime) => {
  try {
    const tableRows = data.length === 0 
      ? '<tr><td colspan="4" style="text-align: center; padding: 20px;">Belum ada data kehadiran</td></tr>'
      : data.map(a => {
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
               body { font-family: Arial, sans-serif; padding: 20px; margin: 0; color: #333; line-height: 1.5; }
               .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
               h1 { margin: 0 0 5px 0; font-size: 20px; text-transform: uppercase; }
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
               <p>${config.appName}</p>
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
            <script> 
               window.onload = function() { 
                  setTimeout(function() { window.print(); }, 500);
               } 
            </script>
         </body>
      </html>
    `;
    
    // BIKIN BINGKAI TERSEMBUNYI (HIDDEN IFRAME) AGAR TIDAK BUKA TAB BARU
    let iframe = document.getElementById('print-iframe');
    if (!iframe) {
       iframe = document.createElement('iframe');
       iframe.id = 'print-iframe';
       iframe.style.position = 'absolute';
       iframe.style.width = '0px';
       iframe.style.height = '0px';
       iframe.style.border = 'none';
       document.body.appendChild(iframe);
    }

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(htmlContent);
    iframe.contentWindow.document.close();

  } catch (err) { alert("Gagal membuat PDF: " + err.message); }
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [simulationMode, setSimulationMode] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, msg: '', onConfirm: null });
  const [notifications, setNotifications] = useState([]);

  // --- APP DATA STATES ---
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [location, setLocation] = useState({ lat: null, lng: null, distance: 0, accuracy: null });
  const [isLocationValid, setIsLocationValid] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [permissions, setPermissions] = useState([]);
  
  // Camera & Modal States
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStep, setCameraStep] = useState(1);
  const [tempPhotos, setTempPhotos] = useState({ ustadz: null, murid: null });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Permit & Scheduling States
  const [isPermitOpen, setIsPermitOpen] = useState(false);
  const [permitForm, setPermitForm] = useState({ type: 'Izin', reason: '', isFullDay: true, selectedSessions: [] });
  const [schedules, setSchedules] = useState([
    { id: 1, name: 'Ngaji Shubuh', start: '05:00', end: '06:30', active: true },
    { id: 2, name: 'Ngaji Ashar', start: '16:00', end: '17:30', active: true },
    { id: 3, name: 'Ngaji Maghrib/Isya', start: '18:15', end: '20:00', active: true },
  ]);
  const [holidays, setHolidays] = useState([]);
  const [ustadzList, setUstadzList] = useState([
    { id: 1, name: 'Ust. Fajar', role: 'admin', username: 'admin', password: '123', profilePic: null, alamat: '', hobi: '', moto: '' },
    { id: 99, name: 'Bpk. Manajemen', role: 'manajemen', username: 'manajemen', password: '123', profilePic: null, alamat: '', hobi: '', moto: '' },
    { id: 2, name: 'Ust. Ahmad', role: 'ustadz', username: 'ahmad', password: '123', profilePic: null, alamat: '', hobi: '', moto: '' },
    { id: 3, name: 'Ust. Hamzah', role: 'ustadz', username: 'hamzah', password: '123', profilePic: null, alamat: '', hobi: '', moto: '' },
  ]);

  // Form States
  const [userForm, setUserForm] = useState({ id: null, name: '', username: '', password: '', role: 'ustadz' });
  const [showPassword, setShowPassword] = useState(false);
  const [schForm, setSchForm] = useState({ id: null, name: '', start: '', end: '' });
  const [holidayForm, setHolidayForm] = useState({ date: '', isFullDay: true, sessions: [] });

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
  const todayHoliday = holidays.find(h => h.date === todayStr);

  const showToastMsg = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const addNotification = (msg) => {
    const time = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => [{ id: Date.now(), msg, time }, ...prev]);
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
    if (!navigator.geolocation) {
       // Silent fail jika tidak didukung
       return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, config.lat, config.lng);
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist.toFixed(0), accuracy: pos.coords.accuracy.toFixed(0) });
      setIsLocationValid(dist <= config.radius);
    }, (err) => {
       console.warn("GPS HP Ditolak atau Error:", err.message);
    }, { enableHighAccuracy: true });
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

  const isSessionHoliday = todayHoliday?.isFullDay || (todayHoliday && activeSession && todayHoliday.sessions.includes(activeSession.id));
  const myTodayPermits = user ? permissions.filter(p => p.userId === user.id && p.date === todayStr) : [];
  const isPermittedNow = myTodayPermits.some(p => p.isFullDay || (activeSession && p.sessions.includes(activeSession.id)));

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

  // FIX MOBILE CAMERA: Fallback jika device menolak
  const startCamera = async (step = 1) => {
    stopStream();
    setCameraOpen(true);
    setCameraStep(step);
    if(step === 1) setTempPhotos({ ustadz: null, murid: null });
    
    // Pengecekan API mediaDevices (Sering hilang di HP jika tidak HTTPS)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       alert("Kamera ditolak oleh Browser HP! Pastikan Anda membuka link yang memiliki HTTPS (Bukan IP lokal).");
       setCameraOpen(false);
       return;
    }

    setTimeout(async () => {
       try {
         const facing = step === 1 ? 'user' : 'environment';
         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
         if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
       } catch (err) {
         try {
            // Fallback: Paksa buka kamera apa saja jika kamera belakang tidak ada
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) { videoRef.current.srcObject = fallbackStream; videoRef.current.play(); }
         } catch (fallbackErr) {
            alert("Akses kamera ditolak. Pastikan browser mengizinkan kamera pada pengaturan HP Anda.");
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
    addNotification(`${user.name} Absen Masuk: ${activeSession?.name}`);
    stopStream(); setCameraOpen(false); showToastMsg("Berhasil Absen Masuk!");
  };

  const submitLogout = () => {
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setAttendanceData(attendanceData.map(a => 
      (a.userId === user.id && a.date === todayStr && a.sessionId === activeSession?.id && a.timeOut === '-') 
      ? { ...a, timeOut: ts, earlyMin: earlyMinutes } : a
    ));
    addNotification(`${user.name} Absen Pulang: ${activeSession?.name}`);
    showToastMsg("Berhasil Absen Pulang!");
  };

  const submitPermit = (e) => {
    e.preventDefault();
    if (!permitForm.isFullDay && permitForm.selectedSessions.length === 0) {
       showToastMsg("Pilih minimal 1 sesi!"); return;
    }
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    if (permitForm.isFullDay) {
       const record = {
          id: Date.now(), userId: user.id, userName: user.name, date: todayStr,
          timeIn: ts, timeOut: ts, session: 'Satu Hari Penuh', sessionId: null, status: permitForm.type,
          lateMin: 0, earlyMin: 0, note: permitForm.reason, isFullDay: true
       };
       setPermissions([record, ...permissions]);
       setAttendanceData([record, ...attendanceData]); 
    } else {
       permitForm.selectedSessions.forEach((sId, index) => {
          const sName = schedules.find(x => x.id === sId)?.name;
          const record = {
             id: Date.now() + index, userId: user.id, userName: user.name, date: todayStr,
             timeIn: ts, timeOut: ts, session: sName, sessionId: sId, status: permitForm.type,
             lateMin: 0, earlyMin: 0, note: permitForm.reason, isFullDay: false
          };
          setPermissions([record, ...permissions]);
          setAttendanceData([record, ...attendanceData]);
       });
    }
    addNotification(`${user.name} Mengajukan ${permitForm.type}`);
    setIsPermitOpen(false);
    setPermitForm({ type: 'Izin', reason: '', isFullDay: true, selectedSessions: [] });
    showToastMsg(`Data ${permitForm.type} Tersimpan!`);
  };

  const getHariBulanIni = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };

  const hitungAlpa = (uId) => {
    let totalTargetSesi = getHariBulanIni() * schedules.length;
    let totalHadir = attendanceData.filter(a => a.userId === uId && (a.status === 'Hadir' || a.status === 'Terlambat')).length;
    let totalIzin = permissions.filter(p => p.userId === uId).reduce((acc, p) => acc + (p.isFullDay ? schedules.length : p.selectedSessions?.length || 1), 0);
    let totalLibur = holidays.reduce((acc, h) => acc + (h.isFullDay ? schedules.length : h.sessions?.length || 0), 0);
    let alpa = totalTargetSesi - totalHadir - totalIzin - totalLibur;
    return alpa > 0 ? alpa : 0;
  };

  // Gaji Sync
  const calculateTotalSalary = (uId) => {
    const uData = attendanceData.filter(a => a.userId === uId && (a.status === 'Hadir' || a.status === 'Terlambat'));
    const liburCount = holidays.reduce((acc, h) => acc + (h.isFullDay ? schedules.length : h.sessions?.length || 0), 0);
    const bonus = (uData.length + liburCount) * config.incentivePerSession;
    const lates = uData.filter(a => a.status === 'Terlambat').length;
    
    const izinData = permissions.filter(p => p.userId === uId);
    let totalSesiIzin = 0;
    izinData.forEach(p => {
        if(p.isFullDay) totalSesiIzin += schedules.length;
        else totalSesiIzin += (p.selectedSessions?.length || 1);
    });

    const dendaTelat = lates * config.lateDeduction;
    const dendaIzin = totalSesiIzin * (config.permitDeduction || 0);

    return config.baseSalary + bonus - dendaTelat - dendaIzin;
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
           
           setView(foundUser.role === 'admin' ? 'admin-dashboard' : foundUser.role === 'manajemen' ? 'mgmt-dashboard' : 'ustadz-dashboard');
           
           setIsSidebarOpen(false); 
           showToastMsg(`🎉 Akses Diterima! Selamat datang, ${foundUser.name}`);
       } else {
           setLoginError('Username & Password tidak cocok!');
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
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition" size={18}/>
                      <input type="text" required className="w-full py-3 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="Username..." />
                   </div>
                </div>
                <div className="space-y-1 relative">
                   <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition" size={18}/>
                      <input type={showLoginPassword ? "text" : "password"} required className="w-full py-3 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="Password..." />
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

  const handleNav = (targetView) => {
    setView(targetView);
    setIsSidebarOpen(false); 
  };

  const renderSharedDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg"><h4 className="text-sm font-bold opacity-80 mb-2 uppercase tracking-widest">Total Ustadz</h4><p className="text-4xl font-black">{ustadzList.filter(u => u.role === 'ustadz').length}</p></div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm"><h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Kehadiran Hari Ini</h4><p className="text-4xl font-black text-emerald-600">{attendanceData.filter(a => a.date === todayStr && a.status === 'Hadir').length}</p></div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm"><h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Izin / Sakit</h4><p className="text-4xl font-black text-amber-500">{permissions.filter(p => p.date === todayStr).length}</p></div>
       </div>

       <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50 flex items-center justify-between"><h4 className="font-bold text-slate-800">Rekapitulasi Kehadiran & Alpa</h4><span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-md border">Target Bulan Ini: {getHariBulanIni() * schedules.length} Sesi</span></div>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-white border-b text-[10px] font-bold text-slate-400 uppercase">
                   <tr>
                      <th className="p-4">Nama Ustadz</th>
                      {schedules.map(s => <th key={s.id} className="p-4 text-center">{s.name}</th>)}
                      <th className="p-4 text-center text-sky-600">Total Izin</th>
                      <th className="p-4 text-center text-rose-600">Belum Absen (Alpa)</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {ustadzList.filter(u => u.role === 'ustadz').map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                         <td className="p-4 font-bold text-slate-800">{u.name}</td>
                         {schedules.map(s => (
                            <td key={s.id} className="p-4 text-center font-bold text-slate-600">
                               {attendanceData.filter(a => a.userId === u.id && a.sessionId === s.id && (a.status === 'Hadir' || a.status === 'Terlambat')).length + holidays.filter(h => h.isFullDay || h.sessions.includes(s.id)).length}
                            </td>
                         ))}
                         <td className="p-4 text-center font-bold text-sky-600">{permissions.filter(p => p.userId === u.id).reduce((acc, p) => acc + (p.isFullDay ? schedules.length : p.selectedSessions?.length || 1), 0)}</td>
                         <td className="p-4 text-center font-black text-rose-600">{hitungAlpa(u.id)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );

  const renderAdminUsers = () => (
    <div className="bg-white rounded-2xl border shadow-sm animate-in fade-in overflow-hidden">
       <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800">Manajemen Akun Ustadz</h4></div>
       <div className="p-6 border-b grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50">
          <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Nama Lengkap</label><input type="text" className="w-full p-3 border bg-white rounded-xl text-sm font-medium" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Username</label><input type="text" className="w-full p-3 border bg-white rounded-xl text-sm font-medium" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} /></div>
          <div className="space-y-1 relative">
             <label className="text-xs font-bold text-slate-500">Password</label>
             <input type={showPassword?"text":"password"} className="w-full p-3 border bg-white rounded-xl text-sm font-medium pr-10" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
             <button onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-400">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
          <button onClick={() => {
             if(!userForm.name) return showToastMsg("Nama wajib diisi!");
             if(userForm.id) { setUstadzList(ustadzList.map(u => u.id === userForm.id ? {...u, ...userForm} : u)); showToastMsg("User Diedit"); }
             else { setUstadzList([...ustadzList, {...userForm, id: Date.now()}]); showToastMsg("User Ditambahkan"); }
             setUserForm({ id: null, name: '', username: '', password: '', role: 'ustadz' });
          }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md">SIMPAN DATA USER</button>
       </div>
       <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-4">Nama</th><th className="p-4">Username</th><th className="p-4">Password</th><th className="p-4">Aksi</th></tr></thead>
             <tbody className="divide-y">
                {ustadzList.filter(u => u.role === 'ustadz').map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                     <td className="p-4 font-bold text-slate-800">{u.name}</td>
                     <td className="p-4">{u.username}</td>
                     <td className="p-4 font-mono text-slate-500 relative group cursor-pointer">
                        <span className="group-hover:hidden">••••••</span><span className="hidden group-hover:inline">{u.password}</span>
                     </td>
                     <td className="p-4 flex gap-3">
                        <button onClick={() => setUserForm(u)} className="text-indigo-600 font-bold text-xs hover:underline">Edit</button>
                        <button onClick={() => setConfirmDialog({ isOpen: true, msg: `Hapus akun ${u.name}?`, onConfirm: () => { setUstadzList(ustadzList.filter(x => x.id !== u.id)); setConfirmDialog({isOpen:false, msg:'', onConfirm:null}); showToastMsg("User Dihapus"); }})} className="text-rose-600 font-bold text-xs hover:underline">Hapus</button>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderAdminSchedules = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800 text-sm">Jadwal Ngaji</h4></div>
          <div className="p-6 border-b grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50">
             <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Nama Sesi</label><input type="text" className="w-full p-3 border bg-white rounded-xl text-sm font-medium" value={schForm.name} onChange={e => setSchForm({...schForm, name: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Jam Mulai</label><input type="time" className="w-full p-3 border bg-white rounded-xl text-sm font-medium" value={schForm.start} onChange={e => setSchForm({...schForm, start: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Jam Selesai</label><input type="time" className="w-full p-3 border bg-white rounded-xl text-sm font-medium" value={schForm.end} onChange={e => setSchForm({...schForm, end: e.target.value})} /></div>
             <button onClick={() => {
                if(!schForm.name) return showToastMsg("Nama jadwal harus diisi!");
                if(schForm.id) setSchedules(schedules.map(s => s.id === schForm.id ? {...s, ...schForm} : s));
                else setSchedules([...schedules, {...schForm, id: Date.now(), active: true}]);
                setSchForm({ id: null, name: '', start: '', end: '' }); showToastMsg("Jadwal Disimpan");
             }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md">SIMPAN JADWAL</button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
             {schedules.map(s => (
                <div key={s.id} className="p-4 border rounded-xl bg-white flex flex-col justify-between">
                   <div>
                      <p className="font-bold text-slate-800">{s.name}</p>
                      <p className="text-xs font-mono text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded mt-2">{s.start} - {s.end}</p>
                   </div>
                   <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                      <button onClick={()=>setSchForm(s)} className="text-indigo-600 text-xs font-bold hover:underline">Edit</button>
                      <button onClick={()=>setConfirmDialog({isOpen:true, msg:`Hapus jadwal ${s.name}?`, onConfirm:()=>{setSchedules(schedules.filter(x=>x.id!==s.id)); setConfirmDialog({isOpen:false, msg:'', onConfirm:null}); showToastMsg("Jadwal Dihapus");}})} className="text-rose-600 text-xs font-bold hover:underline">Hapus</button>
                   </div>
                </div>
             ))}
          </div>
       </div>

       <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800 text-sm">Manajemen Hari Libur Asrama</h4></div>
          <div className="p-6 border-b space-y-4 bg-slate-50/50">
             <div className="flex gap-4 items-center">
                <input type="date" className="p-3 border bg-white rounded-xl text-sm font-medium" value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} />
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                   <input type="checkbox" checked={holidayForm.isFullDay} onChange={e => setHolidayForm({...holidayForm, isFullDay: e.target.checked, sessions: []})} className="w-4 h-4 text-indigo-600 rounded" /> Libur 1 Hari Penuh
                </label>
             </div>
             {!holidayForm.isFullDay && (
                <div className="flex gap-4 flex-wrap bg-white p-4 rounded-xl border">
                   <p className="w-full text-xs font-bold text-slate-500 mb-2">Pilih Sesi yang Diliburkan:</p>
                   {schedules.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 border rounded-lg cursor-pointer">
                         <input type="checkbox" checked={holidayForm.sessions.includes(s.id)} onChange={e => { const ns = e.target.checked ? [...holidayForm.sessions, s.id] : holidayForm.sessions.filter(x => x !== s.id); setHolidayForm({...holidayForm, sessions: ns}); }} className="rounded text-indigo-600" /> {s.name}
                      </label>
                   ))}
                </div>
             )}
             <button onClick={() => {
                if(!holidayForm.date) return showToastMsg("Pilih tanggal libur!");
                const d = new Date(holidayForm.date).toLocaleDateString('id-ID');
                setHolidays([...holidays, { id: Date.now(), date: d, isFullDay: holidayForm.isFullDay, sessions: holidayForm.sessions }]);
                setHolidayForm({ date: '', isFullDay: true, sessions: [] }); showToastMsg("Libur Ditambahkan (Otomatis Dianggap Hadir)");
             }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md">TAMBAHKAN LIBUR</button>
          </div>
          <div className="p-6 space-y-3">
             {holidays.map(h => (
                <div key={h.id} className="flex justify-between items-center p-4 border border-amber-200 rounded-xl bg-amber-50">
                   <div>
                      <p className="font-bold text-amber-900 text-sm">{h.date}</p>
                      <p className="text-xs text-amber-700 font-medium mt-1">{h.isFullDay ? 'Libur Full Day' : `Libur Sesi: ${schedules.filter(s=>h.sessions.includes(s.id)).map(s=>s.name).join(', ')}`}</p>
                   </div>
                   <button onClick={() => setHolidays(holidays.filter(x=>x.id!==h.id))} className="text-rose-600 hover:bg-rose-100 p-2 rounded-lg transition"><Trash2 size={18}/></button>
                </div>
             ))}
          </div>
       </div>
    </div>
  );

  const renderAdminLoc = () => (
    <div className="bg-white p-8 rounded-xl border shadow-sm animate-in fade-in max-w-4xl">
       <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><MapPin size={20} className="text-indigo-600"/> Manajemen Zona Koordinat GPS</h4>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border">
          <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nama Asrama / Zona</label><input type="text" className="w-full p-3 border bg-white rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={config.locationName} onChange={e => setConfig({...config, locationName: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Latitude</label><input type="number" className="w-full p-3 border bg-white rounded-xl text-sm font-mono font-bold outline-none focus:border-indigo-500" value={config.lat} onChange={e => setConfig({...config, lat: parseFloat(e.target.value)})} /></div>
          <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase">Longitude</label><input type="number" className="w-full p-3 border bg-white rounded-xl text-sm font-mono font-bold outline-none focus:border-indigo-500" value={config.lng} onChange={e => setConfig({...config, lng: parseFloat(e.target.value)})} /></div>
          <div className="space-y-2 md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Radius Aman Absensi (Meter)</label><input type="number" className="w-full p-3 border bg-white rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={config.radius} onChange={e => setConfig({...config, radius: parseInt(e.target.value)})} /></div>
       </div>
       <button onClick={(e)=>{e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ LOKASI DISIMPAN!"; e.target.classList.replace('bg-indigo-600','bg-emerald-600'); setTimeout(()=>{e.target.innerText="SIMPAN LOKASI"; e.target.classList.replace('bg-emerald-600','bg-indigo-600');},2000)}, 800)}} className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition">SIMPAN LOKASI</button>
    </div>
  );

  const renderAdminSettings = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2"><Settings size={18}/> Identitas Aplikasi & Upload Logo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Nama Aplikasi</label><input type="text" className="w-full p-3 border rounded-xl text-sm font-medium bg-slate-50" value={config.appName} onChange={e => setConfig({...config, appName: e.target.value})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Slogan / Subjudul</label><input type="text" className="w-full p-3 border rounded-xl text-sm font-medium bg-slate-50" value={config.slogan} onChange={e => setConfig({...config, slogan: e.target.value})} /></div>
             <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500">Upload Logo Aplikasi</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-dashed">
                   {config.logoUrl ? <img src={config.logoUrl} className="w-16 h-16 object-contain drop-shadow-md" alt="Preview Logo" /> : <div className="w-14 h-14 bg-white rounded-xl border flex items-center justify-center text-slate-400"><BookOpen size={24}/></div>}
                   <div className="flex-1">
                      <input type="file" accept="image/*" onChange={(e) => { if(e.target.files[0]) setConfig({...config, logoUrl: URL.createObjectURL(e.target.files[0])}); }} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 cursor-pointer" />
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">*Logo ini akan muncul di Halaman Login dan Sidebar.</p>
                   </div>
                </div>
             </div>
          </div>
          <button onClick={(e)=>{e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ TERSIMPAN!"; e.target.classList.replace('bg-slate-900','bg-emerald-600'); setTimeout(()=>{e.target.innerText="SIMPAN IDENTITAS"; e.target.classList.replace('bg-emerald-600','bg-slate-900');},2000)}, 800)}} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md transition-all">SIMPAN IDENTITAS</button>
       </div>

       <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2"><Settings size={18}/> Parameter Gaji & Denda</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Gaji Pokok</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold bg-slate-50" value={config.baseSalary} onChange={e => setConfig({...config, baseSalary: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Bonus Per Sesi</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-emerald-600 bg-slate-50" value={config.incentivePerSession} onChange={e => setConfig({...config, incentivePerSession: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Telat</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-rose-600 bg-slate-50" value={config.lateDeduction} onChange={e => setConfig({...config, lateDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Izin</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-sky-600 bg-slate-50" value={config.permitDeduction} onChange={e => setConfig({...config, permitDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Toleransi Telat (Menit)</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-amber-600 bg-slate-50" value={config.lateTolerance} onChange={e => setConfig({...config, lateTolerance: parseInt(e.target.value)||0})} /></div>
          </div>
          <button onClick={(e)=>{e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ PARAMETER DISIMPAN!"; e.target.classList.replace('bg-indigo-600','bg-emerald-600'); setTimeout(()=>{e.target.innerText="SIMPAN PARAMETER"; e.target.classList.replace('bg-emerald-600','bg-indigo-600');},2000)}, 800)}} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md transition-all">SIMPAN PARAMETER</button>
       </div>
    </div>
  );

  const renderMgmtSettings = () => (
     <div className="animate-in fade-in">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2"><Settings size={18}/> Pengaturan Parameter Keuangan (Mandiri)</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Gaji Pokok</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold bg-slate-50" value={config.baseSalary} onChange={e => setConfig({...config, baseSalary: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Bonus Per Sesi</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-emerald-600 bg-slate-50" value={config.incentivePerSession} onChange={e => setConfig({...config, incentivePerSession: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Telat</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-rose-600 bg-slate-50" value={config.lateDeduction} onChange={e => setConfig({...config, lateDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Izin</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-sky-600 bg-slate-50" value={config.permitDeduction} onChange={e => setConfig({...config, permitDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Toleransi Telat (Menit)</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-amber-600 bg-slate-50" value={config.lateTolerance} onChange={e => setConfig({...config, lateTolerance: parseInt(e.target.value)||0})} /></div>
          </div>
          <button onClick={(e)=>{e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ PARAMETER DISIMPAN!"; e.target.classList.replace('bg-indigo-600','bg-emerald-600'); setTimeout(()=>{e.target.innerText="SIMPAN PENGATURAN"; e.target.classList.replace('bg-emerald-600','bg-indigo-600');},2000)}, 800)}} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md transition-all">SIMPAN PENGATURAN</button>
        </div>
     </div>
  );

  const renderMgmtSalary = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
           <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                 <h4 className="font-bold text-slate-800 text-sm">Kalkulasi Gaji Real-Time</h4>
                 <p className="text-[10px] text-slate-500 mt-1 max-w-xl">Setiap jam libur ngaji, keterlambatan, dan izin akan otomatis masuk ke estimasi gaji secara real-time.</p>
              </div>
              <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 text-right">
                 <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Total Pengeluaran</p>
                 <p className="text-xl font-black text-indigo-700">
                    Rp {ustadzList.filter(u => u.role === 'ustadz').reduce((sum, u) => sum + calculateTotalSalary(u.id), 0).toLocaleString('id-ID')}
                 </p>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                       <th className="p-4">Nama Ustadz</th>
                       <th className="p-4 text-center">Hadir (+Libur)</th>
                       <th className="p-4 text-center text-rose-600">- Telat</th>
                       <th className="p-4 text-center text-sky-600">- Izin</th>
                       <th className="p-4 text-right">Estimasi Gaji Bersih</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {ustadzList.filter(u => u.role === 'ustadz').map(u => {
                       const uData = attendanceData.filter(a => a.userId === u.id && (a.status === 'Hadir' || a.status === 'Terlambat'));
                       const lates = uData.filter(a => a.status === 'Terlambat').length;
                       const liburCount = holidays.reduce((acc, h) => acc + (h.isFullDay ? schedules.length : h.sessions?.length || 0), 0);
                       
                       const izinData = permissions.filter(p => p.userId === u.id);
                       let totalIzin = 0;
                       izinData.forEach(p => {
                          if(p.isFullDay) totalIzin += schedules.length;
                          else totalIzin += (p.selectedSessions?.length || 1);
                       });

                       return (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                             <td className="p-4 font-bold text-slate-800">{u.name}</td>
                             <td className="p-4 text-center font-bold text-slate-600">{uData.length + liburCount} Sesi</td>
                             <td className="p-4 text-center font-bold text-rose-600">{lates}</td>
                             <td className="p-4 text-center font-bold text-sky-600">{totalIzin}</td>
                             <td className="p-4 font-black text-indigo-600 text-right text-lg">Rp {calculateTotalSalary(u.id).toLocaleString('id-ID')}</td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
           <div className="p-6 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h4 className="font-bold text-slate-800 text-sm">Audit Keuangan & Verifikasi Foto Ganda 1:1</h4>
              <button onClick={() => generateCleanPDF(attendanceData, config, currentTime)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 text-xs shadow-md transition"><Download size={14}/> Unduh Laporan PDF</button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-white border-b text-[10px] font-bold text-slate-500 uppercase">
                    <tr><th className="p-4">Tanggal & Sesi</th><th className="p-4">Nama Ustadz</th><th className="p-4 text-center">Verifikasi Visual (1:1)</th><th className="p-4">Catatan Waktu & Status</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {attendanceData.length === 0 ? <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold italic">Belum ada data absensi yang masuk.</td></tr> : attendanceData.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                         <td className="p-4 align-middle"><p className="font-bold text-slate-800">{a.date}</p><p className="text-xs text-indigo-600 font-bold mt-1 uppercase">{a.session}</p></td>
                         <td className="p-4 font-bold text-slate-800 align-middle">{a.userName}</td>
                         <td className="p-4 align-middle">
                            <div className="flex justify-center gap-3">
                               <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden border shadow-sm relative group">
                                  {a.photoUstadz ? <img src={a.photoUstadz} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-[8px] text-slate-400">NO FOTO</div>}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">USTADZ</div>
                               </div>
                               <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden border shadow-sm relative group">
                                  {a.photoMurid ? <img src={a.photoMurid} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-[8px] text-slate-400">NO FOTO</div>}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">MURID</div>
                               </div>
                            </div>
                         </td>
                         <td className="p-4 align-middle">
                            <StatusBadge type={a.status} />
                            <p className="text-[10px] font-bold text-slate-500 mt-2 font-mono">Masuk: {a.timeIn}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-0.5 font-mono">Pulang: {a.timeOut}</p>
                            {a.lateMin > config.lateTolerance && <p className="text-[10px] font-bold text-rose-600 mt-1">Terlambat: {a.lateMin} Menit</p>}
                            {a.earlyMin > 0 && <p className="text-[10px] font-bold text-amber-600 mt-1">Pulang Terlalu Cepat: {a.earlyMin} Menit</p>}
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
     </div>
  );

  const renderMgmtNotif = () => (
    <div className="bg-white rounded-xl border shadow-sm p-8 animate-in fade-in max-w-3xl">
       <h4 className="font-bold text-slate-800 mb-8 text-lg border-b pb-4 flex items-center gap-2"><Info size={24} className="text-indigo-600"/> Log Notifikasi Real-Time</h4>
       <div className="space-y-4">
          {notifications.length === 0 ? <p className="text-slate-400 font-bold italic py-10 bg-slate-50 rounded-xl text-center border border-dashed">Belum ada aktivitas hari ini.</p> : notifications.map(n => (
             <div key={n.id} className="flex gap-4 p-5 border rounded-xl bg-slate-50 items-center hover:bg-white hover:shadow-md transition">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-lg shadow-indigo-200"></div>
                <div><p className="font-bold text-slate-800">{n.msg}</p><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{n.time}</p></div>
             </div>
          ))}
       </div>
    </div>
  );

  const renderUstadzDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
       {isSessionHoliday && (
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex items-center gap-4">
             <div className="bg-amber-500 p-3 rounded-xl text-white"><Coffee size={24}/></div>
             <div><h4 className="font-bold text-amber-900 text-lg">Hari Libur</h4><p className="text-amber-700 text-sm font-medium">Asrama hari ini diliburkan.</p></div>
          </div>
       )}

       <div className="bg-white p-8 rounded-2xl border shadow-sm text-center">
          <h3 className="text-2xl font-black text-slate-800 mb-2">{isSessionHoliday ? 'Diliburkan' : activeSession ? activeSession.name : 'Jadwal Ngaji Belum Mulai'}</h3>
          <p className="text-sm font-bold text-slate-400 mb-8">{activeSession ? `Jam: ${activeSession.start} - ${activeSession.end}` : 'Tunggu waktu jadwal berikutnya'}</p>

          {activeSession && !isSessionHoliday && !isPermittedNow && lateMinutes > config.lateTolerance && !attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.sessionId === activeSession.id) && (
             <div className="mb-6 inline-block bg-orange-50 text-orange-600 px-6 py-3 rounded-xl font-bold text-sm border border-orange-100 animate-pulse">Terlambat {lateMinutes} Menit!</div>
          )}
          {earlyMinutes > 0 && attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.sessionId === activeSession?.id && a.timeOut === '-') && (
             <div className="mb-6 inline-block bg-rose-50 text-rose-600 px-6 py-3 rounded-xl font-bold text-sm border border-rose-100 animate-pulse">Peringatan: Pulang Terlalu Cepat {earlyMinutes} Menit!</div>
          )}
          {isPermittedNow && (
             <div className="mb-6 inline-block bg-sky-50 text-sky-600 px-6 py-3 rounded-xl font-bold text-sm border border-sky-100">Status Izin/Sakit Sedang Aktif</div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto">
             {!attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.sessionId === activeSession?.id) ? (
                <button onClick={() => startCamera(1)} disabled={isSessionHoliday || isPermittedNow || (!isLocationValid && !simulationMode) || !activeSession} className={`flex-1 py-5 rounded-xl font-black text-lg transition-all shadow-md flex items-center justify-center gap-3 ${isSessionHoliday || isPermittedNow || (!isLocationValid && !simulationMode) || !activeSession ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                   <Camera size={24} /> Absen Masuk
                </button>
             ) : (
                attendanceData.some(a => a.userId === user.id && a.date === todayStr && a.sessionId === activeSession?.id && a.timeOut !== '-') ? (
                   <button onClick={submitLogout} disabled={isSessionHoliday || isPermittedNow || (!isLocationValid && !simulationMode)} className="flex-1 py-5 rounded-xl font-black text-lg transition-all shadow-md flex items-center justify-center gap-3 bg-rose-500 text-white hover:bg-rose-600">
                      <LogOut size={24} /> Absen Pulang
                   </button>
                ) : (
                   <button disabled className="flex-1 py-5 bg-emerald-50 text-emerald-600 font-black text-lg rounded-xl border border-emerald-200 cursor-not-allowed">Sesi Selesai</button>
                )
             )}
             <button onClick={() => setIsPermitOpen(true)} className="px-8 py-5 border-2 border-slate-200 text-slate-500 font-black text-lg rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2">
                <AlertTriangle size={20} /> Izin
             </button>
          </div>
          
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-500 border justify-center">
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
                         <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{a.date}</td>
                         <td className="p-4 font-bold text-indigo-700 whitespace-nowrap">{a.session}</td>
                         <td className="p-4 font-mono text-slate-600">{a.timeIn}</td>
                         <td className="p-4 font-mono text-slate-600">{a.status === 'Izin' || a.status === 'Sakit' ? '-' : a.timeOut}</td>
                         <td className="p-4 min-w-[150px]">
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
  );

  const renderUstadzProfile = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border shadow-sm animate-in fade-in">
       <h4 className="font-bold text-slate-800 text-lg mb-8 border-b pb-4 flex items-center gap-2"><UserCircle size={20}/> Profil Akun Saya</h4>
       <div className="flex flex-col items-center mb-10">
          <div className="w-32 h-32 bg-slate-50 rounded-full border-4 border-slate-100 shadow-md overflow-hidden flex items-center justify-center text-slate-400 font-bold text-xs relative cursor-pointer group hover:border-indigo-200 transition">
             {user.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center"><Camera size={28} className="mb-2 text-indigo-400"/><span className="text-[10px] uppercase tracking-widest text-indigo-400">Upload</span></div>}
             <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { if(e.target.files[0]) setUser({...user, profilePic: URL.createObjectURL(e.target.files[0])}); }} />
          </div>
          <p className="mt-4 font-black text-xl text-slate-800">{user.name}</p>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{user.role}</p>
       </div>
       <div className="space-y-6">
          <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Lengkap</label><input type="text" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500" value={user.name} onChange={e => setUser({...user, name: e.target.value})} /></div>
          <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alamat Tempat Tinggal</label><textarea className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 min-h-[100px]" value={user.alamat || ''} onChange={e => setUser({...user, alamat: e.target.value})}></textarea></div>
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hobi</label><input type="text" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500" value={user.hobi || ''} onChange={e => setUser({...user, hobi: e.target.value})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Moto Hidup</label><input type="text" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500" value={user.moto || ''} onChange={e => setUser({...user, moto: e.target.value})} /></div>
          </div>
          <button onClick={()=>{showToastMsg("Profil Berhasil Disimpan");}} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 mt-6 transition active:scale-95 uppercase tracking-widest">SIMPAN PROFIL</button>
       </div>
    </div>
  );

  if (!isLoggedIn) return renderLoginScreen();

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-800 flex">
      {/* Overlay & Sidebar */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r shadow-2xl md:shadow-none md:relative transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm"><ShieldCheck size={24} /></div>
            <div><h1 className="font-bold text-base leading-tight">{config.appName}</h1><p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">{config.slogan}</p></div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><XCircle size={20} /></button>
        </div>
        
        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          {user.role === 'admin' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-2 mb-2">Menu Administrator</p>
              <button onClick={() => handleNav('admin-dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutGrid size={18} /> Dashboard Admin</button>
              <button onClick={() => handleNav('admin-users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={18} /> Kelola Ustadz</button>
              <button onClick={() => handleNav('admin-schedules')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-schedules' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><CalendarDays size={18} /> Jadwal & Libur</button>
              <button onClick={() => handleNav('admin-loc')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-loc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Map size={18} /> Zona Lokasi</button>
              <button onClick={() => handleNav('admin-settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'admin-settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> Pengaturan Aplikasi</button>
              <button onClick={() => handleNav('mgmt-salary')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'mgmt-salary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><DollarSign size={18} /> Monitoring Gaji</button>
            </>
          )}
          {user.role === 'manajemen' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-2 mb-2">Menu Manajemen</p>
              <button onClick={() => handleNav('mgmt-dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'mgmt-dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutGrid size={18} /> Dashboard Manajemen</button>
              <button onClick={() => handleNav('mgmt-salary')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'mgmt-salary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={18} /> Monitoring Gaji</button>
              <button onClick={() => handleNav('mgmt-notif')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'mgmt-notif' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Info size={18} /> Log Notifikasi</button>
              <button onClick={() => handleNav('mgmt-settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'mgmt-settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> Parameter Keuangan</button>
            </>
          )}
          {user.role === 'ustadz' && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mt-2 mb-2">Menu Ustadz</p>
              <button onClick={() => handleNav('ustadz-dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'ustadz-dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><Camera size={18} /> Absensi Ngaji</button>
              <button onClick={() => handleNav('ustadz-profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${view === 'ustadz-profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}><UserCircle size={18} /> Profil Akun</button>
            </>
          )}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
        {/* HEADER */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-slate-50 border rounded-xl text-slate-600 hover:text-indigo-600"><Menu size={20} /></button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-black tracking-tight">{user.role === 'admin' ? 'Portal Admin' : user.role === 'manajemen' ? 'Portal Manajemen' : "Assalamu'alaikum"}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{config.locationName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-lg font-black leading-none text-slate-800">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{todayStr}</p>
             </div>
             <div className="relative">
                <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black border border-indigo-200 hover:bg-indigo-200 transition">{user.name.charAt(0)}</button>
                {isProfileDropdownOpen && (
                   <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in">
                      <div className="p-4 bg-slate-50 border-b">
                         <p className="text-sm font-black text-slate-800 truncate">{user.name}</p>
                         <p className="text-[10px] font-bold text-indigo-600 uppercase mt-0.5">{user.role}</p>
                      </div>
                      {user.role === 'ustadz' && <button onClick={() => handleNav('ustadz-profile')} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition border-b">Profil Akun</button>}
                      <button onClick={() => { setIsLoggedIn(false); setUser(null); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition"><LogOut size={16}/> Keluar Aplikasi</button>
                   </div>
                )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
            {(view === 'admin-dashboard' || view === 'mgmt-dashboard') && renderSharedDashboard()}
            {view === 'admin-users' && renderAdminUsers()}
            {view === 'admin-schedules' && renderAdminSchedules()}
            {view === 'admin-loc' && renderAdminLoc()}
            {view === 'admin-settings' && renderAdminSettings()}
            {view === 'mgmt-salary' && renderMgmtSalary()}
            {view === 'mgmt-settings' && renderMgmtSettings()}
            {view === 'mgmt-notif' && renderMgmtNotif()}
            {view === 'ustadz-dashboard' && renderUstadzDashboard()}
            {view === 'ustadz-profile' && renderUstadzProfile()}
        </div>
      </main>

      {/* Simulator Tools Bawah */}
      {simulationMode && (
         <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full flex gap-2 shadow-2xl scale-75 md:scale-100 whitespace-nowrap">
            {['admin', 'manajemen', 'ustadz'].map(r => (
              <button key={r} onClick={() => { setUser({...user, role: r}); setView(r === 'manajemen' ? 'mgmt-dashboard' : r === 'admin' ? 'admin-dashboard' : 'ustadz-dashboard'); setIsProfileDropdownOpen(false); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${user.role === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{r}</button>
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

      {/* Modal Kamera (Step 1 & 2) */}
      {cameraOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
               <div className="p-4 bg-indigo-600 text-white flex justify-between items-center relative">
                  <div><h3 className="text-lg sm:text-xl font-black">{cameraStep === 1 ? 'Foto Ustadz' : 'Foto Santri'}</h3></div>
                  <button onClick={() => { stopStream(); setCameraOpen(false); }} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20"><XCircle size={20}/></button>
               </div>
               
               <div className="p-4 sm:p-6 space-y-4">
                  <div className={`p-3 rounded-lg text-center font-bold text-[10px] uppercase ${cameraStep===1?'bg-indigo-50 text-indigo-600':'bg-emerald-50 text-emerald-600'}`}>
                     {cameraStep===1?'1. Selfie Wajah':'2. Foto Suasana Ngaji'}
                  </div>
                  <div className="relative aspect-[3/4] sm:aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-100">
                     {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                       <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${cameraStep === 1 ? 'transform rotate-y-180' : ''}`} />
                     ) : (
                       <div className="relative w-full h-full">
                          <img src={cameraStep===1 ? tempPhotos.ustadz : tempPhotos.murid} className="w-full h-full object-cover" />
                       </div>
                     )}
                     <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                     {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                       <button onClick={capture} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-2"><Camera size={18}/> Ambil Foto</button>
                     ) : (
                       <>
                         <button onClick={() => cameraStep === 1 ? setTempPhotos({...tempPhotos, ustadz: null}) : setTempPhotos({...tempPhotos, murid: null})} className="w-full sm:w-1/3 bg-slate-100 text-slate-500 py-4 rounded-xl font-bold text-sm">Ulangi</button>
                         {cameraStep === 1 ? (
                           <button onClick={() => startCamera(2)} className="w-full sm:w-2/3 bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700">Lanjut</button>
                         ) : (
                           <button onClick={submitAttendance} className="w-full sm:w-2/3 bg-emerald-600 text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 animate-bounce">Kirim Absen</button>
                         )}
                       </>
                     )}
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Modal Izin (Compact) */}
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
                     <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer"><input type="checkbox" checked={permitForm.isFullDay} onChange={e => setPermitForm({...permitForm, isFullDay: e.target.checked, selectedSessions: []})} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" /> Izin Satu Hari Penuh</label>
                     {!permitForm.isFullDay && (
                        <div className="pt-2 border-t flex flex-wrap gap-2">
                           {schedules.map(s => (
                              <label key={s.id} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-white px-2 py-1.5 rounded border cursor-pointer hover:border-indigo-200">
                                 <input type="checkbox" checked={permitForm.selectedSessions.includes(s.id)} onChange={e => { const ns = e.target.checked ? [...permitForm.selectedSessions, s.id] : permitForm.selectedSessions.filter(x=>x!==s.id); setPermitForm({...permitForm, selectedSessions: ns}); }} className="w-3 h-3 text-indigo-600 rounded cursor-pointer" /> {s.name}
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

      {/* Konfirmasi Hapus */}
      {confirmDialog.isOpen && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
               <AlertTriangle size={56} className="mx-auto text-rose-500 mb-5" />
               <h3 className="font-black text-2xl mb-2 text-slate-800 tracking-tight">Konfirmasi Hapus</h3>
               <p className="text-sm text-slate-500 font-bold mb-8">{confirmDialog.msg}</p>
               <div className="flex gap-3">
                  <button onClick={()=>setConfirmDialog({isOpen:false})} className="flex-1 py-4 bg-slate-50 font-black rounded-xl text-slate-500 hover:bg-slate-100 transition">Batal</button>
                  <button onClick={confirmDialog.onConfirm} className="flex-1 py-4 bg-rose-600 font-black rounded-xl text-white hover:bg-rose-700 transition shadow-lg shadow-rose-200">Ya, Hapus</button>
               </div>
            </div>
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
