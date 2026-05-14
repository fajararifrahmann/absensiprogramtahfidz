import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, Clock, Calendar, CheckCircle, XCircle, Info, Settings, Users, 
  FileText, LogOut, AlertTriangle, Upload, Download, Eye, EyeOff, Trash2, Plus, 
  LayoutGrid, BookOpen, CalendarDays, BarChart3, UserCircle, Menu, Camera,
  Award, TrendingUp, RefreshCw, Lock, User, LogIn
} from 'lucide-react';

// --- CUSTOM PDF GENERATOR ---
const generateCleanPDF = (data, config, currentTime) => {
  const printWindow = window.open('', '_blank');
  const tableRows = data.map(a => {
     let keterangan = a.status;
     if (a.lateMin > config.lateTolerance) keterangan += ` (Telat ${a.lateMin}m)`;
     if (a.earlyMin > 0) keterangan += ` (Cepat ${a.earlyMin}m)`;
     if (a.note) keterangan += ` - ${a.note}`;
     return `
        <tr>
           <td>${a.date}</td>
           <td style="font-weight: bold;">${a.userName}</td>
           <td>${a.session}</td>
           <td>${a.status === 'Izin' || a.status === 'Sakit' ? `Diajukan: ${a.timeReq}` : `${a.timeIn} - ${a.timeOut}`}</td>
           <td>${keterangan}</td>
        </tr>
     `;
  }).join('');

  const html = `
     <!DOCTYPE html>
     <html>
        <head>
           <title>Laporan_Kehadiran</title>
           <style>
              @media print {
                 @page { size: A4; margin: 1.5cm; }
                 body { margin: 0; padding: 0; }
                 table { page-break-inside: auto; }
                 tr { page-break-inside: avoid; page-break-after: auto; }
                 thead { display: table-header-group; }
              }
              body { font-family: Arial, sans-serif; color: #333; font-size: 12px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { margin: 0 0 5px 0; font-size: 18px; }
              p { margin: 0; font-size: 12px; color: #555; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
              th { background-color: #f4f4f5; font-weight: bold; }
              .footer { margin-top: 50px; text-align: right; }
           </style>
        </head>
        <body>
           <div class="header">
              <h2>LAPORAN KEHADIRAN USTADZ</h2>
              <p>${config.appName}</p>
           </div>
           <table>
              <thead>
                 <tr>
                    <th width="15%">Tanggal</th>
                    <th width="20%">Nama Ustadz</th>
                    <th width="20%">Sesi Ngaji</th>
                    <th width="20%">Waktu</th>
                    <th width="25%">Keterangan</th>
                 </tr>
              </thead>
              <tbody>
                 ${tableRows || '<tr><td colspan="5" align="center">Belum ada data absensi</td></tr>'}
              </tbody>
           </table>
           <div class="footer">
              <p>Mengetahui,</p><br><br><br>
              <p><strong>Admin Asrama</strong></p>
           </div>
           <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
     </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

const App = () => {
  // --- LOGIN & AUTH STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [view, setView] = useState(''); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // --- UI STATES ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, msg: '', onConfirm: null });

  // --- APP DATA ---
  const [config, setConfig] = useState({
    appName: "AL HIDAYAH", slogan: "Portal Absensi", logoUrl: "",
    lat: -7.630951, lng: 109.260551, radius: 300, locationName: "Asrama Tahfidz Putra",
    baseSalary: 1250000, incentivePerSession: 25000, lateDeduction: 10000, permitDeduction: 0, lateTolerance: 10
  });

  const [schedules, setSchedules] = useState([
    { id: 1, name: 'Ngaji Shubuh', start: '05:00', end: '06:30' },
    { id: 2, name: 'Ngaji Ashar', start: '16:00', end: '17:30' },
    { id: 3, name: 'Ngaji Maghrib/Isya', start: '18:15', end: '20:00' },
  ]);

  const [holidays, setHolidays] = useState([
    { id: 1, date: '17/08/2026', isFullDay: true, sessions: [] }
  ]);

  const [ustadzList, setUstadzList] = useState([
    { id: 1, name: 'Ust. Fajar', username: 'admin', password: '123', role: 'admin', profilePic: null, alamat: '', hobi: '', moto: '' },
    { id: 99, name: 'Bpk. Manajemen', username: 'manajemen', password: '123', role: 'manajemen', profilePic: null, alamat: '', hobi: '', moto: '' },
    { id: 2, name: 'Ust. Ahmad', username: 'ahmad', password: '123', role: 'ustadz', profilePic: null, alamat: '', hobi: '', moto: '' },
    { id: 3, name: 'Ust. Hamzah', username: 'hamzah', password: '123', role: 'ustadz', profilePic: null, alamat: '', hobi: '', moto: '' },
  ]);

  const [attendanceData, setAttendanceData] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // --- FORM STATES ---
  const [userForm, setUserForm] = useState({ id: null, name: '', username: '', password: '', role: 'ustadz' });
  const [showPassword, setShowPassword] = useState(false);
  const [schForm, setSchForm] = useState({ id: null, name: '', start: '', end: '' });
  const [holidayForm, setHolidayForm] = useState({ date: '', isFullDay: true, sessions: [] });
  
  const [permitForm, setPermitForm] = useState({ type: 'Izin', isFullDay: true, sessions: [], reason: '' });
  const [isPermitOpen, setIsPermitOpen] = useState(false);

  // --- THEME STATE ---
  const [theme, setTheme] = useState({ sidebarBg: '#ffffff', sidebarText: '#475569', headerBg: '#ffffff' });

  // --- GPS & CAMERA ---
  const [location, setLocation] = useState({ lat: null, lng: null, distance: 0, accuracy: null });
  const [isLocationValid, setIsLocationValid] = useState(true);
  
  const [cameraMode, setCameraMode] = useState(null);
  const [cameraStep, setCameraStep] = useState(1);
  const [tempPhotos, setTempPhotos] = useState({ ustadz: null, murid: null });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // --- EFEK & AUTO-UPDATE ---
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
  
  const showToastMsg = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const addNotif = (msg) => {
    const newNotif = { id: Date.now(), time: currentTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}), msg };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Kalkulasi Jarak
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; const p1 = lat1 * Math.PI/180; const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180; const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const refreshLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, config.lat, config.lng);
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist.toFixed(0), accuracy: pos.coords.accuracy.toFixed(1) });
        setIsLocationValid(dist <= config.radius);
        showToastMsg("Lokasi akurat diperbarui!");
      }, (err) => console.log(err), { enableHighAccuracy: true, maximumAge: 0 });
    }
  }, [config.lat, config.lng, config.radius]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, config.lat, config.lng);
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist.toFixed(0), accuracy: pos.coords.accuracy.toFixed(1) });
      setIsLocationValid(dist <= config.radius);
    }, (err) => console.log(err), { enableHighAccuracy: true, maximumAge: 0 });
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [config.lat, config.lng, config.radius]);

  // --- LOGIKA WAKTU & JADWAL ---
  const activeSession = schedules.find(s => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hS, mS] = s.start.split(':').map(Number);
    const [hE, mE] = s.end.split(':').map(Number);
    return now >= (hS * 60 + mS) && now <= (hE * 60 + mE);
  });

  const lateMin = (() => {
    if (!activeSession) return 0;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hS, mS] = activeSession.start.split(':').map(Number);
    return Math.max(0, now - (hS * 60 + mS));
  })();

  const earlyMin = (() => {
    if (!activeSession) return 0;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [hE, mE] = activeSession.end.split(':').map(Number);
    return Math.max(0, (hE * 60 + mE) - now);
  })();

  // --- CEK LIBUR & IZIN ---
  const todayHoliday = holidays.find(h => h.date === todayStr);
  const isSessionHoliday = todayHoliday?.isFullDay || (todayHoliday && activeSession && todayHoliday.sessions.includes(activeSession.id));
  
  const myTodayPermits = user ? permissions.filter(p => p.userId === user.id && p.date === todayStr) : [];
  const isPermittedNow = myTodayPermits.some(p => p.isFullDay || (activeSession && p.sessions.includes(activeSession.id)));

  // --- FUNGSI KAMERA ---
  const stopStream = () => {
    if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
  };
  
  const startCamera = async (step) => {
    stopStream();
    setCameraMode('active');
    setCameraStep(step);
    try {
      const facing = step === 1 ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Akses kamera ditolak.");
      setCameraMode(null);
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const img = canvas.toDataURL('image/jpeg');
      if (cameraStep === 1) setTempPhotos({...tempPhotos, ustadz: img});
      else setTempPhotos({...tempPhotos, murid: img});
    }
  };

  // --- FUNGSI ABSEN & IZIN ---
  const doAbsenMasuk = () => {
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isLate = lateMin > config.lateTolerance;
    const record = {
      id: Date.now(), userId: user.id, userName: user.name, date: todayStr,
      session: activeSession.name, sessionId: activeSession.id,
      timeIn: ts, timeOut: '-', status: isLate ? 'Terlambat' : 'Hadir',
      lateMin: lateMin, earlyMin: 0,
      photoUstadz: tempPhotos.ustadz, photoMurid: tempPhotos.murid
    };
    setAttendanceData([record, ...attendanceData]);
    addNotif(`${user.name} melakukan absen masuk pada ${activeSession.name}`);
    stopStream(); setCameraMode(null); setTempPhotos({ ustadz: null, murid: null });
    showToastMsg("Absen Masuk Berhasil!");
  };

  const doAbsenPulang = () => {
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setAttendanceData(attendanceData.map(a => 
      (a.userId === user.id && a.date === todayStr && a.sessionId === activeSession?.id && a.timeOut === '-') 
      ? { ...a, timeOut: ts, earlyMin: earlyMin } : a
    ));
    addNotif(`${user.name} melakukan absen pulang pada ${activeSession?.name}`);
    showToastMsg("Absen Pulang Berhasil!");
  };

  const submitIzin = (e) => {
    e.preventDefault();
    if (!permitForm.isFullDay && permitForm.sessions.length === 0) return showToastMsg("Pilih minimal 1 sesi!");
    const ts = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const record = {
      id: Date.now(), userId: user.id, userName: user.name, date: todayStr,
      type: permitForm.type, reason: permitForm.reason,
      isFullDay: permitForm.isFullDay, sessions: permitForm.sessions, timeReq: ts
    };
    setPermissions([record, ...permissions]);
    addNotif(`${user.name} mengajukan ${permitForm.type}.`);
    setIsPermitOpen(false); setPermitForm({ type: 'Izin', isFullDay: true, sessions: [], reason: '' });
    showToastMsg("Izin/Sakit Berhasil Diajukan");
  };

  const getHariBulanIni = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };

  const hitungAlpa = (uId) => {
    let totalTargetSesi = getHariBulanIni() * schedules.length;
    let totalHadir = attendanceData.filter(a => a.userId === uId).length;
    let totalIzin = permissions.filter(p => p.userId === uId).reduce((acc, p) => acc + (p.isFullDay ? schedules.length : p.sessions.length), 0);
    let totalLibur = holidays.reduce((acc, h) => acc + (h.isFullDay ? schedules.length : h.sessions.length), 0);
    let alpa = totalTargetSesi - totalHadir - totalIzin - totalLibur;
    return alpa > 0 ? alpa : 0;
  };

  // ==========================================
  // SCREEN: LOGIN PORTAL
  // ==========================================
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
               localStorage.removeItem('simpanLogin');
               localStorage.removeItem('savedUsername');
               localStorage.removeItem('savedPassword');
           }

           setUser(foundUser);
           setIsLoggedIn(true);
           setView(foundUser.role === 'admin' ? 'admin-dashboard' : foundUser.role === 'manajemen' ? 'mgmt-dashboard' : 'ustadz-dashboard');
           showToastMsg(`🎉 Akses Diterima! Selamat datang, ${foundUser.name}`);
       } else {
           setLoginError('Kredensial tidak valid! Periksa Username & Password.');
       }
    };

    return (
       <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900"></div>
          <div className="max-w-sm w-full bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden animate-in zoom-in duration-500 relative z-10">
             
             <div className="px-8 pt-10 pb-6 text-center relative">
                {config.logoUrl ? (
                   <div className="mx-auto w-32 h-32 flex items-center justify-center mb-6 transform hover:scale-105 transition-transform duration-500">
                      <img src={config.logoUrl} className="w-full h-full object-contain drop-shadow-xl" alt="Logo Aplikasi" />
                   </div>
                ) : (
                   <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-indigo-600 to-indigo-400 p-1 rounded-xl shadow-xl shadow-indigo-200 flex items-center justify-center mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                      <div className="w-full h-full bg-white rounded-lg flex items-center justify-center overflow-hidden">
                         <BookOpen size={40} className="text-indigo-600"/>
                      </div>
                   </div>
                )}
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">{config.appName}</h1>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mt-2">{config.slogan}</p>
             </div>

             <form onSubmit={handleLoginSubmit} className="px-8 pb-10 space-y-5">
                {loginError && (
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold text-center border border-rose-100 flex items-center justify-center gap-2 animate-in fade-in">
                     <AlertTriangle size={16}/> {loginError}
                  </div>
                )}
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Pengguna (Username)</label>
                   <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18}/>
                      <input type="text" required className="w-full py-3.5 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm focus:shadow-md" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="Masukkan username..." />
                   </div>
                </div>

                <div className="space-y-2 relative">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kata Sandi (Password)</label>
                   <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18}/>
                      <input type={showLoginPassword ? "text" : "password"} required className="w-full py-3.5 pl-12 pr-12 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm focus:shadow-md" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition p-1">
                         {showLoginPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                   </div>
                </div>

                <div className="flex items-center gap-3 pt-2 pl-1">
                   <input type="checkbox" id="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded-md border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all" />
                   <label htmlFor="remember" className="text-xs font-bold text-slate-500 cursor-pointer select-none hover:text-slate-800 transition-colors">Simpan Info Login</label>
                </div>

                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-[0.2em] mt-4 flex items-center justify-center gap-3">
                   <LogIn size={18}/> MASUK SISTEM
                </button>
             </form>
          </div>
       </div>
    );
  };

  // ==========================================
  // KOMPONEN UI UTAMA
  // ==========================================
  const renderSidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r shadow-xl md:shadow-none transform transition-all duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:-ml-64'} md:relative`} style={{ backgroundColor: theme.sidebarBg }}>
      <div className="p-6 flex items-center justify-between border-b bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {config.logoUrl ? <img src={config.logoUrl} className="w-10 h-10 object-contain drop-shadow-sm" alt="Logo" /> : <div className="bg-indigo-600 p-2 rounded text-white"><BookOpen size={20}/></div>}
          <div><h1 className="font-bold text-sm">{config.appName}</h1><p className="text-[10px] text-slate-500 uppercase font-bold">{config.slogan}</p></div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-blue-600 hover:rotate-90 transition-all p-1 group">
          <XCircle size={24} className="group-hover:stroke-blue-600" />
        </button>
      </div>

      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {user.role === 'admin' && (
          <>
            <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 mt-2">Menu Admin</p>
            <button onClick={() => setView('admin-dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'admin-dashboard' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50/50'}`} style={{ color: view === 'admin-dashboard' ? '#4338ca' : theme.sidebarText }}><LayoutGrid size={18}/> Dashboard Admin</button>
            <button onClick={() => setView('admin-users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'admin-users' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50/50'}`} style={{ color: view === 'admin-users' ? '#4338ca' : theme.sidebarText }}><Users size={18}/> Kelola User</button>
            <button onClick={() => setView('admin-schedules')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'admin-schedules' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50/50'}`} style={{ color: view === 'admin-schedules' ? '#4338ca' : theme.sidebarText }}><CalendarDays size={18}/> Jadwal & Libur</button>
            <button onClick={() => setView('admin-location')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'admin-location' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50/50'}`} style={{ color: view === 'admin-location' ? '#4338ca' : theme.sidebarText }}><MapPin size={18}/> Zona Lokasi</button>
            <button onClick={() => setView('mgmt-salary')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'mgmt-salary' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50/50'}`} style={{ color: view === 'mgmt-salary' ? '#4338ca' : theme.sidebarText }}><TrendingUp size={18}/> Monitoring Gaji</button>
            <button onClick={() => setView('admin-settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'admin-settings' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50/50'}`} style={{ color: view === 'admin-settings' ? '#4338ca' : theme.sidebarText }}><Settings size={18}/> Pengaturan Aplikasi</button>
          </>
        )}
        {user.role === 'manajemen' && (
          <>
            <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 mt-2">Menu Manajemen</p>
            <button onClick={() => setView('mgmt-dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'mgmt-dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutGrid size={18}/> Dashboard Manajemen</button>
            <button onClick={() => setView('mgmt-salary')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'mgmt-salary' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={18}/> Monitoring Gaji</button>
            <button onClick={() => setView('mgmt-notifications')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'mgmt-notifications' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Info size={18}/> Notifikasi Real-time</button>
            <button onClick={() => setView('mgmt-settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'mgmt-settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18}/> Parameter Keuangan</button>
          </>
        )}
        {user.role === 'ustadz' && (
          <>
            <p className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 mt-2">Menu Ustadz</p>
            <button onClick={() => setView('ustadz-dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'ustadz-dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><CheckCircle size={18}/> Absensi Ngaji</button>
            <button onClick={() => setView('ustadz-profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${view === 'ustadz-profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><UserCircle size={18}/> Profil Akun</button>
          </>
        )}
      </nav>
    </aside>
  );

  const renderHeader = () => (
    <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-30 transition-colors" style={{ backgroundColor: theme.headerBg }}>
      <div className="flex items-center gap-4">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Menu size={24}/></button>
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{view.includes('admin') ? 'Portal Admin' : view.includes('mgmt') ? 'Portal Manajemen' : 'Portal Ustadz'}</h2>
          <p className="text-xs text-slate-500 font-medium">{config.locationName}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-bold text-slate-800">{currentTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">{todayStr}</p>
        </div>
        <div className="relative">
          <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="p-1 rounded-full hover:bg-slate-100 transition"><UserCircle size={32} className="text-slate-600"/></button>
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border overflow-hidden z-50 animate-in fade-in">
              <div className="p-4 bg-slate-50 border-b flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">{user.name.charAt(0)}</div>
                <div className="overflow-hidden"><p className="text-sm font-bold text-slate-800 truncate">{user.name}</p><p className="text-[10px] font-bold text-indigo-600 uppercase">{user.role}</p></div>
              </div>
              {user.role === 'ustadz' && <button onClick={() => { setView('ustadz-profile'); setIsProfileDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition border-b">Profil Akun Saya</button>}
              <button onClick={() => { setIsLoggedIn(false); setUser(null); setIsProfileDropdownOpen(false); showToastMsg("Berhasil Logout"); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition"><LogOut size={16}/> Logout Keluar</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  const renderSharedDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Award size={20} className="text-amber-500"/> Top 3 Ustadz Terdisiplin</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {ustadzList.filter(u => u.role === 'ustadz').slice(0,3).map((u, i) => {
                const totalTarget = getHariBulanIni() * schedules.length;
                const hadir = attendanceData.filter(a => a.userId === u.id).length;
                const libur = holidays.reduce((acc, h) => acc + (h.isFullDay ? schedules.length : h.sessions.length), 0);
                const pct = Math.min(100, Math.round(((hadir+libur) / totalTarget) * 100)) || 100;
                return (
                  <div key={u.id} className="flex items-center gap-4 p-4 border rounded-xl bg-slate-50">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-sm ${i===0 ? 'bg-amber-100 text-amber-600' : i===1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>{i+1}</div>
                     <div><p className="font-bold text-slate-800 text-sm">{u.name}</p><p className="text-xs font-bold text-emerald-600">{pct}% Tingkat Kehadiran</p></div>
                  </div>
                );
             })}
          </div>
       </div>

       <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
             <h4 className="font-bold text-slate-800 text-sm">Rekapitulasi Kalkulasi Bulanan</h4>
             <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border">Target Bulan Ini: {getHariBulanIni() * schedules.length} Sesi Wajib</span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
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
                         {schedules.map(s => {
                            const hadirAsli = attendanceData.filter(a => a.userId === u.id && a.sessionId === s.id).length;
                            const liburHitungan = holidays.filter(h => h.isFullDay || h.sessions.includes(s.id)).length;
                            return (
                               <td key={s.id} className="p-4 text-center font-bold text-slate-600">
                                  {hadirAsli + liburHitungan}
                               </td>
                            );
                         })}
                         <td className="p-4 text-center font-bold text-sky-600">
                            {permissions.filter(p => p.userId === u.id).reduce((acc, p) => acc + (p.isFullDay ? schedules.length : p.sessions.length), 0)}
                         </td>
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
    <div className="bg-white rounded-xl border shadow-sm animate-in fade-in">
       <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800 text-sm">Manajemen Akun Guru / Ustadz</h4></div>
       <div className="p-6 border-b grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50">
          <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Nama Lengkap</label><input type="text" className="w-full p-2.5 border bg-white rounded-lg text-sm font-medium" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Username</label><input type="text" className="w-full p-2.5 border bg-white rounded-lg text-sm font-medium" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} /></div>
          <div className="space-y-1 relative">
             <label className="text-xs font-bold text-slate-500">Password</label>
             <input type={showPassword?"text":"password"} className="w-full p-2.5 border bg-white rounded-lg text-sm font-medium pr-10" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
             <button onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-8 text-slate-400">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
          <button onClick={() => {
             if(!userForm.name) return showToastMsg("Nama wajib diisi!");
             if(userForm.id) { setUstadzList(ustadzList.map(u => u.id === userForm.id ? {...u, ...userForm} : u)); showToastMsg("User Diedit"); }
             else { setUstadzList([...ustadzList, {...userForm, id: Date.now()}]); showToastMsg("User Ditambahkan"); }
             setUserForm({ id: null, name: '', username: '', password: '', role: 'ustadz' });
          }} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition">SIMPAN DATA USER</button>
       </div>
       <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-4">Nama</th><th className="p-4">Username</th><th className="p-4">Password</th><th className="p-4">Aksi</th></tr></thead>
             <tbody className="divide-y">
                {ustadzList.map(u => (
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
          <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800 text-sm">Manajemen Jadwal Ngaji</h4></div>
          <div className="p-6 border-b grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50">
             <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Nama Sesi</label><input type="text" className="w-full p-2.5 border bg-white rounded-lg text-sm font-medium" value={schForm.name} onChange={e => setSchForm({...schForm, name: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Jam Mulai</label><input type="time" className="w-full p-2.5 border bg-white rounded-lg text-sm font-medium" value={schForm.start} onChange={e => setSchForm({...schForm, start: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Jam Selesai</label><input type="time" className="w-full p-2.5 border bg-white rounded-lg text-sm font-medium" value={schForm.end} onChange={e => setSchForm({...schForm, end: e.target.value})} /></div>
             <button onClick={() => {
                if(!schForm.name) return showToastMsg("Nama jadwal harus diisi!");
                if(schForm.id) setSchedules(schedules.map(s => s.id === schForm.id ? {...s, ...schForm} : s));
                else setSchedules([...schedules, {...schForm, id: Date.now(), active: true}]);
                setSchForm({ id: null, name: '', start: '', end: '' }); showToastMsg("Jadwal Disimpan");
             }} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition">SIMPAN JADWAL</button>
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
                <input type="date" className="p-2.5 border bg-white rounded-lg text-sm font-medium" value={holidayForm.date} onChange={e => setHolidayForm({...holidayForm, date: e.target.value})} />
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
                setHolidayForm({ date: '', isFullDay: true, sessions: [] }); showToastMsg("Libur Ditambahkan (Akan Otomatis Dianggap Hadir di Kalkulasi)");
             }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition">TAMBAHKAN LIBUR</button>
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

  const renderAdminSettings = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2"><Settings size={18}/> Identitas Aplikasi & Upload Logo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Nama Aplikasi</label><input type="text" className="w-full p-3 border rounded-xl text-sm font-medium bg-slate-50" value={config.appName} onChange={e => setConfig({...config, appName: e.target.value})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Slogan / Subjudul</label><input type="text" className="w-full p-3 border rounded-xl text-sm font-medium bg-slate-50" value={config.slogan} onChange={e => setConfig({...config, slogan: e.target.value})} /></div>
             
             {/* -- FITUR UPLOAD LOGO APLIKASI (LOGIN & SIDEBAR) -- */}
             <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500">Upload Logo Aplikasi</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-dashed">
                   {config.logoUrl ? <img src={config.logoUrl} className="w-16 h-16 object-contain drop-shadow-md" alt="Preview Logo" /> : <div className="w-14 h-14 bg-white rounded-xl border flex items-center justify-center text-slate-400"><BookOpen size={24}/></div>}
                   <div className="flex-1">
                      <input type="file" accept="image/*" onChange={(e) => { if(e.target.files[0]) setConfig({...config, logoUrl: URL.createObjectURL(e.target.files[0])}); }} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">*Logo ini akan muncul di Halaman Login dan Sidebar.</p>
                   </div>
                </div>
             </div>
          </div>
          <button onClick={(e)=>{e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ TERSIMPAN!"; e.target.classList.replace('bg-slate-900','bg-emerald-600'); setTimeout(()=>{e.target.innerText="SIMPAN IDENTITAS"; e.target.classList.replace('bg-emerald-600','bg-slate-900');},2000)}, 800)}} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md transition-all">SIMPAN IDENTITAS</button>
       </div>

       <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2"><Settings size={18}/> Parameter Gaji & Denda (Admin)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Gaji Pokok</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold bg-slate-50" value={config.baseSalary} onChange={e => setConfig({...config, baseSalary: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Bonus Per Sesi</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-emerald-600 bg-slate-50" value={config.incentivePerSession} onChange={e => setConfig({...config, incentivePerSession: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Telat</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-rose-600 bg-slate-50" value={config.lateDeduction} onChange={e => setConfig({...config, lateDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Izin</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-rose-600 bg-slate-50" value={config.permitDeduction} onChange={e => setConfig({...config, permitDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Batas Telat (Mnt)</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-amber-600 bg-slate-50" value={config.lateTolerance} onChange={e => setConfig({...config, lateTolerance: parseInt(e.target.value)||0})} /></div>
          </div>
          <button onClick={(e)=>{e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ PARAMETER DISIMPAN!"; e.target.classList.replace('bg-indigo-600','bg-emerald-600'); setTimeout(()=>{e.target.innerText="SIMPAN PARAMETER"; e.target.classList.replace('bg-emerald-600','bg-indigo-600');},2000)}, 800)}} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md transition-all">SIMPAN PARAMETER</button>
       </div>

       <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2"><Settings size={18}/> Tampilan & Tema Warna</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Background Sidebar</label><input type="color" className="w-full h-12 border rounded-xl cursor-pointer p-1" value={theme.sidebarBg} onChange={e => setTheme({...theme, sidebarBg: e.target.value})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Teks Sidebar</label><input type="color" className="w-full h-12 border rounded-xl cursor-pointer p-1" value={theme.sidebarText} onChange={e => setTheme({...theme, sidebarText: e.target.value})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Background Header</label><input type="color" className="w-full h-12 border rounded-xl cursor-pointer p-1" value={theme.headerBg} onChange={e => setTheme({...theme, headerBg: e.target.value})} /></div>
          </div>
       </div>
    </div>
  );

  const renderMgmtSettings = () => (
     <div className="animate-in fade-in">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2"><Settings size={18}/> Pengaturan Parameter Gaji & Denda</h4>
          <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border">Pengaturan ini bersifat mandiri, Management dapat menyesuaikan nominal di bawah ini untuk mengkalkulasi ulang estimasi pengeluaran gaji.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Gaji Pokok</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold bg-slate-50" value={config.baseSalary} onChange={e => setConfig({...config, baseSalary: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Bonus Per Sesi</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-emerald-600 bg-slate-50" value={config.incentivePerSession} onChange={e => setConfig({...config, incentivePerSession: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Telat</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-rose-600 bg-slate-50" value={config.lateDeduction} onChange={e => setConfig({...config, lateDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Denda Izin</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-rose-600 bg-slate-50" value={config.permitDeduction} onChange={e => setConfig({...config, permitDeduction: parseInt(e.target.value)||0})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500">Batas Telat (Mnt)</label><input type="number" className="w-full p-3 border rounded-xl text-sm font-bold text-amber-600 bg-slate-50" value={config.lateTolerance} onChange={e => setConfig({...config, lateTolerance: parseInt(e.target.value)||0})} /></div>
          </div>
          <button onClick={(e)=>{e.target.innerText="MENYIMPAN..."; setTimeout(()=>{e.target.innerText="✓ PARAMETER DISIMPAN!"; e.target.classList.replace('bg-indigo-600','bg-emerald-600'); setTimeout(()=>{e.target.innerText="SIMPAN PENGATURAN"; e.target.classList.replace('bg-emerald-600','bg-indigo-600');},2000)}, 800)}} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md transition-all">SIMPAN PENGATURAN</button>
       </div>
     </div>
  );

  const renderMgmtSalary = () => {
    const calculateTotalSalary = (uId) => {
      // Data kehadiran fisik
      const uData = attendanceData.filter(a => a.userId === uId);
      const totalHadirSesi = uData.length;
      
      // Data libur (dihitung sebagai masuk/bonus otomatis)
      const totalLiburSesi = holidays.reduce((acc, h) => acc + (h.isFullDay ? schedules.length : h.sessions.length), 0);
      
      // Data izin/sakit
      const totalIzinSesi = permissions.filter(p => p.userId === uId).reduce((acc, p) => acc + (p.isFullDay ? schedules.length : p.sessions.length), 0);
      
      // Kalkulasi Gaji Pokok + Bonus (Hadir riil + Hari Libur)
      const bonusKehadiran = (totalHadirSesi + totalLiburSesi) * config.incentivePerSession;
      
      // Kalkulasi Denda
      const lates = uData.filter(a => a.status === 'Terlambat').length;
      const dendaTelat = lates * config.lateDeduction;
      const dendaIzin = totalIzinSesi * (config.permitDeduction || 0);
      
      return config.baseSalary + bonusKehadiran - dendaTelat - dendaIzin;
    };

    return (
      <div className="space-y-6 animate-in fade-in">
         {/* TABEL ESTIMASI GAJI GLOBAL */}
         <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 bg-white text-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100">
               <div>
                  <h4 className="font-black text-lg tracking-tight">Kalkulasi Gaji Real-Time</h4>
                  <p className="text-xs text-slate-500 font-bold mt-1 max-w-xl leading-relaxed">
                     *Sistem secara otomatis menghitung: Gaji Pokok + Bonus (Kehadiran Fisik & Hari Libur Resmi) - Denda (Keterlambatan & Ketidakhadiran/Izin). Setiap perubahan data akan langsung terbarui di tabel ini.
                  </p>
               </div>
               <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Pengeluaran Gaji</p>
                  <p className="text-xl font-black text-indigo-600">
                     Rp {ustadzList.filter(u => u.role === 'ustadz').reduce((sum, u) => sum + calculateTotalSalary(u.id), 0).toLocaleString('id-ID')}
                  </p>
               </div>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                     <tr>
                        <th className="p-4 pl-6">Nama Ustadz</th>
                        <th className="p-4 text-center">Hadir (Sesi)</th>
                        <th className="p-4 text-center text-emerald-600">+ Sesi Libur</th>
                        <th className="p-4 text-center text-rose-600">- Telat</th>
                        <th className="p-4 text-center text-rose-600">- Izin</th>
                        <th className="p-4 pr-6 text-right">Estimasi Gaji Bersih</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {ustadzList.filter(u => u.role === 'ustadz').map(u => {
                        const uData = attendanceData.filter(a => a.userId === u.id);
                        const totalHadirSesi = uData.length;
                        const lates = uData.filter(a => a.status === 'Terlambat').length;
                        const totalLiburSesi = holidays.reduce((acc, h) => acc + (h.isFullDay ? schedules.length : h.sessions.length), 0);
                        const totalIzinSesi = permissions.filter(p => p.userId === u.id).reduce((acc, p) => acc + (p.isFullDay ? schedules.length : p.sessions.length), 0);
                        const finalSalary = calculateTotalSalary(u.id);
                        
                        return (
                           <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 pl-6 font-bold text-slate-800">{u.name}</td>
                              <td className="p-4 text-center font-bold text-slate-600">{totalHadirSesi}</td>
                              <td className="p-4 text-center font-bold text-emerald-600">{totalLiburSesi}</td>
                              <td className="p-4 text-center font-bold text-rose-600">{lates}</td>
                              <td className="p-4 text-center font-bold text-rose-600">{totalIzinSesi}</td>
                              <td className="p-4 pr-6 font-black text-indigo-600 text-right text-lg">Rp {finalSalary.toLocaleString('id-ID')}</td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         </div>

         {/* TABEL AUDIT FOTO 1:1 */}
         <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
               <h4 className="font-bold text-slate-800 text-sm">Audit Kehadiran Fisik & Verifikasi Foto Ganda 1:1</h4>
               <button onClick={() => generateCleanPDF(attendanceData, config, currentTime)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-indigo-700 transition"><Download size={16}/> Unduh Laporan PDF Bersih</button>
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
                             <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${a.status==='Hadir'?'bg-emerald-100 text-emerald-700':a.status==='Terlambat'?'bg-rose-100 text-rose-700':'bg-sky-100 text-sky-700'}`}>{a.status}</span>
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
  };

  const renderUstadzDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
       {isSessionHoliday && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
             <div className="bg-amber-500 text-white p-3 rounded-xl shadow-md"><CalendarDays size={24}/></div>
             <div><h4 className="font-bold text-amber-900 text-lg">Jadwal Diliburkan</h4><p className="text-amber-700 text-sm font-medium">Sesi ngaji saat ini diliburkan. Waktu untuk istirahat.</p></div>
          </div>
       )}

       <div className="bg-white rounded-2xl border shadow-sm p-8 text-center relative overflow-hidden">
          <div className="mb-8">
             <p className="text-5xl font-mono font-black text-indigo-600 tracking-tighter">{currentTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</p>
             <h3 className="text-2xl font-black text-slate-800 mt-4">{isSessionHoliday ? 'Diliburkan' : activeSession ? activeSession.name : 'Jadwal Ngaji Belum Mulai'}</h3>
             <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">{activeSession ? `Batas Waktu: ${activeSession.start} - ${activeSession.end}` : 'Nantikan sesi berikutnya'}</p>
          </div>

          {activeSession && !isSessionHoliday && lateMin > config.lateTolerance && !attendanceData.some(a => a.userId === user?.id && a.date === todayStr && a.sessionId === activeSession.id) && (
            <div className="mb-6 inline-block bg-rose-50 text-rose-600 px-6 py-3 rounded-xl text-sm font-bold border border-rose-100 animate-pulse">
               Peringatan: Anda Terlambat {lateMin} Menit!
            </div>
          )}
          {earlyMin > 0 && attendanceData.some(a => a.userId === user?.id && a.date === todayStr && a.sessionId === activeSession?.id && a.timeOut === '-') && (
            <div className="mb-6 inline-block bg-amber-50 text-amber-700 px-6 py-3 rounded-xl text-sm font-bold border border-amber-100 animate-pulse">
               Peringatan: Pulang Terlalu Cepat {earlyMin} Menit!
            </div>
          )}

          {isPermittedNow ? (
             <div className="py-6 bg-slate-50 border rounded-2xl text-slate-500 font-bold text-lg">IZIN / SAKIT SEDANG AKTIF</div>
          ) : (
             <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-xl mx-auto flex-wrap">
                <div className="w-full flex justify-between items-center mb-4 px-4 bg-slate-50 py-3 rounded-xl border border-slate-100 shadow-inner">
                    <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                        <MapPin size={16} className={isLocationValid ? "text-emerald-500" : "text-rose-500"}/> 
                        Akurasi Lokasi GPS: <span className="text-indigo-600 font-black">±{location.accuracy || '-'} meter</span>
                    </div>
                    <button onClick={refreshLocation} className="text-xs font-bold text-indigo-600 bg-indigo-100 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-200 transition shadow-sm active:scale-95">
                        <RefreshCw size={14}/> Refresh
                    </button>
                </div>
                {!attendanceData.some(a => a.userId === user?.id && a.date === todayStr && a.sessionId === activeSession?.id) ? (
                   <button onClick={()=>startCamera(1)} disabled={isSessionHoliday || (!isLocationValid && !simulationMode) || !activeSession} className={`flex-1 py-5 rounded-2xl font-black text-lg transition shadow-xl flex items-center justify-center gap-3 ${isSessionHoliday || (!isLocationValid && !simulationMode) || !activeSession ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-95'}`}>
                      <Camera size={22}/> Absen Masuk (2 Foto)
                   </button>
                ) : (
                   attendanceData.some(a => a.userId === user?.id && a.date === todayStr && a.sessionId === activeSession?.id && a.timeOut !== '-') ? (
                      <button disabled className="flex-1 py-5 bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-lg rounded-2xl flex items-center justify-center gap-3 cursor-not-allowed"><CheckCircle size={22}/> Sesi Selesai</button>
                   ) : (
                      <button onClick={doAbsenPulang} className="flex-1 py-5 bg-rose-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-rose-200 hover:bg-rose-600 transition flex items-center justify-center gap-3 active:scale-95"><LogOut size={22}/> Selesai & Absen Pulang</button>
                   )
                )}
                <button onClick={()=>setIsPermitOpen(true)} disabled={isSessionHoliday || (activeSession && attendanceData.some(a => a.userId === user?.id && a.date === todayStr && a.sessionId === activeSession.id)) || (!activeSession && attendanceData.some(a => a.userId === user?.id && a.date === todayStr))} className="sm:w-auto px-8 py-5 bg-white border-2 border-slate-200 text-slate-500 font-black text-lg rounded-2xl hover:bg-slate-50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                   <AlertTriangle size={20}/> Izin
                </button>
             </div>
          )}
          {(!isLocationValid && !simulationMode) && <div className="mt-6 text-sm font-bold text-rose-500 flex items-center justify-center gap-2"><MapPin size={16}/> Luar Radius Asrama ({location.distance} Meter).</div>}
       </div>

       <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-slate-50"><h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><FileText size={18} className="text-indigo-600"/> Riwayat Kehadiran (10 Terakhir)</h4></div>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                   <tr><th className="p-4">Tanggal</th><th className="p-4">Waktu Ngaji</th><th className="p-4">Masuk</th><th className="p-4">Pulang</th><th className="p-4">Keterangan</th></tr>
                </thead>
                <tbody className="divide-y">
                   {attendanceData.filter(a => a.userId === user?.id).length === 0 ? <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold italic">Belum ada riwayat tercatat.</td></tr> : attendanceData.filter(a => a.userId === user?.id).slice(0,10).map(a => (
                     <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800">{a.date}</td>
                        <td className="p-4 font-bold text-indigo-700">{a.session}</td>
                        <td className="p-4 font-mono font-bold text-slate-600">{a.timeIn}</td>
                        <td className="p-4 font-mono font-bold text-slate-600">{a.status === 'Izin' || a.status === 'Sakit' ? '-' : a.timeOut}</td>
                        <td className="p-4">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${a.status==='Hadir'?'bg-emerald-100 text-emerald-700':a.status==='Terlambat'?'bg-rose-100 text-rose-700':'bg-sky-100 text-sky-700'}`}>{a.status}</span>
                           {a.lateMin > config.lateTolerance && <p className="text-[10px] text-rose-600 font-bold mt-1.5">Terlambat: {a.lateMin} Menit</p>}
                           {a.earlyMin > 0 && <p className="text-[10px] text-amber-600 font-bold mt-1.5">Pulang Terlalu Cepat: {a.earlyMin} Menit</p>}
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
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border shadow-sm animate-in fade-in">
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
          <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alamat Tempat Tinggal</label><textarea className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 min-h-[100px]" value={user.alamat} onChange={e => setUser({...user, alamat: e.target.value})}></textarea></div>
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hobi</label><input type="text" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500" value={user.hobi} onChange={e => setUser({...user, hobi: e.target.value})} /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Moto Hidup</label><input type="text" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-500" value={user.moto} onChange={e => setUser({...user, moto: e.target.value})} /></div>
          </div>
          <button onClick={()=>{showToastMsg("Profil Berhasil Disimpan");}} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 mt-6 transition active:scale-95 uppercase tracking-widest">SIMPAN PROFIL</button>
       </div>
    </div>
  );

  // --- CEK STATUS LOGIN ---
  if (!isLoggedIn) {
      return renderLoginScreen();
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="min-h-screen font-sans text-slate-800 flex bg-slate-50">
      {renderSidebar()}
      
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
         {renderHeader()}
         <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
            {(view === 'admin-dashboard' || view === 'mgmt-dashboard') && renderSharedDashboard()}
            {view === 'admin-users' && renderAdminUsers()}
            {view === 'admin-schedules' && renderAdminSchedules()}
            {view === 'admin-location' && (
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
            )}
            {view === 'admin-settings' && renderAdminSettings()}
            {view === 'mgmt-salary' && renderMgmtSalary()}
            {view === 'mgmt-settings' && renderMgmtSettings()}
            {view === 'mgmt-notifications' && (
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
            )}
            {view === 'ustadz-dashboard' && renderUstadzDashboard()}
            {view === 'ustadz-profile' && renderUstadzProfile()}
         </div>

         {/* --- MODAL KAMERA (Step 1 & 2) --- */}
         {cameraMode && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
               <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                  <div className="p-6 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                     <div className="relative z-10"><h3 className="font-black text-2xl tracking-tighter leading-none">{cameraStep===1?'Selfie Ustadz':'Foto Santri'}</h3><p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1.5">Langkah {cameraStep} / 2</p></div>
                     <button onClick={()=>{stopStream(); setCameraMode(null);}} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition relative z-10"><XCircle size={24}/></button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                     <div className={`p-4 rounded-2xl text-center font-bold text-[10px] uppercase tracking-widest ${cameraStep===1?'bg-indigo-50 text-indigo-600':'bg-emerald-50 text-emerald-600'}`}>
                        {cameraStep===1?'ℹ️ Arahkan kamera ke wajah Anda':'ℹ️ Foto suasana santri mengaji'}
                     </div>
                     <div className="relative aspect-[3/4] sm:aspect-video bg-slate-950 rounded-3xl overflow-hidden shadow-inner border-4 border-slate-100">
                        {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                           <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${cameraStep === 1 ? 'transform rotate-y-180' : ''}`} />
                        ) : (
                           <div className="relative h-full w-full">
                              <img src={cameraStep === 1 ? tempPhotos.ustadz : tempPhotos.murid} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><div className="bg-white/95 backdrop-blur text-emerald-600 px-6 py-3 rounded-2xl font-black text-sm shadow-xl">FOTO DIAMBIL ✓</div></div>
                           </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                     </div>

                     <div className="flex gap-4">
                        {((cameraStep === 1 && !tempPhotos.ustadz) || (cameraStep === 2 && !tempPhotos.murid)) ? (
                           <button onClick={capturePhoto} className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-3"><Camera size={24}/> Ambil Foto</button>
                        ) : (
                           <>
                             <button onClick={() => cameraStep === 1 ? setTempPhotos({...tempPhotos, ustadz:null}) : setTempPhotos({...tempPhotos, murid:null})} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-lg hover:bg-slate-200 transition">Ulangi</button>
                             {cameraStep === 1 ? (
                               <button onClick={() => startCamera(2)} className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition active:scale-95">Lanjut</button>
                             ) : (
                               <button onClick={doAbsenMasuk} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition animate-bounce active:scale-95">Kirim Absen</button>
                             )}
                           </>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}
         
         {/* --- MODAL FORM IZIN (SANGAT COMPACT & KECIL) --- */}
         {isPermitOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
               <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-4 bg-indigo-600 text-white text-center"><h3 className="font-black text-xl tracking-tight">Formulir Izin</h3><p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mt-1">Asrama Tahfidz Al Hidayah</p></div>
                  <form onSubmit={submitIzin} className="p-5 space-y-4">
                     <div className="flex gap-3">
                        {['Izin', 'Sakit'].map(t => (
                           <label key={t} className={`flex-1 flex justify-center py-2.5 rounded-xl border-2 cursor-pointer transition font-black text-sm ${permitForm.type === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                              <input type="radio" className="hidden" value={t} checked={permitForm.type === t} onChange={e => setPermitForm({...permitForm, type: e.target.value})} />{t}
                           </label>
                        ))}
                     </div>
                     
                     <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                        <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer"><input type="checkbox" checked={permitForm.isFullDay} onChange={e => setPermitForm({...permitForm, isFullDay: e.target.checked, sessions: []})} className="w-4 h-4 text-indigo-600 rounded" /> Izin Satu Hari Penuh</label>
                        {!permitForm.isFullDay && (
                           <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                              <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pilih Sesi Ngaji:</p>
                              {schedules.map(s => (
                                 <label key={s.id} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border shadow-sm cursor-pointer hover:border-indigo-200 transition">
                                    <input type="checkbox" checked={permitForm.sessions.includes(s.id)} onChange={e => { const ns = e.target.checked ? [...permitForm.sessions, s.id] : permitForm.sessions.filter(x=>x!==s.id); setPermitForm({...permitForm, sessions: ns}); }} className="rounded w-3.5 h-3.5 text-indigo-600" /> {s.name}
                                 </label>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
                        <textarea required className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:bg-white focus:border-indigo-200 min-h-[80px]" placeholder="Berikan alasan yang jelas..." value={permitForm.reason} onChange={e => setPermitForm({...permitForm, reason: e.target.value})}></textarea>
                     </div>
                     <div className="flex gap-3 pt-2">
                        <button type="button" onClick={()=>setIsPermitOpen(false)} className="flex-1 py-3 font-black text-slate-400 hover:bg-slate-50 rounded-xl transition uppercase tracking-widest text-[10px]">TUTUP</button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 uppercase tracking-widest">SIMPAN IZIN</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* --- MODAL KONFIRMASI (Hapus) --- */}
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

         {/* --- TOAST MESSAGE --- */}
         {toast.show && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-8 py-4 rounded-full font-black text-sm shadow-2xl animate-in slide-in-from-top flex items-center gap-3">
               <CheckCircle size={20} className="text-emerald-400" /> {toast.msg}
            </div>
         )}

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slide-in-top { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
        .zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .slide-in-from-top { animation: slide-in-top 0.4s ease-out forwards; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default App;