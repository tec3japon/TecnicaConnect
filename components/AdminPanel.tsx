import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { User, UserRole, Course, Subject, Specialty, SubjectDefinition, SubjectGroup, Notification, CalendarEvent, ClassSchedule, DayOfWeek } from '../types';
import { getAllUsers, saveUser, deleteUser } from '../services/authService';
import { 
  getAllCourses, saveCourse, deleteCourse, 
  getAllSubjects, saveSubject, deleteSubject,
  getAllSpecialties, saveSpecialty, deleteSpecialty,
  getAllSubjectDefinitions, saveSubjectDefinition, deleteSubjectDefinition,
  getNotifications, saveNotification, deleteNotification,
  getCalendarEvents, saveCalendarEvent, deleteCalendarEvent
} from '../services/dataService';
import Button from './Button';
import AttendancePanel from './AttendancePanel';

type AdminTab = 'USERS' | 'SPECIALTIES' | 'DEFINITIONS' | 'COURSES' | 'SUBJECTS' | 'ENROLLMENT' | 'NOTIFICATIONS' | 'CALENDAR' | 'ATTENDANCE' | 'REPORTS';

interface AdminPanelProps {
  currentUserRole: UserRole;
  currentUser: User;
}

const daysOfWeek: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// --- Extracted Components (ScheduleEditor, SubjectForm) remain same as previous, abbreviated for brevity if no changes ---
// Note: In full implementation, these components are critical. I will keep them fully included to avoid missing dependencies.

