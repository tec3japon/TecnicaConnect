import React, { useState, useEffect } from 'react';
import { User, UserRole, Notification, StudentGrade, AttendanceRecord } from '../types';
import { getRoleDashboardInfo } from '../services/authService';
import { getNotifications, getStudentGrades, getStudentAttendanceHistory } from '../services/dataService';
import AdminPanel from './AdminPanel';
import AIChat from './AIChat';
import Button from './Button';

interface DashboardProps {
  user: User;
  currentRole: UserRole;
  onLogout: () => void;
  onChangeRole: () => void;
}

type StudentTab = 'HOME' | 'GRADES' | 'ATTENDANCE';

const Dashboard: React.FC<DashboardProps> = ({ user, currentRole, onLogout, onChangeRole }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [studentTab, setStudentTab] = useState<StudentTab>('HOME');
  const dashboardInfo = getRoleDashboardInfo(currentRole);

  useEffect(() => {
    const fetchData = async () => {
      const notifs = await getNotifications(currentRole, user.courseId);
      setNotifications(notifs);

      if (currentRole === UserRole.ALUMNO) {
          const studentGrades = await getStudentGrades(user.id);
          setGrades(studentGrades);
          const history = await getStudentAttendanceHistory(user.id);
          setAttendanceHistory(history);
      }
    };
    fetchData();
  }, [currentRole, user.courseId, user.id]);

  // --- LOGIC: Attendance Statistics ---
  const getAttendanceStats = () => {
      // FILTER: Only show "General" attendance (Preceptor), which has no subjectId.
      // Teacher attendance (Subject specific) is excluded from the main stats.
      const generalRecords = attendanceHistory.filter(r => !r.subjectId);

      const historyList = generalRecords.map(record => {
          const [year, month, day] = record.date.split('-').map(Number);
          return {
              date: new Date(year, month - 1, day),
              dateStr: record.date,
              status: record.status
          };
      }).sort((a, b) => b.date.getTime() - a.date.getTime());

      const totalRecorded = historyList.length;
      const presentCount = historyList.filter(x => x.status === 'Presente').length;
      const absentCount = historyList.filter(x => x.status === 'Ausente').length;
      const lateCount = historyList.filter(x => x.status === 'Tarde').length;
      
      // Calculate percentage based on general attendance
      // Typically: Present + (Late * 0.5) / Total Days
      const percentage = totalRecorded > 0 
          ? Math.round(((presentCount + (lateCount * 0.5)) / totalRecorded) * 100) 
          : 100;

      return { historyList, totalRecorded, presentCount, absentCount, lateCount, percentage };
  };

  // --- RENDER: Student Attendance View ---
  const renderStudentAttendance = () => {
    const { historyList, presentCount, absentCount, lateCount, percentage } = getAttendanceStats();

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800">Mi Asistencia (Preceptoría)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Chart & Summary */}
                 <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col items-center justify-center">
                      <h3 className="font-bold text-lg text-slate-800 mb-6 w-full text-left">Resumen Global</h3>
                      <div className="relative w-48 h-48 mb-6">
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#f1f5f9"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={percentage >= 60 ? "#10b981" : "#f43f5e"}
                                strokeWidth="3"
                                strokeDasharray={`${percentage}, 100`}
                              />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                              <span className={`text-3xl font-bold ${percentage >= 60 ? "text-slate-800" : "text-rose-600"}`}>{percentage}%</span>
                              <span className="text-xs text-slate-500 uppercase font-semibold">Asistencia</span>
                          </div>
                      </div>
                      <div className="flex justify-center gap-6 w-full">
                          <div className="text-center">
                              <span className="block text-xl font-bold text-emerald-600">{presentCount}</span>
                              <span className="text-xs text-slate-500">Presentes</span>
                          </div>
                          <div className="text-center">
                              <span className="block text-xl font-bold text-rose-500">{absentCount}</span>
                              <span className="text-xs text-slate-500">Ausentes</span>
                          </div>
                          <div className="text-center">
                              <span className="block text-xl font-bold text-amber-500">{lateCount}</span>
                              <span className="text-xs text-slate-500">Tardes</span>
                          </div>
                      </div>
                 </div>

                 {/* History List */}
                 <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col h-[400px]">
                      <h3 className="font-bold text-lg text-slate-800 mb-4">Historial Detallado</h3>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                           {historyList.length > 0 ? (
                               historyList.map((item, idx) => (
                                   <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-50 last:border-0">
                                       <div className="flex items-center gap-3">
                                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                               item.status === 'Presente' ? 'bg-emerald-100 text-emerald-600' :
                                               item.status === 'Ausente' ? 'bg-rose-100 text-rose-600' :
                                               item.status === 'Tarde' ? 'bg-amber-100 text-amber-600' :
                                               'bg-blue-100 text-blue-600'
                                           }`}>
                                               {item.status[0]}
                                           </div>
                                           <div>
                                               <span className="block text-sm font-semibold text-slate-700 capitalize">
                                                   {item.date.toLocaleDateString('es-AR', { weekday: 'long' })}
                                               </span>
                                               <span className="text-xs text-slate-400">
                                                   {item.date.toLocaleDateString()}
                                               </span>
                                           </div>
                                       </div>
                                       <div className={`text-xs font-bold px-2 py-1 rounded ${
                                            item.status === 'Presente' ? 'text-emerald-600 bg-emerald-50' :
                                            item.status === 'Ausente' ? 'text-rose-600 bg-rose-50' :
                                            item.status === 'Tarde' ? 'text-amber-600 bg-amber-50' :
                                            'text-blue-600 bg-blue-50'
                                       }`}>
                                           {item.status}
                                       </div>
                                   </div>
                               ))
                           ) : (
                               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                   <span className="text-2xl mb-2">📅</span>
                                   <p className="text-sm">Aún no hay registros de asistencia general.</p>
                               </div>
                           )}
                      </div>
                 </div>
            </div>
        </div>
    );
  };

  // --- RENDER: Student Grades View ---
  const renderStudentGrades = () => {
    return (
        <div className="space-y-6 animate-fade-in-up">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Boletín de Calificaciones</h2>
                <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    Ciclo Lectivo 2024
                </div>
             </div>
             
             <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto pb-4">
                    <table className="w-full min-w-[1000px] border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider text-center border-b border-slate-200">
                                <th className="p-4 text-left w-64 border-r border-slate-100 font-bold bg-slate-50 sticky left-0 z-10">Materia</th>
                                
                                {/* 1° Cuatrimestre */}
                                <th colSpan={3} className="p-2 border-r border-slate-200 bg-blue-50/50 text-blue-700">1° Cuatrimestre</th>
                                
                                {/* 2° Cuatrimestre */}
                                <th colSpan={4} className="p-2 border-r border-slate-200 bg-indigo-50/50 text-indigo-700">2° Cuatrimestre</th>
                                
                                {/* Instancia Final */}
                                <th colSpan={3} className="p-2 bg-emerald-50/50 text-emerald-700">Instancia Final</th>
                            </tr>
                            <tr className="text-[10px] text-slate-600 font-semibold text-center bg-white border-b border-slate-100">
                                <th className="p-2 border-r border-slate-100 sticky left-0 bg-white z-10"></th>
                                
                                {/* 1° C Cols */}
                                <th className="p-2 w-20 border-r border-slate-100">1° Val.<br/>Parcial</th>
                                <th className="p-2 w-20 border-r border-slate-100">Calif.<br/>1° Cuat.</th>
                                <th className="p-2 w-20 border-r border-slate-200">Intensif.<br/>1° Cuat.</th>
                                
                                {/* 2° C Cols */}
                                <th className="p-2 w-20 border-r border-slate-100">2° Val.<br/>Parcial</th>
                                <th className="p-2 w-20 border-r border-slate-100">Calif.<br/>2° Cuat.</th>
                                <th className="p-2 w-20 border-r border-slate-100">Int. 1°C<br/>(en 2°)</th>
                                <th className="p-2 w-20 border-r border-slate-200">Intensif.<br/>2° Cuat.</th>

                                {/* Final Cols */}
                                <th className="p-2 w-20 border-r border-slate-100">Intensif.<br/>Dic.</th>
                                <th className="p-2 w-20 border-r border-slate-100">Intensif.<br/>Feb.</th>
                                <th className="p-2 w-20 font-bold text-slate-800">Calif.<br/>Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {grades.map((grade) => (
                                <tr key={grade.subjectId} className="hover:bg-slate-50/50 transition-colors text-center text-sm">
                                    <td className="p-4 text-left font-semibold text-slate-700 border-r border-slate-100 sticky left-0 bg-white z-10 truncate max-w-xs" title={grade.subjectName}>
                                        {grade.subjectName}
                                    </td>

                                    {/* 1° C */}
                                    <td className="p-3 border-r border-slate-100 text-slate-500">{grade.valParcial1 || '-'}</td>
                                    <td className={`p-3 border-r border-slate-100 font-bold ${Number(grade.calificacion1) >= 7 ? 'text-emerald-600' : Number(grade.calificacion1) < 4 && grade.calificacion1 ? 'text-rose-500' : 'text-slate-700'}`}>
                                        {grade.calificacion1 || '-'}
                                    </td>
                                    <td className="p-3 border-r border-slate-200 text-xs text-slate-500">{grade.intensificacion1 || '-'}</td>

                                    {/* 2° C */}
                                    <td className="p-3 border-r border-slate-100 text-slate-500">{grade.valParcial2 || '-'}</td>
                                    <td className={`p-3 border-r border-slate-100 font-bold ${Number(grade.calificacion2) >= 7 ? 'text-emerald-600' : Number(grade.calificacion2) < 4 && grade.calificacion2 ? 'text-rose-500' : 'text-slate-700'}`}>
                                        {grade.calificacion2 || '-'}
                                    </td>
                                    <td className="p-3 border-r border-slate-100 text-xs text-slate-500">{grade.intensificacion1_en_2 || '-'}</td>
                                    <td className="p-3 border-r border-slate-200 text-xs text-slate-500">{grade.intensificacion2 || '-'}</td>

                                    {/* Final */}
                                    <td className="p-3 border-r border-slate-100 text-xs text-slate-500">{grade.intensificacionDic || '-'}</td>
                                    <td className="p-3 border-r border-slate-100 text-xs text-slate-500">{grade.intensificacionFeb || '-'}</td>
                                    <td className={`p-3 font-bold ${Number(grade.calificacionFinal) >= 7 ? 'text-emerald-600 bg-emerald-50/30' : 'text-slate-800'}`}>
                                        {grade.calificacionFinal || '-'}
                                    </td>
                                </tr>
                            ))}
                            {grades.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-400">
                                        No hay calificaciones registradas aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>
    );
  };

  // --- RENDER: Student Home View ---
  const renderStudentHome = () => {
     const { percentage, presentCount, absentCount } = getAttendanceStats();

     return (
         <div className="space-y-8 animate-fade-in-up">
              {/* Stats Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center justify-between">
                      <div>
                          <p className="text-sm text-slate-500 font-medium">Porcentaje Asistencia</p>
                          <h3 className={`text-3xl font-bold mt-1 ${percentage >= 80 ? 'text-emerald-600' : percentage >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{percentage}%</h3>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-2xl">
                          📊
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center justify-between">
                      <div>
                          <p className="text-sm text-slate-500 font-medium">Inasistencias</p>
                          <h3 className="text-3xl font-bold mt-1 text-slate-800">{absentCount}</h3>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 text-xl font-bold">
                          A
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex items-center justify-between">
                      <div>
                          <p className="text-sm text-slate-500 font-medium">Materias Cursadas</p>
                          <h3 className="text-3xl font-bold mt-1 text-brand-600">{grades.length || '-'}</h3>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center text-2xl">
                          📚
                      </div>
                  </div>
              </div>

              {/* Messages / Notifications */}
              <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                   <div className="relative z-10">
                       <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                           <span className="text-3xl">📢</span> Tablón de Novedades
                       </h3>
                       
                       {notifications.length > 0 ? (
                           <div className="space-y-4">
                               {notifications.map(n => (
                                   <div key={n.id} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-colors">
                                       <div className="flex justify-between items-start mb-2">
                                           <div className="font-bold text-lg">{n.title}</div>
                                           {n.priority === 'Alta' && <span className="bg-rose-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Importante</span>}
                                       </div>
                                       <p className="text-white/90 leading-relaxed">{n.message}</p>
                                       <div className="text-xs text-white/60 mt-4 flex justify-between items-center pt-3 border-t border-white/10">
                                           <span className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                {new Date(n.date).toLocaleDateString()}
                                           </span>
                                           <span className="flex items-center gap-1">
                                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                               {n.senderName}
                                           </span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <div className="text-center py-10 bg-white/5 rounded-xl border border-white/10">
                               <p className="text-white/70">No hay comunicados recientes.</p>
                           </div>
                       )}
                   </div>
                   
                   {/* Background decoration */}
                   <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
              </div>
         </div>
     );
  };

  const renderContent = () => {
    if (currentRole === UserRole.ALUMNO) {
        switch (studentTab) {
            case 'GRADES': return renderStudentGrades();
            case 'ATTENDANCE': return renderStudentAttendance();
            case 'HOME':
            default: return renderStudentHome();
        }
    }

    // Default to AdminPanel for other roles (Docente, Preceptor, Admin, Directivo)
    // IMPORTANT: Pass current user so sub-components can access ID and Roles correctly
    return <AdminPanel currentUser={user} currentUserRole={currentRole} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       {/* Top Navbar */}
       <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-${dashboardInfo.theme}-100 text-${dashboardInfo.theme}-600`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{dashboardInfo.title}</h1>
                        <p className="text-xs text-slate-500 hidden sm:block">TecnicaConnect v2.0</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-800">{user.name} {user.lastName}</div>
                            <div className="text-xs text-slate-500 capitalize">{currentRole}</div>
                        </div>
                        <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full bg-slate-200 border-2 border-white shadow-sm object-cover" />
                        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Cerrar Sesión">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
           </div>
       </header>

       {/* Student Navigation Tabs (Only for ALUMNO) */}
       {currentRole === UserRole.ALUMNO && (
           <div className="bg-white border-b border-slate-200">
               <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                   <div className="flex space-x-8">
                       <button 
                            onClick={() => setStudentTab('HOME')}
                            className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${studentTab === 'HOME' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            Panel Principal
                       </button>
                       <button 
                            onClick={() => setStudentTab('GRADES')}
                            className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${studentTab === 'GRADES' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            Calificaciones
                       </button>
                       <button 
                            onClick={() => setStudentTab('ATTENDANCE')}
                            className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${studentTab === 'ATTENDANCE' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            Asistencias
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* Main Content Area */}
       <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Inicio</span>
                    <span>/</span>
                    <span className="font-semibold text-brand-600 capitalize">
                        {currentRole === UserRole.ALUMNO 
                            ? (studentTab === 'HOME' ? 'Panel Principal' : studentTab === 'GRADES' ? 'Boletín' : 'Asistencia') 
                            : currentRole}
                    </span>
                </div>
                {user.roles.length > 1 && (
                    <Button variant="outline" onClick={onChangeRole} className="text-xs py-1.5 px-3">
                        Cambiar Rol
                    </Button>
                )}
            </div>

            {renderContent()}
       </main>

       <AIChat currentRole={currentRole} />
    </div>
  );
};

export default Dashboard;