import { Course, Subject, Specialty, SubjectDefinition, Notification, CalendarEvent, UserRole, StudentGrade, AttendanceRecord, AttendanceStatus } from '../types';
import { getAllUsers } from './authService';

// --- MOCK DATA SPECIALTIES ---
let specialties: Specialty[] = [
  { id: 'CB', name: 'Ciclo Básico', description: 'Materias comunes de 1ro a 3er año.' },
  { id: 'COMP', name: 'Computación', description: 'Orientación en Software y Programación.' },
  { id: 'ELEC', name: 'Electromecánica', description: 'Mecánica, electricidad y automatización.' },
  { id: 'MMO', name: 'Maestro Mayor de Obras', description: 'Construcción y diseño civil.' },
  { id: 'ROBO', name: 'Robótica', description: 'Especialidad nueva sin cursos asignados (Para probar eliminación).' },
];

// --- MOCK DATA SUBJECT DEFINITIONS ---
let subjectDefinitions: SubjectDefinition[] = [
  { id: '1', name: 'Matemática', hours: 4, curriculumDesign: 'Álgebra y Geometría', cycle: 'Ciclo Básico', formationArea: 'Formación General' },
  { id: '2', name: 'Literatura', hours: 3, curriculumDesign: 'Análisis de textos', cycle: 'Ciclo Básico', formationArea: 'Formación General' },
  { id: '3', name: 'Programación', hours: 6, curriculumDesign: 'Algoritmos y Estructuras', cycle: 'Ciclo Superior', formationArea: 'Formación Científico Tecnológica' },
];

// --- MOCK DATA COURSES ---
let courses: Course[] = [
  { id: 'C1', name: '1° 1ra', specialtyId: 'CB', shift: 'Mañana', preceptorIds: ['prec-01'] },
  { id: 'C2', name: '2° 1ra', specialtyId: 'CB', shift: 'Tarde', preceptorIds: ['prec-02'] },
  { id: 'C3', name: '3° 1ra', specialtyId: 'CB', shift: 'Mañana', preceptorIds: ['prec-03', 'prec-01'] }, // Example of multiple preceptors
  { id: 'C4', name: '4° 1ra', specialtyId: 'COMP', shift: 'Mañana', preceptorIds: ['prec-04'] },
  { id: 'C5', name: '5° 1ra', specialtyId: 'ELEC', shift: 'Tarde', preceptorIds: ['prec-05'] },
  { id: 'C6', name: '6° 1ra', specialtyId: 'MMO', shift: 'Vespertino', preceptorIds: ['prec-01'] },
];

interface SubjectWithCourse extends Subject {
    courseId?: string;
}

