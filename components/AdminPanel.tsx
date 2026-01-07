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
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
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
    } catch (error) {
        console.error(error);
        alert("Ocurrió un error inesperado al intentar eliminar.");
    }
  };

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

  // --- REPORT TAB HELPERS ---
  const getReportData = () => {
    const term = searchTerm.toLowerCase();
    return users.filter(u => {
        const matchesSearch = 
            u.lastName.toLowerCase().includes(term) || 
            u.name.toLowerCase().includes(term) || 
            u.dni.includes(term);
        const matchesRole = reportRole === 'all' || u.roles.includes(reportRole as UserRole);
        return matchesSearch && matchesRole;
    }).sort((a, b) => a.lastName.localeCompare(b.lastName));
  };

  const handleReportPDF = () => {
      const data = getReportData();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
              <html>
                  <head>
                      <title>Reporte de Usuarios</title>
                      <style>
                          body { font-family: sans-serif; padding: 20px; font-size: 12px; }
                          h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                          .meta { text-align: center; color: #666; margin-bottom: 20px; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                          th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 11px; }
                          tr:nth-child(even) { background-color: #f9f9f9; }
                      </style>
                  </head>
                  <body>
                      <h1>Reporte de Usuarios</h1>
                      <div class="meta">
                          Filtro Rol: ${reportRole} | Cantidad: ${data.length}
                      </div>
                      <table>
                          <thead>
                              <tr>
                                  <th>Apellido y Nombre</th>
                                  <th>DNI</th>
                                  <th>Celular</th>
                                  <th>Fecha Nacimiento</th>
                                  <th>Contacto (Email)</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${data.map(u => `
                                  <tr>
                                      <td><strong>${u.lastName}, ${u.name}</strong></td>
                                      <td>${u.dni}</td>
                                      <td>${u.phone || '-'}</td>
                                      <td>${u.birthDate ? new Date(u.birthDate).toLocaleDateString() : '-'}</td>
                                      <td>${u.email || '-'}</td>
                                  </tr>
                              `).join('')}
                          </tbody>
                      </table>
                  </body>
              </html>
          `);
          printWindow.document.close();
          setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
      }
  };

  const handleReportXLSX = () => {
      const data = getReportData();
      const exportData = data.map(u => ({
          "Apellido": u.lastName,
          "Nombre": u.name,
          "DNI": u.dni,
          "Celular": u.phone || '',
          "Fecha Nacimiento": u.birthDate ? new Date(u.birthDate).toLocaleDateString() : '',
          "Email": u.email || ''
      }));
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
      XLSX.writeFile(workbook, `reporte_${reportRole}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintList = () => { 
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
    const reportData = getReportData();

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    Filtros de Reporte
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Buscar (Apellido, DNI)</label>
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={handleSearch} 
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm" 
                            placeholder="Ingrese nombre o documento..." 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Filtrar por Rol</label>
                        <select 
                            value={reportRole} 
                            onChange={(e) => setReportRole(e.target.value)} 
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                        >
                            <option value="all">Todos los Roles</option>
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <Button onClick={handleReportPDF} className="flex-1 bg-slate-800 hover:bg-slate-700">
                            Imprimir / PDF
                        </Button>
                        <Button onClick={handleReportXLSX} className="flex-1 bg-emerald-600 hover:bg-emerald-500">
                            Descargar Excel
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table Preview */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Vista Previa ({reportData.length} registros)</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Apellido y Nombre</th>
                                <th className="p-4">DNI</th>
                                <th className="p-4">Celular</th>
                                <th className="p-4">Fecha Nacimiento</th>
                                <th className="p-4">Contacto (Email)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {reportData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">No se encontraron resultados con los filtros actuales.</td>
                                </tr>
                            ) : (
                                reportData.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-700">{u.lastName}, {u.name}</td>
                                        <td className="p-4 text-slate-600 font-mono text-xs">{u.dni}</td>
                                        <td className="p-4 text-xs text-slate-500">{u.phone || '-'}</td>
                                        <td className="p-4 text-xs text-slate-500">
                                            {u.birthDate ? new Date(u.birthDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4 text-xs text-slate-500">{u.email || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const renderList = () => {
      const data = getFilteredData();
      
      return (
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden animate-fade-in-up">
              {/* Header / Actions */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="text-lg font-bold text-slate-800 capitalize">{activeTab.toLowerCase().replace('_', ' ')}</h3>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                          />
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                      
                      {activeTab === 'USERS' && (
                        <div className="flex gap-2">
                             <select 
                                value={filterRole} 
                                onChange={(e) => setFilterRole(e.target.value)} 
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                             >
                                 <option value="">Todos los Roles</option>
                                 {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                             </select>
                             <select 
                                value={filterStatus} 
                                onChange={(e) => setFilterStatus(e.target.value)} 
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                             >
                                 <option value="all">Todos (Estado)</option>
                                 <option value="active">Activos</option>
                                 <option value="inactive">Inactivos</option>
                             </select>
                             <div className="flex gap-1">
                                <button onClick={handleDownloadUsersPDF} className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg" title="Imprimir Listado"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
                                <button onClick={handleExportXLSX} className="p-2 text-emerald-600 hover:text-emerald-800 bg-emerald-50 rounded-lg" title="Exportar Excel"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                             </div>
                        </div>
                      )}

                      <Button onClick={() => handleOpenModal()}>
                          + Nuevo
                      </Button>
                  </div>
              </div>

              {/* Table Content */}
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                          <tr>
                             {/* Dynamic Headers based on ActiveTab */}
                             {activeTab === 'USERS' && <><th className="p-4">Usuario</th><th className="p-4">DNI</th><th className="p-4">Roles</th><th className="p-4">Estado</th></>}
                             {activeTab === 'COURSES' && <><th className="p-4">Curso</th><th className="p-4">Turno</th><th className="p-4">Especialidad</th><th className="p-4">Preceptores</th></>}
                             {activeTab === 'SUBJECTS' && <><th className="p-4">Materia</th><th className="p-4">Curso</th><th className="p-4">Docente</th><th className="p-4">Carga</th></>}
                             {activeTab === 'SPECIALTIES' && <><th className="p-4">ID</th><th className="p-4">Nombre</th><th className="p-4">Descripción</th></>}
                             {activeTab === 'DEFINITIONS' && <><th className="p-4">Nombre</th><th className="p-4">Área</th><th className="p-4">Ciclo</th><th className="p-4">Horas</th></>}
                             {activeTab === 'NOTIFICATIONS' && <><th className="p-4">Fecha</th><th className="p-4">Título</th><th className="p-4">Destinatarios</th><th className="p-4">Prioridad</th></>}
                             {activeTab === 'CALENDAR' && <><th className="p-4">Fecha</th><th className="p-4">Evento</th><th className="p-4">Tipo</th><th className="p-4">Descripción</th></>}
                             <th className="p-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {data.length === 0 ? (
                              <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No se encontraron registros.</td></tr>
                          ) : (
                              data.map((item: any) => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                      {activeTab === 'USERS' && (
                                          <>
                                              <td className="p-4">
                                                  <div className="flex items-center gap-3">
                                                      <img src={item.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
                                                      <div>
                                                          <div className="font-bold text-slate-800">{item.lastName}, {item.name}</div>
                                                          <div className="text-xs text-slate-400">{item.email}</div>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="p-4 text-slate-500 font-mono text-xs">{item.dni}</td>
                                              <td className="p-4">
                                                  <div className="flex flex-wrap gap-1">
                                                      {item.roles.map((r: string) => (
                                                          <span key={r} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{r}</span>
                                                      ))}
                                                  </div>
                                              </td>
                                              <td className="p-4">
                                                  {item.isActive !== false ? 
                                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold">Activo</span> : 
                                                    <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-full text-xs font-bold">Inactivo</span>
                                                  }
                                              </td>
                                          </>
                                      )}
                                      
                                      {activeTab === 'COURSES' && (
                                          <>
                                              <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                              <td className="p-4 text-slate-500">{item.shift}</td>
                                              <td className="p-4 text-slate-500">{getSpecialtyName(item.specialtyId)}</td>
                                              <td className="p-4 text-xs text-slate-400">{getPreceptorNames(item.preceptorIds)}</td>
                                          </>
                                      )}

                                      {activeTab === 'SUBJECTS' && (
                                          <>
                                              <td className="p-4">
                                                  <div className="font-bold text-slate-800">{item.name}</div>
                                                  <div className="text-xs text-slate-400">{item.formationArea}</div>
                                              </td>
                                              <td className="p-4 text-slate-500">{getCourseName(item.courseId)}</td>
                                              <td className="p-4">
                                                  {item.formationArea === 'Formación Técnico Específica' ? (
                                                      <span className="text-xs italic text-slate-400">{item.groups?.length || 0} Grupos</span>
                                                  ) : (
                                                      <div className="text-sm text-slate-600">{getTeacherName(item.teacherId)} <span className="text-xs text-slate-400">({item.teacherCondition})</span></div>
                                                  )}
                                              </td>
                                              <td className="p-4 text-slate-500">{item.hours}hs</td>
                                          </>
                                      )}

                                      {activeTab === 'SPECIALTIES' && (
                                          <>
                                              <td className="p-4 font-mono text-xs text-slate-500">{item.id}</td>
                                              <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                              <td className="p-4 text-slate-500 text-xs max-w-xs truncate">{item.description}</td>
                                          </>
                                      )}

                                      {activeTab === 'DEFINITIONS' && (
                                          <>
                                              <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                              <td className="p-4 text-slate-500 text-xs">{item.formationArea}</td>
                                              <td className="p-4 text-slate-500 text-xs">{item.cycle}</td>
                                              <td className="p-4 text-slate-500">{item.hours}hs</td>
                                          </>
                                      )}

                                      {activeTab === 'NOTIFICATIONS' && (
                                          <>
                                              <td className="p-4 text-slate-500 text-xs">{new Date(item.date).toLocaleDateString()}</td>
                                              <td className="p-4 font-bold text-slate-800">{item.title}</td>
                                              <td className="p-4">
                                                  <div className="flex flex-wrap gap-1">
                                                      {item.targetRoles.map((r: string) => (
                                                          <span key={r} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{r}</span>
                                                      ))}
                                                  </div>
                                              </td>
                                              <td className="p-4">
                                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${item.priority === 'Alta' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                                      {item.priority}
                                                  </span>
                                              </td>
                                          </>
                                      )}

                                      {activeTab === 'CALENDAR' && (
                                          <>
                                              <td className="p-4 text-slate-500 text-xs">{new Date(item.date).toLocaleDateString()}</td>
                                              <td className="p-4 font-bold text-slate-800">{item.title}</td>
                                              <td className="p-4 text-slate-500 text-xs">{item.type}</td>
                                              <td className="p-4 text-slate-500 text-xs truncate max-w-xs">{item.description}</td>
                                          </>
                                      )}

                                      <td className="p-4 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => handleOpenModal(item)} className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                              </button>
                                              <button onClick={() => handleDelete(item)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  const renderEnrollmentPanel = () => {
    // Filter only students without course or with course if we want to move them
    // For simplicity: List all students, allow assigning/changing course.
    const allStudents = users.filter(u => u.roles.includes(UserRole.ALUMNO));
    const studentsToDisplay = allStudents.filter(s => {
        const matchSearch = s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || s.dni.includes(searchTerm);
        if (selectedCourseId) return matchSearch && s.courseId === selectedCourseId;
        return matchSearch; // if no course selected, show all (or filtered by search)
    });

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">Gestión de Matrícula e Inscripciones</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Seleccionar Curso</label>
                        <select 
                            value={selectedCourseId} 
                            onChange={(e) => setSelectedCourseId(e.target.value)} 
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        >
                            <option value="">-- Todos los Alumnos / Sin Asignar --</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {getSpecialtyName(c.specialtyId)}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Buscar Alumno</label>
                        <input type="text" value={searchTerm} onChange={handleSearch} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nombre o DNI..." />
                    </div>
                    {selectedCourseId && <Button onClick={() => handlePrintList()}>🖨️ Imprimir Lista</Button>}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Alumno</th>
                            <th className="p-4">DNI</th>
                            <th className="p-4">Curso Actual</th>
                            <th className="p-4">Grupo Taller</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {studentsToDisplay.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-800">{student.lastName}, {student.name}</td>
                                <td className="p-4 text-slate-500">{student.dni}</td>
                                <td className="p-4">
                                    {student.courseId ? (
                                        <span className="bg-brand-50 text-brand-600 px-2 py-1 rounded-lg text-xs font-bold">{getCourseName(student.courseId)}</span>
                                    ) : (
                                        <span className="text-slate-400 italic text-xs">Sin asignar</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <select 
                                        value={student.technicalGroup || ''} 
                                        onChange={(e) => handleUpdateGroup(student, e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2 py-1 outline-none"
                                    >
                                        <option value="">-</option>
                                        <option value="A">Grupo A</option>
                                        <option value="B">Grupo B</option>
                                        <option value="C">Grupo C</option>
                                    </select>
                                </td>
                                <td className="p-4 text-right">
                                    {selectedCourseId && student.courseId !== selectedCourseId ? (
                                        <button onClick={() => handleEnrollStudent(student)} className="text-brand-600 hover:underline text-xs font-bold">Asignar a este curso</button>
                                    ) : student.courseId ? (
                                        <button onClick={() => handleUnenrollStudent(student)} className="text-rose-500 hover:underline text-xs font-bold">Desmatricular</button>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6">
       {/* Tab Navigation */}
       {allowedTabs.length > 0 && (
         <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 inline-flex flex-wrap gap-1">
             {allowedTabs.map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wide ${activeTab === tab ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                     {tab === 'DEFINITIONS' ? 'Definiciones' : tab.replace('_', ' ')}
                 </button>
             ))}
         </div>
       )}

       {/* Content Switch */}
       {activeTab === 'ATTENDANCE' ? (
           <AttendancePanel currentUser={currentUser} />
       ) : activeTab === 'REPORTS' ? (
           renderReportsPanel()
       ) : activeTab === 'ENROLLMENT' ? (
           renderEnrollmentPanel()
       ) : (
           // Generic List for USERS, COURSES, SUBJECTS, SPECIALTIES, DEFINITIONS, NOTIFICATIONS, CALENDAR
           renderList()
       )}

       {/* Modal Form */}
       {isModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
               <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
                   <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-20">
                       <h3 className="text-lg font-bold">
                           {activeTab === 'USERS' ? (editingUser.id ? 'Editar Usuario' : 'Nuevo Usuario') :
                            activeTab === 'COURSES' ? (editingCourse.id ? 'Editar Curso' : 'Nuevo Curso') :
                            activeTab === 'SUBJECTS' ? (editingSubject.id ? 'Editar Materia' : 'Nueva Materia') :
                            activeTab === 'SPECIALTIES' ? 'Especialidad' :
                            activeTab === 'DEFINITIONS' ? 'Definición Materia' :
                            activeTab === 'NOTIFICATIONS' ? 'Comunicado' :
                            activeTab === 'CALENDAR' ? 'Evento' : 'Editar'}
                       </h3>
                       <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-700 rounded-full p-1 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                       </button>
                   </div>
                   
                   <form onSubmit={handleSubmit} className="p-6">
                       {activeTab === 'USERS' && renderUserForm()}
                       {activeTab === 'COURSES' && renderCourseForm()}
                       {activeTab === 'SUBJECTS' && <SubjectForm subject={editingSubject} onChange={setEditingSubject} courses={courses} teachers={teachers} getSpecialtyName={getSpecialtyName} getTeacherName={getTeacherName} />}
                       {activeTab === 'SPECIALTIES' && renderSpecialtyForm()}
                       {activeTab === 'DEFINITIONS' && renderDefinitionForm()}
                       {activeTab === 'NOTIFICATIONS' && renderNotificationForm()}
                       {activeTab === 'CALENDAR' && renderCalendarForm()}

                       <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                           <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                           <Button type="submit" isLoading={saving}>Guardar Cambios</Button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};

export default AdminPanel;