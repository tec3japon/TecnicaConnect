import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, AttendanceRecord, AttendanceStatus, UserRole, Notification, Subject, SubjectGroup } from '../types';
import { getAllUsers } from '../services/authService';
import { 
  getAllCourses, 
  getAttendanceByDate, 
  saveAttendanceBulk, 
  getNotifications, 
  saveNotification, 
  getCourseAttendanceMonthly, 
  getAllSpecialties,
  getAllSubjects,
  getGradesForSubject,
  saveGrades,
  StudentGradeWithUser
} from '../services/dataService';
import Button from './Button';

interface AttendancePanelProps {
  currentUser: User;
}

type MainTab = 'NOTIFICATIONS' | 'ATTENDANCE' | 'GRADES';
type HistoryViewMode = 'MONTH' | 'WEEK';

const AttendancePanel: React.FC<AttendancePanelProps> = ({ currentUser }) => {
  const isTeacher = currentUser.roles.includes(UserRole.DOCENTE);
  const isPreceptor = currentUser.roles.includes(UserRole.PRECEPTOR);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<MainTab>(isTeacher ? 'GRADES' : 'ATTENDANCE');

  // Navigation & Data States
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  
  const [receivedNotifications, setReceivedNotifications] = useState<Notification[]>([]);
  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
  const [specialtiesMap, setSpecialtiesMap] = useState<Record<string, string>>({});
  
  // Selection States
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [activeGroup, setActiveGroup] = useState<SubjectGroup | null>(null); // New State for Group Selection
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // History View States
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>('MONTH');
  const [viewWeek, setViewWeek] = useState<number>(1);
  const [historyData, setHistoryData] = useState<Record<string, Record<number, string>>>({});
  
  // Operational States
  const [students, setStudents] = useState<User[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Grades View States
  const [courseSubjects, setCourseSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<StudentGradeWithUser[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  // Message Form State
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [msgForm, setMsgForm] = useState({
      title: '',
      message: '',
      courseId: '',
      priority: 'Normal'
  });

  useEffect(() => {
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseData();
      if (!isTeacher) {
          fetchCourseSubjects(); 
      }
    } else {
        setStudents([]);
        if (!isTeacher) setCourseSubjects([]);
    }
  }, [selectedCourseId, activeGroup]); // Reload students if group changes

  useEffect(() => {
      if (selectedSubjectId) {
          const subject = isTeacher ? mySubjects.find(s => s.id === selectedSubjectId) : courseSubjects.find(s => s.id === selectedSubjectId);
          if (subject) {
              if (isTeacher && subject.courseId && subject.courseId !== selectedCourseId) {
                  setSelectedCourseId(subject.courseId);
              }
              fetchGradesData();
          }
      } else {
          setSubjectGrades([]);
      }
  }, [selectedSubjectId, activeGroup]); // Reload grades if group changes

  useEffect(() => {
    if (selectedCourseId && selectedDate) {
        // Sync the history view month/year to the selected date
        const dateObj = new Date(selectedDate);
        if(!isNaN(dateObj.getTime())) {
             if (dateObj.getMonth() + 1 !== viewMonth || dateObj.getFullYear() !== viewYear) {
                 setViewMonth(dateObj.getMonth() + 1);
                 setViewYear(dateObj.getFullYear());
             }
        }
        fetchDailyAttendance();
    }
  }, [selectedCourseId, selectedDate, selectedSubjectId]); 

  useEffect(() => {
      if (selectedCourseId) { 
          fetchMonthlyHistory();
      }
  }, [selectedCourseId, viewMonth, viewYear, selectedSubjectId]); 

  const fetchInitialData = async () => {
    setLoading(true);
    
    // Notifications
    const allNotifs = await getNotifications(); 
    const targetRole = isTeacher ? UserRole.DOCENTE : UserRole.PRECEPTOR;
    const received = allNotifs.filter(n => n.targetRoles.includes(targetRole));
    setReceivedNotifications(received);

    const myName = `${currentUser.lastName}, ${currentUser.name}`;
    const sent = allNotifs.filter(n => n.senderName === myName);
    setSentNotifications(sent);

    // Courses & Specialties
    const allCourses = await getAllCourses();
    setCourses(allCourses);
    
    const specs = await getAllSpecialties();
    const sMap: Record<string, string> = {};
    specs.forEach(s => sMap[s.id] = s.name);
    setSpecialtiesMap(sMap);

    // Role specific
    if (isTeacher) {
        const allSubjects = await getAllSubjects();
        // Fetch subjects where I am the main teacher OR assigned to a group
        const mySubs = allSubjects.filter(s => 
            s.teacherId === currentUser.id || 
            (s.groups && s.groups.some(g => g.teacherId === currentUser.id))
        );
        setMySubjects(mySubs);
    } else if (isPreceptor) {
        if (!currentUser.roles.includes(UserRole.ADMIN)) {
            // Updated to check preceptorIds array
            setMyCourses(allCourses.filter(c => c.preceptorIds?.includes(currentUser.id)));
        } else {
            setMyCourses(allCourses);
        }
    }
    setLoading(false);
  };

  const fetchCourseData = async () => {
      const allUsers = await getAllUsers();
      let courseStudents = allUsers
        .filter(u => u.roles.includes(UserRole.ALUMNO) && u.courseId === selectedCourseId)
        .sort((a, b) => a.lastName.localeCompare(b.lastName));
      
      // Filter by Technical Group if active
      if (activeGroup) {
          // Logic: Match if student technicalGroup is part of Group Name (e.g. Name: "Grupo A" -> matches "A")
          courseStudents = courseStudents.filter(s => {
              if (!s.technicalGroup) return false;
              return activeGroup.name.includes(s.technicalGroup);
          });
      }

      setStudents(courseStudents);
  };

  const fetchCourseSubjects = async () => {
      const allSubjects = await getAllSubjects();
      const subjectsForCourse = allSubjects.filter(s => s.courseId === selectedCourseId);
      setCourseSubjects(subjectsForCourse);
  };

  const fetchGradesData = async () => {
      if (!selectedCourseId || !selectedSubjectId) return;
      setLoadingGrades(true);
      try {
          const grades = await getGradesForSubject(selectedSubjectId, selectedCourseId);
          // Filter grades if looking at a specific group
          let filteredGrades = grades;
          if (activeGroup) {
               // We need to fetch students again to know their group or rely on internal mapping? 
               // getGradesForSubject returns StudentGradeWithUser which has User details.
               // We can filter locally based on the fetched students state which is already filtered.
               const studentIds = students.map(s => s.id);
               filteredGrades = grades.filter(g => studentIds.includes(g.studentId));
          }
          setSubjectGrades(filteredGrades);
      } catch (error) {
          console.error("Error fetching grades", error);
      } finally {
          setLoadingGrades(false);
      }
  };

  const handleGradeChange = (studentId: string, field: keyof StudentGradeWithUser, value: string) => {
      setSubjectGrades(prev => prev.map(g => {
          if (g.studentId === studentId) {
              return { ...g, [field]: value };
          }
          return g;
      }));
  };

  const handleSaveGrades = async () => {
      setSavingGrades(true);
      try {
          await saveGrades(subjectGrades);
          alert('Calificaciones guardadas correctamente.');
      } catch (e) {
          alert('Error al guardar notas.');
      } finally {
          setSavingGrades(false);
      }
  };

  const fetchDailyAttendance = async () => {
    if (!selectedCourseId) return;
    try {
      // Pass selectedSubjectId if it exists (for teachers)
      const records = await getAttendanceByDate(selectedCourseId, selectedDate, selectedSubjectId || undefined);
      const statusMap: Record<string, AttendanceStatus> = {};
      records.forEach(r => statusMap[r.studentId] = r.status);
      setAttendanceData(statusMap);
    } catch (e) { console.error(e); }
  };

  const fetchMonthlyHistory = async () => {
      if (!selectedCourseId) return;
      setLoadingHistory(true);
      try {
          // Pass selectedSubjectId if it exists (for teachers)
          const records = await getCourseAttendanceMonthly(selectedCourseId, viewMonth, viewYear, selectedSubjectId || undefined);
          const historyMap: Record<string, Record<number, string>> = {};
          
          records.forEach(r => {
              const day = parseInt(r.date.split('-')[2]);
              if (!historyMap[r.studentId]) historyMap[r.studentId] = {};
              const char = r.status === 'Presente' ? 'P' : r.status === 'Ausente' ? 'A' : r.status === 'Tarde' ? 'T' : 'J';
              historyMap[r.studentId][day] = char;
          });
          setHistoryData(historyMap);
      } catch (e) { console.error(e); }
      finally { setLoadingHistory(false); }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records: AttendanceRecord[] = students.map(student => ({
        id: `${student.id}_${selectedDate}`, // Will be overwritten in service with robust ID
        studentId: student.id,
        courseId: selectedCourseId,
        subjectId: selectedSubjectId || undefined,
        date: selectedDate,
        status: attendanceData[student.id] || 'Presente'
      }));
      await saveAttendanceBulk(records);
      alert('Asistencia guardada correctamente.');
      fetchMonthlyHistory();
      // Also fetch daily to sync local state with what was actually saved
      fetchDailyAttendance();
    } catch (e) {
      alert('Error al guardar asistencia.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          if (!msgForm.courseId) {
              alert("Por favor seleccione un curso.");
              setSaving(false);
              return;
          }
          const newNotification: Notification = {
              id: '',
              title: msgForm.title,
              message: msgForm.message,
              date: new Date().toISOString(),
              targetRoles: [UserRole.ALUMNO],
              senderName: `${currentUser.lastName}, ${currentUser.name}`,
              priority: msgForm.priority as 'Normal' | 'Alta',
              courseId: msgForm.courseId
          };
          await saveNotification(newNotification);
          alert("Mensaje enviado correctamente.");
          setIsMsgModalOpen(false);
          setMsgForm({ title: '', message: '', courseId: '', priority: 'Normal' });
          fetchInitialData(); 
      } catch (err) {
          alert("Error al enviar el mensaje");
      } finally {
          setSaving(false);
      }
  };

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleJumpToDate = (day: number) => {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDate(dateStr);
  };

  // --- RENDERING HELPERS ---

  const renderNotifications = () => (
      <div className="animate-fade-in-up space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Panel de Comunicaciones</h2>
              <Button onClick={() => setIsMsgModalOpen(true)}>✉️ Redactar Mensaje</Button>
          </div>
          <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 border-b border-slate-200 pb-2">Recibidos de Dirección</h3>
              {receivedNotifications.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-xl border border-slate-100 text-slate-400 text-sm italic">No tienes mensajes nuevos.</div>
              ) : (
                receivedNotifications.map(n => (
                    <div key={n.id} className={`mb-4 p-6 rounded-2xl border-l-4 shadow-soft flex items-start gap-4 ${n.priority === 'Alta' ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-white border-brand-500 text-slate-800'}`}>
                        <div className={`p-3 rounded-full shrink-0 ${n.priority === 'Alta' ? 'bg-rose-100 text-rose-600' : 'bg-brand-50 text-brand-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-lg">{n.title}</h4>
                                {n.priority === 'Alta' && <span className="text-[10px] uppercase font-bold bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full">Urgente</span>}
                            </div>
                            <p className="opacity-90 leading-relaxed">{n.message}</p>
                            <div className="text-xs mt-4 opacity-60 font-semibold flex items-center gap-2">
                                <span>📅 {new Date(n.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>👤 {n.senderName}</span>
                            </div>
                        </div>
                    </div>
                ))
              )}
          </div>
      </div>
  );

  const renderSubjectGrid = (onClickSubject: (s: Subject, g?: SubjectGroup) => void) => (
      <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Seleccione una Materia</h2>
          {mySubjects.length === 0 && <div className="text-slate-500 italic p-8 bg-white rounded-xl shadow-soft text-center">No tienes materias asignadas.</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySubjects.flatMap(sub => {
                  const course = courses.find(c => c.id === sub.courseId);
                  
                  // Logic to split cards if I teach multiple groups
                  const renderItems: { subject: Subject, group?: SubjectGroup }[] = [];
                  
                  // If main teacher
                  if (sub.teacherId === currentUser.id) {
                      renderItems.push({ subject: sub });
                  }
                  
                  // If assigned to specific groups
                  if (sub.groups) {
                      sub.groups.forEach(g => {
                          if (g.teacherId === currentUser.id) {
                              renderItems.push({ subject: sub, group: g });
                          }
                      });
                  }

                  return renderItems.map((item, idx) => (
                      <button 
                          key={`${sub.id}-${idx}`}
                          onClick={() => onClickSubject(item.subject, item.group)}
                          className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 hover:shadow-lg hover:border-brand-300 transition-all text-left group flex flex-col justify-between h-40"
                      >
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">
                                      {course ? `${course.name} - ${course.shift}` : 'Sin Curso'}
                                  </span>
                                  {item.group && (
                                      <span className="bg-brand-50 text-brand-600 px-2 py-1 rounded-lg text-xs font-bold border border-brand-100">
                                          {item.group.name}
                                      </span>
                                  )}
                              </div>
                              <h3 className="text-xl font-bold text-slate-800 mb-1">{item.subject.name}</h3>
                              <p className="text-sm text-slate-500">{course ? specialtiesMap[course.specialtyId] : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 group-hover:translate-x-1 transition-transform">
                              Gestionar {item.group ? 'Grupo' : 'Materia'}
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                          </div>
                      </button>
                  ));
              })}
          </div>
      </div>
  );

  const renderAttendanceTable = () => (
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                  <span className="bg-brand-600 text-white rounded-full p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                  {isTeacher ? 'Tomar Asistencia por Materia' : 'Tomar Asistencia'}
                  {activeGroup && <span className="ml-2 text-sm bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200">{activeGroup.name}</span>}
              </h3>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex flex-col">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Fecha (Click para cambiar)</label>
                      <input 
                          type="date" 
                          value={selectedDate} 
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm w-full sm:w-auto font-bold text-slate-700"
                      />
                  </div>
                  <Button onClick={handleSaveAttendance} isLoading={saving} className="whitespace-nowrap mt-4">
                      Guardar Día
                  </Button>
              </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alumno</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estado</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {students.length === 0 ? (
                          <tr><td colSpan={2} className="p-8 text-center text-slate-400 italic">No hay alumnos asignados a este grupo/curso.</td></tr>
                      ) : (
                        students.map(student => {
                            const status = attendanceData[student.id];
                            return (
                                <tr key={student.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-2">
                                        <div className="font-bold text-slate-800 text-sm">{student.lastName}, {student.name}</div>
                                        <div className="text-xs text-slate-400">{student.dni} {student.technicalGroup ? `(G${student.technicalGroup})` : ''}</div>
                                    </td>
                                    <td className="px-6 py-2 flex justify-center gap-2">
                                        {[
                                            { val: 'Presente', label: 'P', color: 'emerald' },
                                            { val: 'Ausente', label: 'A', color: 'rose' },
                                            { val: 'Tarde', label: 'T', color: 'amber' },
                                            { val: 'Justificado', label: 'J', color: 'blue' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                onClick={() => handleStatusChange(student.id, opt.val as AttendanceStatus)}
                                                className={`
                                                    w-8 h-8 rounded-full text-xs font-bold transition-all
                                                    ${status === opt.val 
                                                        ? `bg-${opt.color}-500 text-white shadow-lg scale-110` 
                                                        : `bg-slate-100 text-slate-500 hover:bg-${opt.color}-100 hover:text-${opt.color}-600`
                                                    }
                                                `}
                                                title={opt.val}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </td>
                                </tr>
                            );
                        })
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderHistoryTable = () => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthName = new Date(viewYear, viewMonth - 1).toLocaleString('es-ES', { month: 'long' });

    return (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden animate-fade-in-up mt-8">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                 <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                    <span className="bg-blue-600 text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </span>
                    Historial y Estadísticas
                </h3>
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-2 py-1">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <span className="text-sm font-bold text-slate-800 uppercase w-32 text-center">{monthName} {viewYear}</span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
                </div>
            </div>

            <div className="overflow-x-auto pb-4">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase sticky left-0 bg-slate-50 z-20 shadow-sm border-r border-slate-200 w-64">Alumno</th>
                            <th className="px-2 py-3 text-center text-xs font-bold text-slate-700 uppercase bg-slate-100 w-16 border-r border-slate-200">%</th>
                            {daysArray.map(d => {
                                const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                return (
                                    <th 
                                        key={d} 
                                        onClick={() => handleJumpToDate(d)}
                                        className={`px-1 py-3 text-center text-[10px] font-bold w-8 border-r border-slate-100 cursor-pointer transition-colors group relative ${isSelected ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-200'}`}
                                        title="Click para editar este día"
                                    >
                                        {d}
                                        {/* Hover Tooltip/Icon */}
                                        <span className="hidden group-hover:block absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1 rounded whitespace-nowrap z-30">Editar</span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {students.map(student => {
                            const stats = historyData[student.id] || {};
                            const totalRecorded = Object.keys(stats).length;
                            const present = Object.values(stats).filter(s => s === 'P').length;
                            const lates = Object.values(stats).filter(s => s === 'T').length;
                            const percentage = totalRecorded > 0 
                                ? Math.round(((present + (lates * 0.5)) / totalRecorded) * 100) 
                                : 100;
                            
                            const percColor = percentage >= 80 ? 'text-emerald-600 bg-emerald-50' : percentage >= 60 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';

                            return (
                                <tr key={student.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 border-r border-slate-100 sticky left-0 bg-white z-10 shadow-sm">
                                        <div className="font-bold text-slate-800 text-xs truncate">{student.lastName}, {student.name}</div>
                                    </td>
                                    <td className={`px-2 py-2 text-center text-xs font-bold border-r border-slate-200`}>
                                        <span className={`px-1.5 py-0.5 rounded ${percColor}`}>
                                            {totalRecorded > 0 ? `${percentage}%` : '-'}
                                        </span>
                                    </td>
                                    {daysArray.map(d => {
                                        const status = stats[d];
                                        const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const isSelected = selectedDate === dateStr;
                                        
                                        let colorClass = '';
                                        if (status === 'P') colorClass = 'text-emerald-600 font-bold bg-emerald-50';
                                        else if (status === 'A') colorClass = 'text-rose-500 font-bold bg-rose-50';
                                        else if (status === 'T') colorClass = 'text-amber-500 font-bold bg-amber-50';
                                        else if (status === 'J') colorClass = 'text-blue-500 font-bold bg-blue-50';
                                        else colorClass = 'text-slate-200';

                                        return (
                                            <td key={d} className={`px-1 py-2 text-center text-xs border-r border-slate-50 ${colorClass} ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : ''}`}>
                                                {status || '·'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-slate-50 text-xs text-slate-500 flex gap-4">
                <span><strong>Referencias:</strong></span>
                <span className="text-emerald-600 font-bold">P: Presente</span>
                <span className="text-rose-600 font-bold">A: Ausente</span>
                <span className="text-amber-600 font-bold">T: Tarde (½ falta)</span>
                <span className="text-blue-600 font-bold">J: Justificado</span>
                <span className="ml-auto text-slate-400 italic">* Haga clic en el número del día para modificar la asistencia.</span>
            </div>
        </div>
    );
  };

  const renderGradesTable = () => (
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
             <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                  <span className="bg-emerald-600 text-white rounded-full p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></span>
                  Planilla de Calificaciones
                  {activeGroup && <span className="ml-2 text-sm bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200">{activeGroup.name}</span>}
              </h3>
              <div className="flex items-center gap-4 w-full md:w-auto">
                {!isTeacher && (
                    <div className="w-full md:w-64">
                        <select 
                            value={selectedSubjectId} 
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        >
                            <option value="">-- Seleccionar Materia --</option>
                            {courseSubjects.map(subj => (
                                <option key={subj.id} value={subj.id}>{subj.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <Button onClick={handleSaveGrades} isLoading={savingGrades} className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30">
                    Guardar Notas
                </Button>
              </div>
          </div>

          <div className="overflow-x-auto">
              {loadingGrades ? <div className="p-12 text-center text-slate-400">Cargando notas...</div> : !selectedSubjectId ? (
                  <div className="p-12 text-center text-slate-400 italic">Seleccione una materia para ver las calificaciones.</div>
              ) : (
                  <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider text-center border-b border-slate-200">
                              <th className="px-6 py-3 text-left w-64 border-r border-slate-100 font-bold bg-slate-50 sticky left-0 z-10">Alumno</th>
                              
                              {/* 1° Cuatrimestre */}
                              <th colSpan={3} className="px-2 py-3 border-r border-slate-200 bg-blue-50/50 text-blue-700">1° Cuatrimestre</th>
                              
                              {/* 2° Cuatrimestre */}
                              <th colSpan={4} className="px-2 py-3 border-r border-slate-200 bg-indigo-50/50 text-indigo-700">2° Cuatrimestre</th>
                              
                              {/* Instancia Final */}
                              <th colSpan={3} className="px-2 py-3 bg-emerald-50/50 text-emerald-700">Instancia Final</th>
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
                          {subjectGrades.map((grade) => (
                              <tr key={grade.studentId} className="hover:bg-slate-50 transition-colors text-center text-sm group">
                                  <td className="px-6 py-3 border-r border-slate-100 bg-white sticky left-0 text-left">
                                      <div className="font-bold text-slate-800 text-sm">{grade.studentLastName}, {grade.studentName}</div>
                                      <div className="text-xs text-slate-400">{grade.studentDni}</div>
                                  </td>
                                  
                                  {/* 1° C */}
                                  <td className="p-0 border-r border-slate-100">
                                      <input type="text" value={grade.valParcial1 || ''} onChange={(e) => handleGradeChange(grade.studentId, 'valParcial1', e.target.value)} className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-slate-600 font-medium" />
                                  </td>
                                  <td className="p-0 border-r border-slate-100">
                                      <input type="text" value={grade.calificacion1 || ''} onChange={(e) => handleGradeChange(grade.studentId, 'calificacion1', e.target.value)} className={`w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none font-bold ${Number(grade.calificacion1) >= 7 ? 'text-emerald-600' : Number(grade.calificacion1) < 4 && grade.calificacion1 ? 'text-rose-500' : 'text-slate-700'}`} />
                                  </td>
                                  <td className="p-0 border-r border-slate-200">
                                      <input type="text" value={grade.intensificacion1 || ''} onChange={(e) => handleGradeChange(grade.studentId, 'intensificacion1', e.target.value)} className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-xs text-slate-500" />
                                  </td>
                                  
                                  {/* 2° C */}
                                  <td className="p-0 border-r border-slate-100">
                                      <input type="text" value={grade.valParcial2 || ''} onChange={(e) => handleGradeChange(grade.studentId, 'valParcial2', e.target.value)} className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-slate-600 font-medium" />
                                  </td>
                                  <td className="p-0 border-r border-slate-100">
                                      <input type="text" value={grade.calificacion2 || ''} onChange={(e) => handleGradeChange(grade.studentId, 'calificacion2', e.target.value)} className={`w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none font-bold ${Number(grade.calificacion2) >= 7 ? 'text-emerald-600' : Number(grade.calificacion2) < 4 && grade.calificacion2 ? 'text-rose-500' : 'text-slate-700'}`} />
                                  </td>
                                  <td className="p-0 border-r border-slate-100">
                                      <input type="text" value={grade.intensificacion1_en_2 || ''} onChange={(e) => handleGradeChange(grade.studentId, 'intensificacion1_en_2', e.target.value)} className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-xs text-slate-500" />
                                  </td>
                                  <td className="p-0 border-r border-slate-200">
                                      <input type="text" value={grade.intensificacion2 || ''} onChange={(e) => handleGradeChange(grade.studentId, 'intensificacion2', e.target.value)} className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-xs text-slate-500" />
                                  </td>
                                  
                                  {/* Final */}
                                  <td className="p-0 border-r border-slate-100">
                                      <input type="text" value={grade.intensificacionDic || ''} onChange={(e) => handleGradeChange(grade.studentId, 'intensificacionDic', e.target.value)} className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-xs text-slate-500" />
                                  </td>
                                  <td className="p-0 border-r border-slate-100">
                                      <input type="text" value={grade.intensificacionFeb || ''} onChange={(e) => handleGradeChange(grade.studentId, 'intensificacionFeb', e.target.value)} className="w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-xs text-slate-500" />
                                  </td>
                                  <td className="p-0 text-center bg-slate-50 group-hover:bg-white transition-colors">
                                      <input type="text" value={grade.calificacionFinal || ''} onChange={(e) => handleGradeChange(grade.studentId, 'calificacionFinal', e.target.value)} className={`w-full h-full p-2 text-center bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-200 outline-none font-extrabold ${Number(grade.calificacionFinal) >= 7 ? 'text-emerald-600' : 'text-slate-800'}`} />
                                  </td>
                              </tr>
                          ))}
                          {subjectGrades.length === 0 && !loadingGrades && (
                              <tr>
                                  <td colSpan={11} className="p-8 text-center text-slate-400 italic">No se encontraron registros de alumnos para esta materia.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              )}
          </div>
      </div>
  );

  const renderPreceptorCourseSelection = () => (
      <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Mis Cursos Asignados</h2>
          {myCourses.length === 0 && <div className="text-slate-500 italic p-8 bg-white rounded-xl shadow-soft text-center">No tienes cursos asignados actualmente.</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCourses.map(course => (
                  <button 
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 hover:shadow-lg hover:border-brand-300 transition-all text-left group"
                  >
                      <div className="flex justify-between items-start mb-4">
                          <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">
                              {course.shift}
                          </span>
                          <span className="text-slate-300 group-hover:text-brand-500 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                          </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-1">{course.name}</h3>
                      <p className="text-sm text-slate-500">{specialtiesMap[course.specialtyId] || 'Especialidad'}</p>
                  </button>
              ))}
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex flex-wrap justify-center gap-1">
              {isTeacher && (
                <>
                  <button 
                    onClick={() => { setActiveTab('GRADES'); setSelectedSubjectId(''); setActiveGroup(null); }}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'GRADES' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Gestión Académica
                  </button>
                </>
              )}

              {isPreceptor && (
                <button 
                    onClick={() => setActiveTab('ATTENDANCE')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'ATTENDANCE' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    Gestión de Asistencias
                </button>
              )}

              <button 
                onClick={() => setActiveTab('NOTIFICATIONS')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'NOTIFICATIONS' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Notificaciones de Dirección
                {(receivedNotifications.length > 0) && <span className="ml-1 bg-white text-orange-600 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">{receivedNotifications.length}</span>}
              </button>
          </div>
      </div>

      {activeTab === 'NOTIFICATIONS' && renderNotifications()}
      
      {activeTab === 'ATTENDANCE' && isTeacher && (
          !selectedSubjectId ? (
              renderSubjectGrid((sub, group) => {
                  setSelectedSubjectId(sub.id);
                  setActiveGroup(group || null);
                  if (sub.courseId) setSelectedCourseId(sub.courseId);
              })
          ) : (
              <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setSelectedSubjectId(''); setActiveGroup(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">
                        {mySubjects.find(s => s.id === selectedSubjectId)?.name}
                        {activeGroup && <span className="ml-2 text-base font-normal text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">{activeGroup.name}</span>}
                        <span className="ml-2 text-sm font-normal text-slate-500">Asistencia</span>
                    </h2>
                  </div>
                  {renderAttendanceTable()}
                  {renderHistoryTable()}
              </div>
          )
      )}

      {activeTab === 'GRADES' && isTeacher && (
           !selectedSubjectId ? (
                renderSubjectGrid((sub, group) => {
                    setSelectedSubjectId(sub.id);
                    setActiveGroup(group || null);
                    if (sub.courseId) setSelectedCourseId(sub.courseId);
                })
           ) : (
               <div className="space-y-4">
                   <div className="flex items-center gap-4">
                        <button onClick={() => { setSelectedSubjectId(''); setActiveGroup(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">
                            {mySubjects.find(s => s.id === selectedSubjectId)?.name}
                            {activeGroup && <span className="ml-2 text-base font-normal text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">{activeGroup.name}</span>}
                            <span className="ml-2 text-sm font-normal text-slate-500">Notas</span>
                        </h2>
                   </div>
                   {renderGradesTable()}
               </div>
           )
      )}

      {activeTab === 'ATTENDANCE' && isPreceptor && (
           !selectedCourseId ? renderPreceptorCourseSelection() : (
               <div className="animate-fade-in-up space-y-8">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setSelectedCourseId('')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{courses.find(c => c.id === selectedCourseId)?.name}</h2>
                            <p className="text-sm text-slate-500">{specialtiesMap[courses.find(c => c.id === selectedCourseId)?.specialtyId || '']}</p>
                        </div>
                    </div>
                    {renderAttendanceTable()}
                    {renderHistoryTable()}
                    {renderGradesTable()}
               </div>
           )
      )}

      {isMsgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMsgModalOpen(false)}></div>
              <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                  <div className="bg-brand-600 px-6 py-4 flex justify-between items-center text-white">
                      <h3 className="text-lg font-bold">Redactar Mensaje</h3>
                      <button onClick={() => setIsMsgModalOpen(false)} className="hover:bg-brand-700 rounded-full p-1 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                  </div>
                  <form onSubmit={handleSendMessage} className="p-6 space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Curso Destino</label>
                          <select 
                            value={msgForm.courseId} 
                            onChange={(e) => setMsgForm({...msgForm, courseId: e.target.value})}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                          >
                              <option value="">Seleccione un curso...</option>
                              {courses.map(c => (
                                  <option key={c.id} value={c.id}>{c.name} - {specialtiesMap[c.specialtyId]}</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Título</label>
                          <input 
                            type="text" 
                            value={msgForm.title} 
                            onChange={(e) => setMsgForm({...msgForm, title: e.target.value})}
                            required
                            placeholder="Asunto del mensaje"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Mensaje</label>
                          <textarea 
                            rows={4} 
                            value={msgForm.message} 
                            onChange={(e) => setMsgForm({...msgForm, message: e.target.value})}
                            required
                            placeholder="Escriba su mensaje para los alumnos..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Prioridad</label>
                          <select 
                            value={msgForm.priority} 
                            onChange={(e) => setMsgForm({...msgForm, priority: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                          >
                              <option value="Normal">Normal</option>
                              <option value="Alta">Alta</option>
                          </select>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                          <Button type="button" variant="ghost" onClick={() => setIsMsgModalOpen(false)}>Cancelar</Button>
                          <Button type="submit" isLoading={saving}>Enviar Mensaje</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default AttendancePanel;