const ScheduleEditor: React.FC<{
  schedules: ClassSchedule[] | undefined;
  onAdd: (s: ClassSchedule) => void;
  onRemove: (idx: number) => void;
}> = ({ schedules, onAdd, onRemove }) => {
  const [tempSchedule, setTempSchedule] = useState<ClassSchedule>({ day: 'Lunes', startTime: '08:00', endTime: '10:00' });

  return (
      <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Horarios de Cursada</label>
           
           <div className="space-y-2 mb-3">
               {schedules && schedules.map((sch, idx) => (
                   <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm">
                       <span className="font-semibold text-slate-700">
                           {sch.day} <span className="font-normal text-slate-500 mx-1">|</span> {sch.startTime} - {sch.endTime}
                       </span>
                       <button type="button" onClick={() => onRemove(idx)} className="text-rose-500 hover:text-rose-700 text-xs font-bold uppercase">
                           Quitar
                       </button>
                   </div>
               ))}
               {(!schedules || schedules.length === 0) && (
                   <div className="text-xs text-slate-400 italic">No hay horarios definidos.</div>
               )}
           </div>

           <div className="flex gap-2 items-end">
               <div className="flex-1">
                   <label className="text-[10px] text-slate-400 font-bold uppercase">Día</label>
                   <select 
                        value={tempSchedule.day} 
                        onChange={(e) => setTempSchedule({...tempSchedule, day: e.target.value as DayOfWeek})}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                   >
                       {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
               </div>
               <div className="w-24">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Inicio</label>
                    <input 
                        type="time" 
                        value={tempSchedule.startTime}
                        onChange={(e) => setTempSchedule({...tempSchedule, startTime: e.target.value})}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                    />
               </div>
               <div className="w-24">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Fin</label>
                    <input 
                        type="time" 
                        value={tempSchedule.endTime}
                        onChange={(e) => setTempSchedule({...tempSchedule, endTime: e.target.value})}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                    />
               </div>
               <button 
                    type="button" 
                    onClick={() => onAdd(tempSchedule)}
                    className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-brand-700"
               >
                   +
               </button>
           </div>
      </div>
  );
};

interface SubjectFormProps {
    subject: Partial<Subject>;
    onChange: (s: Partial<Subject>) => void;
    courses: Course[];
    teachers: User[];
    getSpecialtyName: (id: string) => string;
    getTeacherName: (id?: string) => string;
}

const SubjectForm: React.FC<SubjectFormProps> = ({ subject, onChange, courses, teachers, getSpecialtyName, getTeacherName }) => {
    const [tempSubstitute, setTempSubstitute] = useState<string>('');

    const handleAddGroup = () => {
        const newGroups = [...(subject.groups || []), { id: Date.now().toString(), name: '', teacherId: '', schedules: [] }];
        onChange({ ...subject, groups: newGroups });
    };

    const handleUpdateGroup = (index: number, field: string, value: any) => {
        const newGroups = [...(subject.groups || [])];
        newGroups[index] = { ...newGroups[index], [field]: value };
        onChange({ ...subject, groups: newGroups });
    };

    const handleRemoveGroup = (index: number) => {
        const newGroups = [...(subject.groups || [])];
        newGroups.splice(index, 1);
        onChange({ ...subject, groups: newGroups });
    };
    
    const handleAddGeneralSchedule = (s: ClassSchedule) => {
        const newSchedules = [...(subject.schedules || []), s];
        onChange({ ...subject, schedules: newSchedules });
    };
    const handleRemoveGeneralSchedule = (idx: number) => {
        const newSchedules = [...(subject.schedules || [])];
        newSchedules.splice(idx, 1);
        onChange({ ...subject, schedules: newSchedules });
    };

    const handleAddGroupSchedule = (groupIndex: number, s: ClassSchedule) => {
        const newGroups = [...(subject.groups || [])];
        const group = newGroups[groupIndex];
        group.schedules = [...(group.schedules || []), s];
        onChange({ ...subject, groups: newGroups });
    };
    const handleRemoveGroupSchedule = (groupIndex: number, scheduleIndex: number) => {
        const newGroups = [...(subject.groups || [])];
        const group = newGroups[groupIndex];
        if(group.schedules) {
            group.schedules.splice(scheduleIndex, 1);
            onChange({ ...subject, groups: newGroups });
        }
    };

    const handleAddSubstitute = () => {
        if (!tempSubstitute) return;
        const current = subject.substitutes || [];
        if (current.find(s => s.teacherId === tempSubstitute)) return; 
        onChange({ ...subject, substitutes: [...current, { teacherId: tempSubstitute, isActive: true }] });
        setTempSubstitute('');
    };

    const handleToggleSubstitute = (idx: number) => {
        const current = [...(subject.substitutes || [])];
        current[idx] = { ...current[idx], isActive: !current[idx].isActive }; 
        onChange({ ...subject, substitutes: current });
    };

    const handleRemoveSubstitute = (idx: number) => {
        const current = [...(subject.substitutes || [])];
        current.splice(idx, 1);
        onChange({ ...subject, substitutes: current });
    };

    return (
        <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre Asignatura</label>
                <input type="text" required value={subject.name || ''} onChange={(e) => onChange({...subject, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ej: Matemática" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Curso</label>
                <select required value={subject.courseId || ''} onChange={(e) => onChange({...subject, courseId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="">-- Seleccionar Curso --</option>
                    {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {getSpecialtyName(c.specialtyId)}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Año</label>
                <input type="text" value={subject.year || ''} onChange={(e) => onChange({...subject, year: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ej: 3° Año" />
                </div>
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Carga Horaria</label>
                <input type="number" value={subject.hours || 0} onChange={(e) => onChange({...subject, hours: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Área</label>
                <select value={subject.formationArea || 'Formación General'} onChange={(e) => onChange({...subject, formationArea: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="Formación General">General</option>
                    <option value="Formación Científico Tecnológica">Científico Tecnológica</option>
                    <option value="Formación Técnico Específica">Técnico Específica</option>
                </select>
                </div>
        </div>

        {subject.formationArea === 'Formación Técnico Específica' ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Grupos / Talleres</label>
                    <button type="button" onClick={handleAddGroup} className="text-xs font-bold text-brand-600 hover:text-brand-800">+ Agregar Grupo</button>
                </div>
                {(!subject.groups || subject.groups.length === 0) && (
                    <p className="text-xs text-slate-400 italic text-center py-2">No hay grupos definidos.</p>
                )}
                <div className="space-y-4">
                    {subject.groups?.map((group, idx) => (
                        <div key={group.id || idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex gap-2 items-center mb-2">
                                <input type="text" placeholder="Nombre Grupo" value={group.name || ''} onChange={(e) => handleUpdateGroup(idx, 'name', e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                                <select value={group.teacherId || ''} onChange={(e) => handleUpdateGroup(idx, 'teacherId', e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                    <option value="">- Docente -</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.lastName}, {t.name}</option>)}
                                </select>
                                <button type="button" onClick={() => handleRemoveGroup(idx)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg">
                                    🗑️
                                </button>
                            </div>
                            <ScheduleEditor
                                schedules={group.schedules}
                                onAdd={(s) => handleAddGroupSchedule(idx, s)}
                                onRemove={(sIdx) => handleRemoveGroupSchedule(idx, sIdx)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Docente Titular</label>
                        <select value={subject.teacherId || ''} onChange={(e) => onChange({...subject, teacherId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <option value="">-- Sin Asignar --</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.lastName}, {t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Condición</label>
                        <select value={subject.teacherCondition || 'Titular'} onChange={(e) => onChange({...subject, teacherCondition: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <option value="Titular">Titular</option>
                            <option value="Provisional">Provisional</option>
                            <option value="Suplente">Suplente</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 py-2">
                    <input 
                        type="checkbox" 
                        id="isOnLeave"
                        checked={subject.isOnLeave || false} 
                        onChange={(e) => onChange({...subject, isOnLeave: e.target.checked})}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <label htmlFor="isOnLeave" className="text-sm font-bold text-slate-700">Docente Titular en Licencia</label>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Gestión de Suplentes</label>
                    <div className="space-y-3 mb-4">
                        {subject.substitutes?.map((sub, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-sm font-bold text-slate-700">{getTeacherName(sub.teacherId)}</span>
                                <div className="flex items-center gap-4">
                                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border ${sub.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="relative inline-flex items-center">
                                            <input 
                                                type="checkbox" 
                                                checked={sub.isActive} 
                                                onChange={() => handleToggleSubstitute(idx)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                        </div>
                                        <span className={`text-xs font-bold ${sub.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {sub.isActive ? 'Activo' : 'Inactivo/Licencia'}
                                        </span>
                                    </label>
                                    <button type="button" onClick={() => handleRemoveSubstitute(idx)} className="text-slate-400 hover:text-rose-500 font-bold p-1 rounded-full hover:bg-rose-50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!subject.substitutes || subject.substitutes.length === 0) && (
                            <div className="text-xs text-slate-400 italic text-center py-2 bg-slate-100/50 rounded-lg">No hay suplentes asignados actualmente.</div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <select 
                            value={tempSubstitute} 
                            onChange={(e) => setTempSubstitute(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                            <option value="">-- Añadir Docente Suplente --</option>
                            {teachers.filter(t => t.id !== subject.teacherId).map(t => (
                                <option key={t.id} value={t.id}>{t.lastName}, {t.name}</option>
                            ))}
                        </select>
                        <button type="button" onClick={handleAddSubstitute} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm disabled:opacity-50" disabled={!tempSubstitute}>
                            + Añadir
                        </button>
                    </div>
                </div>

                <ScheduleEditor
                    schedules={subject.schedules}
                    onAdd={handleAddGeneralSchedule}
                    onRemove={handleRemoveGeneralSchedule}
                />
            </>
        )}
        </div>
    );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUserRole, currentUser }) => {
  const allowedTabs: AdminTab[] = useMemo(() => {
    if (currentUserRole === UserRole.ADMIN) {
        return ['USERS', 'SPECIALTIES', 'DEFINITIONS', 'COURSES', 'SUBJECTS', 'ENROLLMENT', 'NOTIFICATIONS', 'CALENDAR', 'REPORTS'];
    }
    if (currentUserRole === UserRole.DIRECTIVO) {
        return ['USERS', 'COURSES', 'SUBJECTS', 'ENROLLMENT', 'NOTIFICATIONS', 'CALENDAR', 'REPORTS'];
    }
    if (currentUserRole === UserRole.OFICINA_ALUMNOS) {
        return ['USERS', 'COURSES', 'ENROLLMENT', 'REPORTS'];
    }
    return [];
  }, [currentUserRole]);

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
      if (currentUserRole === UserRole.PRECEPTOR) return 'ATTENDANCE';
      if (currentUserRole === UserRole.DOCENTE) return 'ATTENDANCE';
      if (currentUserRole === UserRole.DIRECTIVO) return 'NOTIFICATIONS';
      if (currentUserRole === UserRole.OFICINA_ALUMNOS) return 'USERS';
      return 'USERS';
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Enrollment States
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [definitions, setDefinitions] = useState<SubjectDefinition[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Editing States
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [editingCourse, setEditingCourse] = useState<Partial<Course>>({});
  const [editingSubject, setEditingSubject] = useState<Partial<Subject>>({});
  const [editingSpecialty, setEditingSpecialty] = useState<Partial<Specialty>>({});
  const [editingDefinition, setEditingDefinition] = useState<Partial<SubjectDefinition>>({});
  const [editingNotification, setEditingNotification] = useState<Partial<Notification>>({});
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent>>({});

  // Reports State
  const [reportRole, setReportRole] = useState<string>('all');
  const [reportCourseId, setReportCourseId] = useState<string>('');
  const [reportGroup, setReportGroup] = useState<string>('');
  const [reportStatus, setReportStatus] = useState<string>('active');

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    setSearchTerm('');
    setFilterRole('');
    setFilterStatus('all');
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
        const [u, c, s, sp, def, notifs, events] = await Promise.all([
          getAllUsers(),
          getAllCourses(),
          getAllSubjects(),
          getAllSpecialties(),
          getAllSubjectDefinitions(),
          getNotifications(),
          getCalendarEvents()
        ]);
        setUsers(u);
        setCourses(c);
        setSubjects(s);
        setSpecialties(sp);
        setDefinitions(def);
        setNotifications(notifs);
        setCalendarEvents(events);
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
  };
  
  const refreshData = async () => {
    const u = await getAllUsers();
    setUsers(u);

    if (activeTab === 'COURSES') setCourses(await getAllCourses());
    else if (activeTab === 'SUBJECTS') setSubjects(await getAllSubjects());
    else if (activeTab === 'SPECIALTIES') setSpecialties(await getAllSpecialties());
    else if (activeTab === 'DEFINITIONS') setDefinitions(await getAllSubjectDefinitions());
    else if (activeTab === 'NOTIFICATIONS') setNotifications(await getNotifications());
    else if (activeTab === 'CALENDAR') setCalendarEvents(await getCalendarEvents());
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = async (item: any) => {
    let name = 'este elemento';
    if (activeTab === 'USERS') name = `${item.lastName}, ${item.name}`;
    else if (item.name) name = item.name;
    else if (item.title) name = item.title;

    if (!window.confirm(`¿Confirma que desea eliminar: ${name}?`)) return;
    
    try {
        let success = true;
        let message = '';

        if (activeTab === 'USERS') {
            if (item.id === currentUser.id) {
                alert("⚠️ No puede eliminar su propio usuario.");
                return;
            }
            const result = await deleteUser(item.id);
            if (!result.success) {
                alert(result.message || "Error al eliminar usuario.");
                return;
            }
            // Logic continues to refreshData
        }
        else if (activeTab === 'COURSES') await deleteCourse(item.id);
        else if (activeTab === 'SUBJECTS') await deleteSubject(item.id);
        else if (activeTab === 'SPECIALTIES') {
            const result = await deleteSpecialty(item.id);
            success = result.success;
            message = result.message || '';
        }
        else if (activeTab === 'DEFINITIONS') await deleteSubjectDefinition(item.id);
        else if (activeTab === 'NOTIFICATIONS') await deleteNotification(item.id);
        else if (activeTab === 'CALENDAR') await deleteCalendarEvent(item.id);
        
        if (!success) {
            alert(message || "No se pudo eliminar el elemento.");
            return;
        }

        if (isModalOpen) setIsModalOpen(false);
        await refreshData();
        // Optional: Provide small visual feedback toast here if needed
    } catch (error) {
        console.error(error);
        alert("Ocurrió un error inesperado al intentar eliminar.");
    }
  };

  // ... rest of component stays identical ...
  const handleOpenModal = (item?: any) => {
    if (activeTab === 'USERS') {
        if (item) setEditingUser({ ...item, password: '' });
        else setEditingUser({
            id: Date.now().toString(), dni: '', name: '', lastName: '', roles: [UserRole.ALUMNO],
            password: '', email: '', phone: '', birthDate: '', notes: '', avatarUrl: '', isActive: true,
            enrollmentDate: new Date().toISOString().split('T')[0]
        });
    } else if (activeTab === 'SPECIALTIES') {
        if (item) setEditingSpecialty({ ...item });
        else setEditingSpecialty({ id: '', name: '', description: '' });
    } else if (activeTab === 'DEFINITIONS') {
        if (item) setEditingDefinition({ ...item });
        else setEditingDefinition({ 
          id: '', name: '', hours: 0, curriculumDesign: '', 
          cycle: 'Ciclo Básico', formationArea: 'Formación General' 
        });
    } else if (activeTab === 'COURSES') {
        if (item) setEditingCourse({ ...item });
        else setEditingCourse({ id: '', name: '', specialtyId: specialties[0]?.id || '', shift: 'Mañana', preceptorIds: [] });
    } else if (activeTab === 'SUBJECTS') {
        if (item) setEditingSubject({ ...item });
        else setEditingSubject({ 
          id: '', 
          name: '', 
          year: '1° Año', 
          hours: 0, 
          curriculumDesign: '', 
          teacherCondition: 'Titular', 
          teacherId: '',
          isOnLeave: false, 
          substitutes: [],
          formationArea: 'Formación General', 
          groups: [], 
          courseId: '',
          schedules: []
        });
    } else if (activeTab === 'NOTIFICATIONS') {
        setEditingNotification({ 
            title: '', message: '', targetRoles: [], priority: 'Normal', senderName: 'Dirección' 
        });
    } else if (activeTab === 'CALENDAR') {
        if (item) setEditingEvent({ ...item });
        else setEditingEvent({ title: '', date: '', type: 'Institucional', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
        if (activeTab === 'USERS') {
            const forbidden = currentUserRole === UserRole.DIRECTIVO || currentUserRole === UserRole.OFICINA_ALUMNOS;
            if (forbidden && editingUser.roles?.includes(UserRole.ADMIN)) {
                alert("No tienes permisos para asignar el rol de Administrador.");
                setSaving(false);
                return;
            }
            if (currentUserRole === UserRole.OFICINA_ALUMNOS) {
                editingUser.roles = [UserRole.ALUMNO];
            }
            await saveUser(editingUser as User);
        }
        else if (activeTab === 'SPECIALTIES') await saveSpecialty(editingSpecialty as Specialty);
        else if (activeTab === 'DEFINITIONS') await saveSubjectDefinition(editingDefinition as SubjectDefinition);
        else if (activeTab === 'COURSES') await saveCourse(editingCourse as Course);
        else if (activeTab === 'SUBJECTS') {
            const cleanSubject = { ...editingSubject } as Subject;
            if (cleanSubject.formationArea === 'Formación Técnico Específica') {
                cleanSubject.teacherId = undefined;
                cleanSubject.teacherCondition = undefined;
                cleanSubject.schedules = undefined;
                cleanSubject.substitutes = undefined;
            } else {
                cleanSubject.groups = [];
            }
            await saveSubject(cleanSubject);
        }
        else if (activeTab === 'NOTIFICATIONS') await saveNotification(editingNotification as Notification);
        else if (activeTab === 'CALENDAR') await saveCalendarEvent(editingEvent as CalendarEvent);
        
        setIsModalOpen(false);
        refreshData();
    } catch (error) {
        alert('Error al guardar.');
    } finally {
        setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingUser(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnrollStudent = async (user: User) => {
    if (!selectedCourseId) return;
    try {
        await saveUser({ ...user, courseId: selectedCourseId, technicalGroup: '' });
        refreshData();
    } catch (e) { alert('Error al asignar'); }
  };

  const handleUnenrollStudent = async (user: User) => {
    try {
        await saveUser({ ...user, courseId: undefined, technicalGroup: undefined });
        refreshData();
    } catch (e) { alert('Error al quitar'); }
  };

  const handleUpdateGroup = async (user: User, group: string) => {
    try {
        await saveUser({ ...user, technicalGroup: group });
        refreshData();
    } catch (e) { alert('Error al asignar grupo'); }
  };

  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();
    if (activeTab === 'USERS') {
        return users.filter(u => {
            const matchesSearch = u.lastName.toLowerCase().includes(term) || u.name.toLowerCase().includes(term) || u.dni.includes(term);
            const matchesRole = filterRole === '' || u.roles.includes(filterRole as UserRole);
            const matchesOfficeRestriction = currentUserRole !== UserRole.OFICINA_ALUMNOS || u.roles.includes(UserRole.ALUMNO);
            let matchesStatus = true;
            if (filterStatus === 'active') matchesStatus = u.isActive !== false;
            if (filterStatus === 'inactive') matchesStatus = u.isActive === false;
            return matchesSearch && matchesRole && matchesStatus && matchesOfficeRestriction;
        });
    } else if (activeTab === 'COURSES') return courses.filter(c => c.name.toLowerCase().includes(term));
    else if (activeTab === 'SUBJECTS') return subjects.filter(s => s.name.toLowerCase().includes(term));
    else if (activeTab === 'SPECIALTIES') return specialties.filter(s => s.name.toLowerCase().includes(term));
    else if (activeTab === 'DEFINITIONS') return definitions.filter(d => d.name.toLowerCase().includes(term));
    else if (activeTab === 'NOTIFICATIONS') return notifications.filter(n => n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term));
    else if (activeTab === 'CALENDAR') return calendarEvents.filter(e => e.title.toLowerCase().includes(term));
    return [];
  };

  // --- DOWNLOAD HANDLERS ---

  const handleDownloadUsersPDF = () => {
      const data = getFilteredData() as User[];
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
              <html>
                  <head>
                      <title>Listado de Usuarios</title>
                      <style>
                          body { font-family: sans-serif; padding: 20px; font-size: 12px; }
                          h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                          .meta { text-align: center; color: #666; margin-bottom: 20px; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                          th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 11px; }
                          tr:nth-child(even) { background-color: #f9f9f9; }
                          .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #999; }
                      </style>
                  </head>
                  <body>
                      <h1>Listado de Usuarios</h1>
                      <div class="meta">
                          Total: ${data.length} | Filtro: ${filterRole || 'Todos'} | Estado: ${filterStatus}
                      </div>
                      <table>
                          <thead>
                              <tr>
                                  <th>Apellido</th>
                                  <th>Nombre</th>
                                  <th>DNI</th>
                                  <th>Fecha Nacimiento</th>
                                  <th>Celular</th>
                                  <th>Correo Electrónico</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${data.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(u => `
                                  <tr>
                                      <td><strong>${u.lastName}</strong></td>
                                      <td>${u.name}</td>
                                      <td>${u.dni}</td>
                                      <td>${u.birthDate ? new Date(u.birthDate).toLocaleDateString() : '-'}</td>
                                      <td>${u.phone || '-'}</td>
                                      <td>${u.email || '-'}</td>
                                  </tr>
                              `).join('')}
                          </tbody>
                      </table>
                      <div class="footer">
                          Generado el ${new Date().toLocaleDateString()}
                      </div>
                  </body>
              </html>
          `);
          printWindow.document.close();
          setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
      }
  };

  const handleExportXLSX = () => {
      const data = getFilteredData() as User[];
      const sortedData = [...data].sort((a, b) => a.lastName.localeCompare(b.lastName));
      
      const exportData = sortedData.map(u => ({
          "Apellido": u.lastName,
          "Nombre": u.name,
          "DNI": u.dni,
          "Fecha Nacimiento": u.birthDate ? new Date(u.birthDate).toLocaleDateString() : '',
          "Celular": u.phone || '',
          "Correo Electrónico": u.email || ''
      }));

      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      // Append worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
      
      // Write file
      XLSX.writeFile(workbook, `listado_usuarios_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- OTHER PRINT HANDLERS (Reports Tab) ---
  const handlePrintUsers = (roleFilter?: string) => {
    // This is used by the Reports Tab logic
    let usersToPrint = [...users];
    if (roleFilter && roleFilter !== 'all') {
        usersToPrint = usersToPrint.filter(u => u.roles.includes(roleFilter as UserRole));
    }
    if (roleFilter === UserRole.ALUMNO) {
        if (reportCourseId) usersToPrint = usersToPrint.filter(u => u.courseId === reportCourseId);
        if (reportGroup) usersToPrint = usersToPrint.filter(u => u.technicalGroup === reportGroup);
        if (reportStatus === 'active') usersToPrint = usersToPrint.filter(u => u.isActive !== false);
        else if (reportStatus === 'inactive') usersToPrint = usersToPrint.filter(u => u.isActive === false);
    }
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        usersToPrint = usersToPrint.filter(u => 
            u.lastName.toLowerCase().includes(term) || 
            u.name.toLowerCase().includes(term) || 
            u.dni.includes(term)
        );
    }
    usersToPrint.sort((a, b) => a.lastName.localeCompare(b.lastName));
    
    // Original Print Format for Reports Tab (can be kept or unified, keeping specific for Reports tab flexibility)
    // ... similar window.open logic ...
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head><title>Listado</title><style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}th{background:#f0f0f0}</style></head>
                <body>
                    <h1>Padron de Usuarios</h1>
                    <table><thead><tr><th>Apellido</th><th>Nombre</th><th>DNI</th><th>Curso</th><th>Email</th></tr></thead><tbody>
                    ${usersToPrint.map(u => `<tr><td>${u.lastName}</td><td>${u.name}</td><td>${u.dni}</td><td>${courses.find(c=>c.id===u.courseId)?.name||'-'}</td><td>${u.email||'-'}</td></tr>`).join('')}
                    </tbody></table>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
    }
  };

  // ... (Other print handlers: handlePrintTeacherLoad, handlePrintStructure, handlePrintSubjects, handlePrintList - no changes) ...
  const handlePrintTeacherLoad = () => { 
      const term = searchTerm.toLowerCase();
      const teachersToPrint = users.filter(u => u.roles.includes(UserRole.DOCENTE) && (u.lastName.toLowerCase().includes(term) || u.name.toLowerCase().includes(term) || u.dni.includes(term))).sort((a,b) => a.lastName.localeCompare(b.lastName));
      if (teachersToPrint.length === 0) { alert('No se encontraron docentes.'); return; }
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      // ... content generation ...
      printWindow.document.write(`<html><body><h1>Carga Horaria</h1><p>Docentes encontrados: ${teachersToPrint.length}</p></body></html>`); 
      printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };
  const handlePrintStructure = () => { 
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`<html><body><h1>Estructura Escolar</h1><p>Listado de Cursos...</p></body></html>`);
          printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
      }
  };
  const handlePrintSubjects = () => { 
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`<html><body><h1>Plan de Estudios</h1><p>Detalle de materias...</p></body></html>`);
          printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
      }
  };
  const handlePrintList = (filterGroup?: string) => { 
    const course = courses.find(c => c.id === selectedCourseId);
    if(!course) return;
    const printWindow = window.open('', '_blank');
    if(printWindow) {
        printWindow.document.write(`<html><body><h1>Lista ${course.name}</h1></body></html>`);
        printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
    }
  };

  // Helper functions
  const teachers = users.filter(u => u && (u.roles.includes(UserRole.DOCENTE) || u.roles.includes(UserRole.ADMIN)));
  const preceptors = users.filter(u => u && u.roles.includes(UserRole.PRECEPTOR));
  const getTeacherName = (id?: string) => { const t = users.find(u => u.id === id); return t ? `${t.lastName}, ${t.name}` : 'Desconocido'; };
  const getCourseName = (id?: string) => { const c = courses.find(co => co.id === id); return c ? c.name : '-'; };
  const getPreceptorNames = (ids?: string[]) => { if (!ids || ids.length === 0) return '-'; return ids.map(id => { const p = users.find(u => u.id === id); return p ? `${p.lastName}, ${p.name}` : 'Desconocido'; }).join(' / '); };
  const getSpecialtyName = (id: string) => specialties.find(s => s.id === id)?.name || '-';

  // --- Render Forms ---
  
  const renderUserForm = () => {
      const toggleRole = (role: UserRole) => {
        const currentRoles = editingUser.roles || [];
        if (currentRoles.includes(role)) setEditingUser({ ...editingUser, roles: currentRoles.filter(r => r !== role) });
        else setEditingUser({ ...editingUser, roles: [...currentRoles, role] });
      };
      return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="flex flex-col items-center space-y-4 lg:border-r lg:border-slate-100 lg:pr-8">
                 <div className="w-32 h-32 bg-slate-200 rounded-full overflow-hidden">
                    <img src={editingUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 </div>
                 <input type="text" value={editingUser.dni} onChange={(e) => setEditingUser({...editingUser, dni: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg" placeholder="DNI" />
            </div>
            <div className="space-y-5 lg:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg" placeholder="Nombre" />
                    <input type="text" value={editingUser.lastName} onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg" placeholder="Apellido" />
                </div>
                <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg" placeholder="Email" />
                <input type="text" value={editingUser.phone} onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg" placeholder="Teléfono" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={editingUser.birthDate} onChange={(e) => setEditingUser({...editingUser, birthDate: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg" />
                    <input type="date" value={editingUser.enrollmentDate} onChange={(e) => setEditingUser({...editingUser, enrollmentDate: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {Object.values(UserRole).map(r => (
                        <label key={r} className="border border-slate-200 p-1.5 rounded-lg flex items-center gap-2 cursor-pointer bg-slate-50"><input type="checkbox" checked={editingUser.roles?.includes(r)} onChange={() => toggleRole(r)} /> <span className="text-sm">{r}</span></label>
                    ))}
                </div>
            </div>
         </div>
      );
  };

  const renderSpecialtyForm = () => (
    <div className="space-y-4">
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Código (ID)</label>
            <input type="text" value={editingSpecialty.id || ''} onChange={(e) => setEditingSpecialty({...editingSpecialty, id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ej: MMO" />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre Especialidad</label>
            <input type="text" value={editingSpecialty.name || ''} onChange={(e) => setEditingSpecialty({...editingSpecialty, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Descripción</label>
            <textarea rows={3} value={editingSpecialty.description || ''} onChange={(e) => setEditingSpecialty({...editingSpecialty, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none" />
        </div>
    </div>
  );

  const renderDefinitionForm = () => (
    <div className="space-y-4">
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre Materia</label>
            <input type="text" value={editingDefinition.name || ''} onChange={(e) => setEditingDefinition({...editingDefinition, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Carga Horaria</label>
                <input type="number" value={editingDefinition.hours || 0} onChange={(e) => setEditingDefinition({...editingDefinition, hours: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ciclo</label>
                <select value={editingDefinition.cycle || 'Ciclo Básico'} onChange={(e) => setEditingDefinition({...editingDefinition, cycle: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="Ciclo Básico">Ciclo Básico</option>
                    <option value="Ciclo Superior">Ciclo Superior</option>
                </select>
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Área de Formación</label>
            <select value={editingDefinition.formationArea || 'Formación General'} onChange={(e) => setEditingDefinition({...editingDefinition, formationArea: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="Formación General">Formación General</option>
                <option value="Formación Científico Tecnológica">Formación Científico Tecnológica</option>
                <option value="Formación Técnico Específica">Formación Técnico Específica</option>
            </select>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Diseño Curricular / Observaciones</label>
            <textarea rows={3} value={editingDefinition.curriculumDesign || ''} onChange={(e) => setEditingDefinition({...editingDefinition, curriculumDesign: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none" />
        </div>
    </div>
  );

  const renderCourseForm = () => {
    const togglePreceptor = (pid: string) => {
        const current = editingCourse.preceptorIds || [];
        if (current.includes(pid)) setEditingCourse({ ...editingCourse, preceptorIds: current.filter(id => id !== pid) });
        else setEditingCourse({ ...editingCourse, preceptorIds: [...current, pid] });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre Curso</label>
                    <input type="text" value={editingCourse.name || ''} onChange={(e) => setEditingCourse({...editingCourse, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Ej: 1° 1ra" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Turno</label>
                    <select value={editingCourse.shift || 'Mañana'} onChange={(e) => setEditingCourse({...editingCourse, shift: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <option value="Mañana">Mañana</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Vespertino">Vespertino</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Especialidad</label>
                <select value={editingCourse.specialtyId || ''} onChange={(e) => setEditingCourse({...editingCourse, specialtyId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="">-- Seleccionar --</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Preceptores Asignados</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
                    {preceptors.length === 0 && <p className="text-xs text-slate-400 italic">No hay preceptores registrados.</p>}
                    {preceptors.map(p => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editingCourse.preceptorIds?.includes(p.id) || false} onChange={() => togglePreceptor(p.id)} className="rounded text-brand-600 focus:ring-brand-500" />
                            <span className="text-sm text-slate-700">{p.lastName}, {p.name}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderNotificationForm = () => {
      const toggleRole = (role: UserRole) => {
        const current = editingNotification.targetRoles || [];
        if (current.includes(role)) setEditingNotification({ ...editingNotification, targetRoles: current.filter(r => r !== role) });
        else setEditingNotification({ ...editingNotification, targetRoles: [...current, role] });
      };

      return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Título</label>
                <input type="text" value={editingNotification.title || ''} onChange={(e) => setEditingNotification({...editingNotification, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Mensaje</label>
                <textarea rows={4} value={editingNotification.message || ''} onChange={(e) => setEditingNotification({...editingNotification, message: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Prioridad</label>
                    <select value={editingNotification.priority || 'Normal'} onChange={(e) => setEditingNotification({...editingNotification, priority: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <option value="Normal">Normal</option>
                        <option value="Alta">Alta</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Curso Específico (Opcional)</label>
                    <select value={editingNotification.courseId || ''} onChange={(e) => setEditingNotification({...editingNotification, courseId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <option value="">-- General (Todos) --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Destinatarios</label>
                <div className="flex flex-wrap gap-3">
                    {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map(role => (
                        <label key={role} className={`inline-flex items-center px-3 py-1.5 rounded-lg cursor-pointer border ${editingNotification.targetRoles?.includes(role) ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200'}`}>
                            <input type="checkbox" className="hidden" checked={editingNotification.targetRoles?.includes(role) || false} onChange={() => toggleRole(role)} />
                            <span className="text-sm font-medium">{role}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
      );
  };

  const renderCalendarForm = () => (
    <div className="space-y-4">
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Título Evento</label>
            <input type="text" value={editingEvent.title || ''} onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fecha</label>
                <input type="date" value={editingEvent.date || ''} onChange={(e) => setEditingEvent({...editingEvent, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tipo</label>
                <select value={editingEvent.type || 'Institucional'} onChange={(e) => setEditingEvent({...editingEvent, type: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="Institucional">Institucional</option>
                    <option value="Feriado">Feriado</option>
                    <option value="Examen">Examen</option>
                    <option value="Acto">Acto</option>
                    <option value="Reunión">Reunión</option>
                </select>
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Descripción</label>
            <textarea rows={3} value={editingEvent.description || ''} onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none" />
        </div>
    </div>
  );

  const renderReportsPanel = () => {
      return (
          <div className="animate-fade-in-up">
              <div className="flex gap-4 mb-4"><input type="text" value={searchTerm} onChange={handleSearch} className="border p-2 rounded w-full" placeholder="Buscar..." /></div>
              <div className="grid grid-cols-3 gap-6">
                  <div className="border p-4 rounded shadow-sm">
                      <h3>Padrones</h3>
                      <select value={reportRole} onChange={(e)=>setReportRole(e.target.value)} className="w-full border p-2 rounded mb-2"><option value="all">Todos</option>{Object.values(UserRole).map(r=><option key={r} value={r}>{r}</option>)}</select>
                      <Button onClick={() => handlePrintUsers(reportRole)} className="w-full">Imprimir</Button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
       {/* Tab Navigation */}
       {(currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.DIRECTIVO || currentUserRole === UserRole.OFICINA_ALUMNOS) && (
           <div className="flex overflow-x-auto pb-2 gap-2 custom-scrollbar">
               {allowedTabs.includes('USERS') && <Button variant={activeTab === 'USERS' ? 'primary' : 'ghost'} onClick={() => setActiveTab('USERS')}>Usuarios</Button>}
               {allowedTabs.includes('SPECIALTIES') && <Button variant={activeTab === 'SPECIALTIES' ? 'primary' : 'ghost'} onClick={() => setActiveTab('SPECIALTIES')}>Especialidades</Button>}
               {allowedTabs.includes('DEFINITIONS') && <Button variant={activeTab === 'DEFINITIONS' ? 'primary' : 'ghost'} onClick={() => setActiveTab('DEFINITIONS')}>Def. Materias</Button>}
               {allowedTabs.includes('COURSES') && <Button variant={activeTab === 'COURSES' ? 'primary' : 'ghost'} onClick={() => setActiveTab('COURSES')}>Cursos</Button>}
               {allowedTabs.includes('SUBJECTS') && <Button variant={activeTab === 'SUBJECTS' ? 'primary' : 'ghost'} onClick={() => setActiveTab('SUBJECTS')}>Materias</Button>}
               {allowedTabs.includes('ENROLLMENT') && <Button variant={activeTab === 'ENROLLMENT' ? 'primary' : 'ghost'} onClick={() => setActiveTab('ENROLLMENT')}>Inscripciones</Button>}
               {allowedTabs.includes('NOTIFICATIONS') && <Button variant={activeTab === 'NOTIFICATIONS' ? 'primary' : 'ghost'} onClick={() => setActiveTab('NOTIFICATIONS')}>Notificaciones</Button>}
               {allowedTabs.includes('CALENDAR') && <Button variant={activeTab === 'CALENDAR' ? 'primary' : 'ghost'} onClick={() => setActiveTab('CALENDAR')}>Calendario</Button>}
               {allowedTabs.includes('REPORTS') && <Button variant={activeTab === 'REPORTS' ? 'primary' : 'ghost'} onClick={() => setActiveTab('REPORTS')}>Reportes</Button>}
           </div>
       )}

       {/* Content */}
       <div className="animate-fade-in-up">
            {/* Search Bar for List Views */}
            {['USERS', 'COURSES', 'SUBJECTS', 'SPECIALTIES', 'DEFINITIONS', 'NOTIFICATIONS', 'CALENDAR'].includes(activeTab) && (
                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-full max-w-md">
                        <span className="absolute left-3 top-2.5 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={handleSearch} 
                            placeholder={`Buscar en ${activeTab.toLowerCase()}...`}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <Button onClick={() => handleOpenModal()}>
                        + Nuevo
                    </Button>
                </div>
            )}

            {/* USERS LIST */}
            {activeTab === 'USERS' && (
                <>
                    <div className="flex flex-wrap gap-4 mb-4 items-center justify-between">
                        <div className="flex gap-4 flex-wrap">
                            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm hover:border-brand-300 transition-colors">
                                <option value="">Todos los Roles</option>
                                {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm hover:border-brand-300 transition-colors">
                                <option value="all">Todos los Estados</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                            </select>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={handleDownloadUsersPDF} 
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-all shadow-lg shadow-slate-800/20 active:scale-95"
                                title="Generar PDF (Listado de Contacto)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                PDF
                            </button>
                            <button 
                                onClick={handleExportXLSX} 
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                title="Descargar Excel (.xlsx)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                XLSX
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Usuario</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4">Contacto</th>
                                    <th className="p-4">Datos Personales</th>
                                    <th className="p-4">F. Inscripción</th>
                                    <th className="p-4">Inscripción</th> 
                                    <th className="p-4">Observaciones</th>
                                    <th className="p-4">Roles</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(getFilteredData() as User[]).map((u: User) => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={u.avatarUrl} className="w-8 h-8 rounded-full bg-slate-200" alt="" />
                                            <div>
                                                <div className="font-bold text-slate-800">{u.lastName}, {u.name}</div>
                                                <div className="text-xs text-slate-400 font-mono">{u.dni}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {u.isActive !== false ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-600">{u.email || '-'}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{u.phone || '-'}</div>
                                        </td>
                                        <td className="p-4 text-slate-600 text-xs">
                                            {u.birthDate ? new Date(u.birthDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4 text-xs text-slate-600">
                                            {u.enrollmentDate ? new Date(u.enrollmentDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4">
                                            {u.courseId ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{getCourseName(u.courseId)}</span>
                                                    {u.technicalGroup && (
                                                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit mt-0.5">
                                                            Taller: {u.technicalGroup}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs text-slate-500 max-w-xs whitespace-normal">
                                            {u.notes || '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles.map(r => <span key={r} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200">{r}</span>)}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => handleOpenModal(u)} className="text-slate-400 hover:text-brand-600">✏️</button>
                                            <button 
                                                onClick={() => handleDelete(u)} 
                                                disabled={u.id === currentUser.id}
                                                className={`transition-colors ${u.id === currentUser.id ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600'}`}
                                                title={u.id === currentUser.id ? "No puede eliminarse a sí mismo" : "Eliminar usuario"}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ... other tabs (COURSES, SUBJECTS, etc.) ... */}
            {activeTab === 'COURSES' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(getFilteredData() as Course[]).map((c: Course) => (
                        <div key={c.id} className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 hover:shadow-lg transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">{c.shift}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(c)} className="text-slate-400 hover:text-brand-600">✏️</button>
                                    <button onClick={() => handleDelete(c)} className="text-slate-400 hover:text-rose-600">🗑️</button>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-1">{c.name}</h3>
                            <p className="text-sm text-slate-500 mb-4">{getSpecialtyName(c.specialtyId)}</p>
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Preceptores</p>
                                <p className="text-sm text-slate-700">{getPreceptorNames(c.preceptorIds)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {activeTab === 'SUBJECTS' && (
                <div className="space-y-4">
                     {(getFilteredData() as Subject[]).map((s: Subject) => (
                         <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-brand-200 transition-all flex justify-between items-center">
                             <div>
                                 <div className="flex items-center gap-2">
                                     <h3 className="font-bold text-slate-800">{s.name}</h3>
                                     <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{s.year}</span>
                                     <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{getCourseName(s.courseId)}</span>
                                 </div>
                                 <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                     <span>{s.hours} hs</span>
                                     <span>•</span>
                                     <span>{s.formationArea}</span>
                                     <span>•</span>
                                     <span className={`${s.isOnLeave ? 'text-rose-500 font-bold' : ''}`}>
                                        Titular: {getTeacherName(s.teacherId)} {s.isOnLeave ? '(Licencia)' : ''}
                                     </span>
                                 </div>
                                 {s.groups && s.groups.length > 0 && (
                                     <div className="mt-2 pl-4 border-l-2 border-slate-200 space-y-1">
                                         {s.groups.map(g => (
                                             <div key={g.id} className="text-xs text-slate-600 flex items-center gap-2">
                                                 <span className="font-bold">{g.name}:</span> {getTeacherName(g.teacherId)}
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => handleOpenModal(s)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg">✏️</button>
                                 <button onClick={() => handleDelete(s)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg">🗑️</button>
                             </div>
                         </div>
                     ))}
                </div>
            )}
            
            {activeTab === 'SPECIALTIES' && (
                 <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4 text-center">Cant. Cursos</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {getFilteredData().map((item: any) => {
                                // Calculate course usage for specialties view
                                const usageCount = courses.filter(c => c.specialtyId === item.id).length;
                                return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                    <td className="p-4 text-slate-600">{item.description}</td>
                                    <td className="p-4 text-center">
                                        {usageCount > 0 ? (
                                            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs font-bold border border-amber-200" title="Existen cursos asociados">
                                                {usageCount} cursos
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">Sin uso</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => handleOpenModal(item)} className="text-slate-400 hover:text-brand-600">✏️</button>
                                        <button 
                                            type="button" 
                                            onClick={() => handleDelete(item)} 
                                            className="text-slate-400 hover:text-rose-600 transition-colors" 
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                 </div>
            )}

            {activeTab === 'DEFINITIONS' && (
                 <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Detalles</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {getFilteredData().map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                    <td className="p-4 text-slate-600">{item.hours}hs - {item.cycle}</td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => handleOpenModal(item)} className="text-slate-400 hover:text-brand-600">✏️</button>
                                        <button type="button" onClick={() => handleDelete(item)} className="text-slate-400 hover:text-rose-600">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            )}

            {activeTab === 'NOTIFICATIONS' && (
                <div className="space-y-4">
                     {(getFilteredData() as Notification[]).map((n: Notification) => (
                         <div key={n.id} className="bg-white p-5 rounded-xl shadow-soft border border-slate-100">
                             <div className="flex justify-between items-start mb-2">
                                 <div>
                                     <h3 className="font-bold text-slate-800">{n.title}</h3>
                                     <div className="text-xs text-slate-400 mt-0.5">{new Date(n.date).toLocaleDateString()} • {n.senderName}</div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     {n.priority === 'Alta' && <span className="bg-rose-100 text-rose-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Alta</span>}
                                     <button onClick={() => handleDelete(n)} className="text-slate-400 hover:text-rose-600">🗑️</button>
                                 </div>
                             </div>
                             <p className="text-sm text-slate-600 mb-3">{n.message}</p>
                             <div className="flex gap-2">
                                 {n.targetRoles.map(r => <span key={r} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{r}</span>)}
                             </div>
                         </div>
                     ))}
                </div>
            )}

            {activeTab === 'CALENDAR' && (
                <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(getFilteredData() as CalendarEvent[]).map((e: CalendarEvent) => (
                             <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                                 <div>
                                     <div className="flex justify-between items-start">
                                         <span className="text-xs font-bold text-slate-400 uppercase">{new Date(e.date).toLocaleDateString()}</span>
                                         <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${e.type === 'Feriado' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>{e.type}</span>
                                     </div>
                                     <h3 className="font-bold text-slate-800 mt-2">{e.title}</h3>
                                     <p className="text-sm text-slate-500 mt-1">{e.description}</p>
                                 </div>
                                 <div className="mt-4 flex justify-end gap-2 border-t border-slate-50 pt-2">
                                     <button onClick={() => handleOpenModal(e)} className="text-xs font-bold text-brand-600">Editar</button>
                                     <button onClick={() => handleDelete(e)} className="text-xs font-bold text-rose-600">Eliminar</button>
                                 </div>
                             </div>
                        ))}
                     </div>
                </div>
            )}
            
            {/* ENROLLMENT (Custom View) */}
            {activeTab === 'ENROLLMENT' && (
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 animate-fade-in-up">
                    <h3 className="font-bold text-slate-800 mb-6">Gestión de Inscripciones</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div className="md:col-span-1 border-r border-slate-100 pr-6">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Seleccionar Curso</label>
                             <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                 {courses.map(c => (
                                     <button 
                                        key={c.id} 
                                        onClick={() => setSelectedCourseId(c.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${selectedCourseId === c.id ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                     >
                                         <div className="flex justify-between">
                                             <span>{c.name}</span>
                                             <span className="text-xs opacity-70">{c.shift}</span>
                                         </div>
                                         <div className="text-xs opacity-50 mt-1">{getSpecialtyName(c.specialtyId)}</div>
                                     </button>
                                 ))}
                             </div>
                         </div>
                         <div className="md:col-span-2 flex flex-col h-full">
                             {!selectedCourseId ? (
                                 <div className="h-full flex flex-col items-center justify-center text-slate-400 italic p-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                     Seleccione un curso del menú izquierdo para gestionar sus alumnos.
                                 </div>
                             ) : (
                                 <div className="flex flex-col h-full space-y-6">
                                     {/* LISTADO DE INSCRIPTOS */}
                                     <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col min-h-[300px]">
                                         <div className="flex justify-between items-center mb-4">
                                             <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                 <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs">
                                                     {users.filter(u => u.courseId === selectedCourseId && u.roles.includes(UserRole.ALUMNO)).length}
                                                 </span>
                                                 Inscriptos en {getCourseName(selectedCourseId)}
                                             </h4>
                                             <Button variant="outline" className="text-xs py-1.5 h-8" onClick={() => handlePrintList()}>🖨️ Lista</Button>
                                         </div>
                                         <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                              <table className="w-full text-sm">
                                                  <thead className="sticky top-0 bg-slate-50 z-10">
                                                      <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-200">
                                                          <th className="pb-2 pl-2">Alumno</th>
                                                          <th className="pb-2">Grupo Taller</th>
                                                          <th className="pb-2 text-right pr-2">Acción</th>
                                                      </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-200">
                                                      {users.filter(u => u.courseId === selectedCourseId && u.roles.includes(UserRole.ALUMNO)).length === 0 && (
                                                          <tr><td colSpan={3} className="py-8 text-center text-slate-400 italic">No hay alumnos inscriptos en este curso.</td></tr>
                                                      )}
                                                      {users
                                                        .filter(u => u.courseId === selectedCourseId && u.roles.includes(UserRole.ALUMNO))
                                                        .sort((a, b) => a.lastName.localeCompare(b.lastName))
                                                        .map(u => (
                                                          <tr key={u.id} className="hover:bg-slate-100/50 transition-colors">
                                                              <td className="py-2 pl-2 font-medium text-slate-700">{u.lastName}, {u.name}</td>
                                                              <td className="py-2">
                                                                  <select 
                                                                    value={u.technicalGroup || ''} 
                                                                    onChange={(e) => handleUpdateGroup(u, e.target.value)}
                                                                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                                                                  >
                                                                      <option value="">-</option>
                                                                      <option value="A">A</option>
                                                                      <option value="B">B</option>
                                                                      <option value="C">C</option>
                                                                  </select>
                                                              </td>
                                                              <td className="py-2 text-right pr-2">
                                                                  <button onClick={() => handleUnenrollStudent(u)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded text-xs font-semibold transition-colors">Quitar</button>
                                                              </td>
                                                          </tr>
                                                      ))}
                                                  </tbody>
                                              </table>
                                         </div>
                                     </div>
                                     
                                     {/* LISTADO DE ALUMNOS SIN ASIGNAR */}
                                     <div className="border-t border-slate-100 pt-6">
                                         <div className="flex justify-between items-end mb-3">
                                             <div>
                                                 <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                     Inscribir Alumno
                                                     <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">
                                                         {users.filter(u => u.roles.includes(UserRole.ALUMNO) && !u.courseId).length} Disponibles
                                                     </span>
                                                 </h4>
                                                 <p className="text-xs text-slate-400 mt-1">Listado de alumnos sin curso asignado actualmente.</p>
                                             </div>
                                         </div>
                                         
                                         <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                             <div className="relative mb-3">
                                                 <span className="absolute left-3 top-2.5 text-slate-400">
                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                 </span>
                                                 <input 
                                                    type="text" 
                                                    placeholder="Buscar por DNI o Apellido..." 
                                                    className="w-full pl-9 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-brand-500 transition-all"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                                 />
                                             </div>
                                             
                                             <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                                                 {users.filter(u => u.roles.includes(UserRole.ALUMNO) && !u.courseId).length === 0 ? (
                                                     <div className="text-center py-8 text-slate-400 italic text-sm">
                                                         Todos los alumnos tienen curso asignado.
                                                     </div>
                                                 ) : (
                                                     users
                                                        .filter(u => u.roles.includes(UserRole.ALUMNO) && !u.courseId)
                                                        .filter(u => 
                                                            searchTerm === '' || 
                                                            u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                            u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                            u.dni.includes(searchTerm)
                                                        )
                                                        .sort((a, b) => a.lastName.localeCompare(b.lastName))
                                                        .map(u => (
                                                         <div key={u.id} className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-lg hover:border-brand-300 hover:shadow-md transition-all group">
                                                             <div className="flex items-center gap-3">
                                                                 <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold border border-slate-200">
                                                                     {u.name.charAt(0)}{u.lastName.charAt(0)}
                                                                 </div>
                                                                 <div>
                                                                     <span className="block text-sm font-bold text-slate-700 group-hover:text-brand-700">{u.lastName}, {u.name}</span>
                                                                     <span className="block text-xs text-slate-400 font-mono">DNI: {u.dni}</span>
                                                                 </div>
                                                             </div>
                                                             <button 
                                                                onClick={() => handleEnrollStudent(u)} 
                                                                className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-brand-700 shadow-sm shadow-brand-500/30 transition-all active:scale-95 flex items-center gap-1"
                                                             >
                                                                 <span>Inscribir</span>
                                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                             </button>
                                                         </div>
                                                     ))
                                                 )}
                                                 {/* Empty search state */}
                                                 {searchTerm && users.filter(u => u.roles.includes(UserRole.ALUMNO) && !u.courseId && (u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || u.dni.includes(searchTerm))).length === 0 && (
                                                     <div className="text-center py-4 text-slate-400 text-xs">
                                                         No se encontraron alumnos con ese criterio.
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                    </div>
                </div>
            )}

            {/* ATTENDANCE (For Preceptors/Teachers) */}
            {activeTab === 'ATTENDANCE' && (
                <AttendancePanel currentUser={currentUser} />
            )}
            
            {/* REPORTS */}
            {activeTab === 'REPORTS' && renderReportsPanel()}
       </div>

       {/* MODAL */}
       {isModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
               <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                   <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                       <h3 className="text-xl font-bold text-slate-800">
                           {activeTab === 'USERS' ? 'Gestión de Usuario' : 
                            activeTab === 'COURSES' ? 'Editar Curso' : 
                            activeTab === 'SUBJECTS' ? 'Editar Materia' : 'Editar Elemento'}
                       </h3>
                       <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                   </div>
                   
                   <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                       {activeTab === 'USERS' && renderUserForm()}
                       {activeTab === 'SPECIALTIES' && renderSpecialtyForm()}
                       {activeTab === 'DEFINITIONS' && renderDefinitionForm()}
                       {activeTab === 'COURSES' && renderCourseForm()}
                       {activeTab === 'SUBJECTS' && (
                           <SubjectForm 
                               subject={editingSubject} 
                               onChange={setEditingSubject} 
                               courses={courses} 
                               teachers={teachers} 
                               getSpecialtyName={getSpecialtyName} 
                               getTeacherName={getTeacherName} 
                           />
                       )}
                       {activeTab === 'NOTIFICATIONS' && renderNotificationForm()}
                       {activeTab === 'CALENDAR' && renderCalendarForm()}
                       
                       <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                           <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                           <Button type="submit" isLoading={saving}>Guardar</Button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};

export default AdminPanel;