// --- MOCK DATA SUBJECTS ---
let subjects: SubjectWithCourse[] = [
  // --- 1° 1ra (C1) ---
  { 
      id: 'S1-01', name: 'Matemática I', year: '1° Año', hours: 4, curriculumDesign: 'Base', teacherId: 'prof-01', teacherCondition: 'Titular', courseId: 'C1', formationArea: 'Formación General',
      schedules: [
          { day: 'Lunes', startTime: '07:30', endTime: '09:30' },
          { day: 'Miércoles', startTime: '09:40', endTime: '11:50' }
      ]
  },
  { 
      id: 'S1-02', name: 'Prácticas del Lenguaje', year: '1° Año', hours: 4, curriculumDesign: 'Base', teacherId: 'prof-06', teacherCondition: 'Titular', courseId: 'C1', formationArea: 'Formación General',
      isOnLeave: true,
      substitutes: [{ teacherId: 'prof-10', isActive: true }], // Updated structure
      schedules: [
          { day: 'Martes', startTime: '07:30', endTime: '09:30' },
          { day: 'Jueves', startTime: '07:30', endTime: '09:30' }
      ]
  },
  { id: 'S1-03', name: 'Ciencias Naturales', year: '1° Año', hours: 3, curriculumDesign: 'Base', teacherId: 'prof-02', teacherCondition: 'Provisional', courseId: 'C1', formationArea: 'Formación General' },
  { 
      id: 'S1-04', name: 'Taller Pre-Profesional', year: '1° Año', hours: 4, curriculumDesign: 'Rotación', teacherId: 'prof-08', teacherCondition: 'Titular', courseId: 'C1', formationArea: 'Formación Técnico Específica', 
      groups: [
          {
              id: 'g1', name: 'Grupo A', teacherId: 'prof-08', 
              schedules: [{ day: 'Viernes', startTime: '07:30', endTime: '11:50' }]
          }, 
          {
              id: 'g2', name: 'Grupo B', teacherId: 'prof-05',
              schedules: [{ day: 'Lunes', startTime: '13:30', endTime: '17:50' }]
          }
      ] 
  },

  // --- 2° 1ra (C2) ---
  { id: 'S2-01', name: 'Matemática II', year: '2° Año', hours: 4, curriculumDesign: 'Base', teacherId: 'prof-01', teacherCondition: 'Titular', courseId: 'C2', formationArea: 'Formación General' },
  { id: 'S2-02', name: 'Literatura', year: '2° Año', hours: 3, curriculumDesign: 'Base', teacherId: 'prof-06', teacherCondition: 'Titular', courseId: 'C2', formationArea: 'Formación General' },
  { id: 'S2-03', name: 'Historia', year: '2° Año', hours: 2, curriculumDesign: 'Base', teacherId: 'prof-10', teacherCondition: 'Suplente', courseId: 'C2', formationArea: 'Formación General' },

  // --- 3° 1ra (C3) ---
  { id: 'S3-01', name: 'Físico-Química', year: '3° Año', hours: 3, curriculumDesign: 'Base', teacherId: 'prof-02', teacherCondition: 'Titular', courseId: 'C3', formationArea: 'Formación Científico Tecnológica' },
  { id: 'S3-02', name: 'Matemática III', year: '3° Año', hours: 4, curriculumDesign: 'Base', teacherId: 'prof-09', teacherCondition: 'Titular', courseId: 'C3', formationArea: 'Formación General' },

  // --- 4° 1ra Computación (C4) ---
  { id: 'S4-01', name: 'Programación I', year: '4° Año', hours: 6, curriculumDesign: 'Algoritmos', teacherId: 'prof-04', teacherCondition: 'Titular', courseId: 'C4', formationArea: 'Formación Técnico Específica' },
  { id: 'S4-02', name: 'Sistemas Operativos', year: '4° Año', hours: 4, curriculumDesign: 'Linux/Windows', teacherId: 'prof-09', teacherCondition: 'Titular', courseId: 'C4', formationArea: 'Formación Técnico Específica' },
  { id: 'S4-03', name: 'Física', year: '4° Año', hours: 3, curriculumDesign: 'Mecánica', teacherId: 'prof-03', teacherCondition: 'Titular', courseId: 'C4', formationArea: 'Formación Científico Tecnológica' },
  { id: 'S4-04', name: 'Arte', year: '4° Año', hours: 2, curriculumDesign: 'Historia del Arte', teacherId: 'prof-07', teacherCondition: 'Titular', courseId: 'C4', formationArea: 'Formación General' },

  // --- 5° 1ra Electromecánica (C5) ---
  { id: 'S5-01', name: 'Electrotecnia I', year: '5° Año', hours: 6, curriculumDesign: 'Circuitos', teacherId: 'prof-05', teacherCondition: 'Titular', courseId: 'C5', formationArea: 'Formación Técnico Específica' },
  { id: 'S5-02', name: 'Mecánica de Fluidos', year: '5° Año', hours: 4, curriculumDesign: 'Hidráulica', teacherId: 'prof-03', teacherCondition: 'Titular', courseId: 'C5', formationArea: 'Formación Científico Tecnológica' },
  
  // --- 6° 1ra MMO (C6) ---
  { id: 'S6-01', name: 'Estructuras', year: '6° Año', hours: 6, curriculumDesign: 'Cálculo', teacherId: 'prof-01', teacherCondition: 'Titular', courseId: 'C6', formationArea: 'Formación Técnico Específica' },
  { id: 'S6-02', name: 'Proyecto de Obra', year: '6° Año', hours: 8, curriculumDesign: 'Planos', teacherId: 'prof-07', teacherCondition: 'Titular', courseId: 'C6', formationArea: 'Formación Técnico Específica' },
];

// --- MOCK DATA NOTIFICATIONS ---
let notifications: Notification[] = [
  {
    id: '1',
    title: 'Inicio del Ciclo Lectivo',
    message: 'Bienvenidos al nuevo año escolar. Les deseamos mucho éxito.',
    date: new Date().toISOString().split('T')[0],
    targetRoles: [UserRole.ALUMNO, UserRole.DOCENTE, UserRole.PRECEPTOR],
    senderName: 'Dirección General',
    priority: 'Normal'
  },
  {
    id: '2',
    title: 'Reunión de Personal',
    message: 'Se cita a todo el personal de Preceptoría para el día Viernes a las 10hs.',
    date: new Date().toISOString().split('T')[0],
    targetRoles: [UserRole.PRECEPTOR],
    senderName: 'Dirección General',
    priority: 'Alta'
  }
];

// --- MOCK DATA CALENDAR ---
let calendarEvents: CalendarEvent[] = [
  { id: '1', title: 'Cierre Trimestre 1', date: '2024-05-31', type: 'Institucional', description: 'Cierre de notas.' },
  { id: '2', title: 'Día de la Bandera', date: '2024-06-20', type: 'Feriado' },
  { id: '3', title: 'Mesa de Examen', date: '2024-07-10', type: 'Examen', description: 'Previas Julio.' },
];

// --- MOCK DATA GRADES ---
let mockGrades: Record<string, StudentGrade> = {};

// --- MOCK DATA ATTENDANCE ---
// Storing as an array for simplicity in this mock
let attendanceRegistry: AttendanceRecord[] = [];

// Helper to init mock attendance for demo purposes
const initMockAttendance = async () => {
    if (attendanceRegistry.length > 0) return;
    
    // Generate some random attendance for the last 10 days for C1 students (Demo Student '1' is in C1)
    const today = new Date();
    const students = await getAllUsers();
    const c1Students = students.filter(s => s.courseId === 'C1' && s.roles.includes(UserRole.ALUMNO));

    // Fill last 30 days
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        
        const dateStr = d.toISOString().split('T')[0];

        c1Students.forEach(student => {
             const rand = Math.random();
             let status: AttendanceStatus = 'Presente';
             if (rand > 0.9) status = 'Ausente';
             else if (rand > 0.8) status = 'Tarde';

             // Demo student logic: make it look realistic
             if (student.id === '1') {
                 if (i === 2) status = 'Ausente';
                 else if (i === 4) status = 'Tarde';
                 else status = 'Presente';
             }

             attendanceRegistry.push({
                 id: `${student.id}_${dateStr}`,
                 studentId: student.id,
                 courseId: 'C1',
                 date: dateStr,
                 status: status
                 // NOTE: Mock data assumes general course attendance (no subjectId) for Preceptors
             });
        });
    }
};


// Initial mock grades for the Demo Student (ID 1) in C1
const initMockGrades = async () => {
    if (Object.keys(mockGrades).length > 0) return;
    mockGrades['1_S1-01'] = {
        subjectId: 'S1-01', subjectName: 'Matemática I',
        valParcial1: 'TEA', calificacion1: 8, intensificacion1: '-',
        valParcial2: 'TEA', calificacion2: 9, intensificacion1_en_2: '-', intensificacion2: '-',
        intensificacionDic: '-', intensificacionFeb: '-', calificacionFinal: 9
    };
    mockGrades['1_S1-02'] = {
        subjectId: 'S1-02', subjectName: 'Prácticas del Lenguaje',
        valParcial1: 'TEP', calificacion1: 6, intensificacion1: 'En proceso',
        valParcial2: 'TEA', calificacion2: 7, intensificacion1_en_2: 'Aprobado', intensificacion2: '-',
        intensificacionDic: '-', intensificacionFeb: '-', calificacionFinal: 7
    };
};

// --- CRUD EXPORTS ---
export const getAllSpecialties = async () => { await new Promise(r => setTimeout(r, 200)); return [...specialties]; };
export const saveSpecialty = async (s: Specialty) => { 
    await new Promise(r => setTimeout(r, 200)); 
    const idx = specialties.findIndex(x => x.id === s.id);
    if(idx >= 0) {
        specialties[idx] = s; // Mutate existing
    } else {
        const newS = {...s, id: s.id || Date.now().toString()};
        specialties.push(newS); // Push new
        return newS;
    }
    return s; 
};
export const deleteSpecialty = async (id: string): Promise<{success: boolean, message?: string}> => { 
    await new Promise(r => setTimeout(r, 200));
    
    // Integrity Check: Is any course using this specialty?
    const isUsed = courses.some(c => c.specialtyId === id);
    if (isUsed) {
        return { success: false, message: "⚠️ No se puede eliminar: Hay cursos activos asociados a esta especialidad." };
    }

    const idx = specialties.findIndex(x => x.id === id);
    if (idx !== -1) {
        specialties.splice(idx, 1);
        return { success: true };
    }
    return { success: false, message: "Especialidad no encontrada." };
};

export const getAllSubjectDefinitions = async () => { await new Promise(r => setTimeout(r, 200)); return [...subjectDefinitions]; };
export const saveSubjectDefinition = async (d: SubjectDefinition) => { 
    await new Promise(r => setTimeout(r, 200)); 
    const idx = subjectDefinitions.findIndex(x => x.id === d.id);
    if(idx !== -1) {
        subjectDefinitions[idx] = d;
    } else {
        const newD = {...d, id: Date.now().toString()};
        subjectDefinitions.push(newD);
        return newD;
    }
    return d; 
};
export const deleteSubjectDefinition = async (id: string) => { 
    await new Promise(r => setTimeout(r, 200));
    const idx = subjectDefinitions.findIndex(x => x.id === id);
    if (idx !== -1) subjectDefinitions.splice(idx, 1);
    return true; 
};

export const getAllCourses = async () => { await new Promise(r => setTimeout(r, 200)); return [...courses]; };
export const saveCourse = async (c: Course) => { 
    const idx = courses.findIndex(x => x.id === c.id);
    if(idx !== -1) courses[idx] = c;
    else courses.push({...c, id: Date.now().toString()});
    return c; 
};
export const deleteCourse = async (id: string) => { 
    await new Promise(r => setTimeout(r, 200));
    const idx = courses.findIndex(x => x.id === id);
    if (idx !== -1) courses.splice(idx, 1);
    return true; 
};

export const getAllSubjects = async () => { await new Promise(r => setTimeout(r, 200)); return [...subjects]; };
export const saveSubject = async (s: SubjectWithCourse) => { 
    const idx = subjects.findIndex(x => x.id === s.id);
    if(idx !== -1) subjects[idx] = s;
    else subjects.push({...s, id: Date.now().toString()});
    return s;
};
export const deleteSubject = async (id: string) => { 
    await new Promise(r => setTimeout(r, 200));
    const idx = subjects.findIndex(x => x.id === id);
    if (idx !== -1) subjects.splice(idx, 1);
    return true; 
};

export const getStudentGrades = async (studentId: string): Promise<StudentGrade[]> => {
    await initMockGrades();
    await new Promise(resolve => setTimeout(resolve, 200));
    const result: StudentGrade[] = [];
    Object.keys(mockGrades).forEach(key => {
        if (key.startsWith(`${studentId}_`)) result.push(mockGrades[key]);
    });
    // Add empty entries for enrolled subjects if no grade exists yet
    const student = (await getAllUsers()).find(u => u.id === studentId);
    if(student && student.courseId) {
        const courseSubjects = subjects.filter(s => s.courseId === student.courseId);
        courseSubjects.forEach(sub => {
            if(!result.find(r => r.subjectId === sub.id)) {
                result.push({
                    subjectId: sub.id, subjectName: sub.name,
                    valParcial1: '-', calificacion1: '-', intensificacion1: '-',
                    valParcial2: '-', calificacion2: '-', intensificacion1_en_2: '-', intensificacion2: '-',
                    intensificacionDic: '-', intensificacionFeb: '-', calificacionFinal: '-'
                });
            }
        });
    }
    return result;
};

export interface StudentGradeWithUser extends StudentGrade {
    studentId: string; studentName: string; studentLastName: string; studentDni: string;
}

export const getGradesForSubject = async (subjectId: string, courseId: string): Promise<StudentGradeWithUser[]> => {
    await initMockGrades();
    await new Promise(resolve => setTimeout(resolve, 200));
    const allUsers = await getAllUsers();
    const studentsInCourse = allUsers.filter(u => u.roles.includes(UserRole.ALUMNO) && u.courseId === courseId);
    const subject = subjects.find(s => s.id === subjectId);
    const subjectName = subject ? subject.name : 'Materia';

    return studentsInCourse.map(student => {
        const key = `${student.id}_${subjectId}`;
        const existingGrade = mockGrades[key];
        const base = { studentId: student.id, studentName: student.name, studentLastName: student.lastName, studentDni: student.dni };
        
        if (existingGrade) return { ...existingGrade, ...base };
        return {
            ...base, subjectId: subjectId, subjectName: subjectName,
            valParcial1: '', calificacion1: '', intensificacion1: '',
            valParcial2: '', calificacion2: '', intensificacion1_en_2: '', intensificacion2: '',
            intensificacionDic: '', intensificacionFeb: '', calificacionFinal: ''
        };
    }).sort((a,b) => a.studentLastName.localeCompare(b.studentLastName));
};

export const saveGrades = async (grades: StudentGradeWithUser[]): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    grades.forEach(g => {
        const key = `${g.studentId}_${g.subjectId}`;
        mockGrades[key] = {
            subjectId: g.subjectId, subjectName: g.subjectName,
            valParcial1: g.valParcial1, calificacion1: g.calificacion1, intensificacion1: g.intensificacion1,
            valParcial2: g.valParcial2, calificacion2: g.calificacion2, intensificacion1_en_2: g.intensificacion1_en_2, intensificacion2: g.intensificacion2,
            intensificacionDic: g.intensificacionDic, intensificacionFeb: g.intensificacionFeb, calificacionFinal: g.calificacionFinal
        };
    });
    return true;
};

// --- ATTENDANCE SERVICE ---

export const getAttendanceByDate = async (courseId: string, date: string, subjectId?: string): Promise<AttendanceRecord[]> => {
    await initMockAttendance();
    await new Promise(resolve => setTimeout(resolve, 200));
    return attendanceRegistry.filter(r => {
        const matchCourse = r.courseId === courseId;
        const matchDate = r.date === date;
        const matchSubject = subjectId ? r.subjectId === subjectId : true;
        // If searching for subject, filtering is strict. If searching for course general (preceptor), we might see all or filter by null subjectId. 
        // For simplicity: Preceptors see everything, Teachers see their subject.
        return matchCourse && matchDate && matchSubject;
    });
};

export const getCourseAttendanceMonthly = async (courseId: string, month: number, year: number, subjectId?: string): Promise<AttendanceRecord[]> => {
    await initMockAttendance();
    await new Promise(resolve => setTimeout(resolve, 200));
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return attendanceRegistry.filter(r => {
        const matchCourse = r.courseId === courseId;
        const matchDate = r.date.startsWith(prefix);
        const matchSubject = subjectId ? r.subjectId === subjectId : true;
        return matchCourse && matchDate && matchSubject;
    });
};

export const getStudentAttendanceHistory = async (studentId: string): Promise<AttendanceRecord[]> => {
    await initMockAttendance();
    await new Promise(resolve => setTimeout(resolve, 200));
    return attendanceRegistry.filter(r => r.studentId === studentId);
};

export const saveAttendanceBulk = async (records: AttendanceRecord[]): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    records.forEach(newRecord => {
        // Robust check: Normalize undefined/null to empty string for comparison
        // This ensures that if we are updating a general attendance (no subject), it matches correctly even if the previous record had undefined vs null.
        const idx = attendanceRegistry.findIndex(r => 
            r.studentId === newRecord.studentId && 
            r.date === newRecord.date &&
            (r.subjectId || '') === (newRecord.subjectId || '')
        );
        
        const safeRecord = {
            ...newRecord,
            // Ensure unique ID for the record including subject if present
            id: `${newRecord.studentId}_${newRecord.date}${newRecord.subjectId ? `_${newRecord.subjectId}` : ''}`
        };

        if (idx >= 0) {
            attendanceRegistry[idx] = safeRecord;
        } else {
            attendanceRegistry.push(safeRecord);
        }
    });
    return true;
};


export const getNotifications = async (role?: UserRole, userCourseId?: string) => {
  await new Promise(r => setTimeout(r, 200));
  if (!role) return [...notifications];
  return notifications.filter(n => n.targetRoles.includes(role) && (!n.courseId || n.courseId === userCourseId)).sort((a,b) => b.date.localeCompare(a.date));
};
export const saveNotification = async (n: Notification) => { 
    const newN = {...n, id: Date.now().toString(), date: new Date().toISOString().split('T')[0]}; 
    notifications.unshift(newN); return newN; 
};
export const deleteNotification = async (id: string) => { 
    await new Promise(r => setTimeout(r, 200));
    const idx = notifications.findIndex(x => x.id === id);
    if (idx !== -1) notifications.splice(idx, 1);
    return true; 
};

export const getCalendarEvents = async () => { await new Promise(r => setTimeout(r, 200)); return [...calendarEvents].sort((a,b) => a.date.localeCompare(b.date)); };
export const saveCalendarEvent = async (e: CalendarEvent) => { 
    if(e.id) calendarEvents = calendarEvents.map(x => x.id === e.id ? e : x);
    else calendarEvents.push({...e, id: Date.now().toString()});
    return e;
};
export const deleteCalendarEvent = async (id: string) => { 
    await new Promise(r => setTimeout(r, 200));
    const idx = calendarEvents.findIndex(x => x.id === id);
    if (idx !== -1) calendarEvents.splice(idx, 1);
    return true; 
};