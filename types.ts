import React from 'react';

export enum UserRole {
  ALUMNO = 'Alumno',
  DOCENTE = 'Docente',
  PRECEPTOR = 'Preceptor',
  DIRECTIVO = 'Directivo',
  ADMIN = 'Administrador',
  OFICINA_ALUMNOS = 'Oficina Alumnos',
}

export interface User {
  id: string;
  dni: string;
  name: string;
  lastName: string;
  roles: UserRole[];
  avatarUrl?: string;
  password?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  enrollmentDate?: string; // Fecha de inscripción al establecimiento
  notes?: string;
  isActive?: boolean; // Nuevo campo para estado del usuario
  
  // Enrollment fields
  courseId?: string; 
  technicalGroup?: string; // e.g., "A", "B", "1", "2" for technical workshops
}

export interface Specialty {
  id: string;
  name: string; // ej: "Computación", "Electromecánica"
  description?: string;
}

export interface Course {
  id: string;
  name: string; // ej: "5° 1ra"
  specialtyId: string; // Relación con Specialty
  shift: 'Mañana' | 'Tarde' | 'Vespertino';
  classrooms?: string;
  preceptorIds?: string[]; // Changed to array: Multiple preceptors per course
}

export type SubjectCycle = 'Ciclo Básico' | 'Ciclo Superior';
export type FormationArea = 'Formación General' | 'Formación Científico Tecnológica' | 'Formación Técnico Específica';
export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

export interface ClassSchedule {
  day: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

// Nueva interfaz para la definición abstracta de la materia
export interface SubjectDefinition {
  id: string;
  name: string;
  hours: number;
  curriculumDesign: string; // Campo memo
  cycle: SubjectCycle;
  formationArea: FormationArea;
}

export interface SubjectGroup {
  id: string;
  name: string; // ej: "Grupo A"
  teacherId?: string;
  teacherCondition?: 'Titular' | 'Provisional' | 'Suplente';
  schedules?: ClassSchedule[]; // Horarios específicos del grupo
}

export interface SubstituteAssignment {
  teacherId: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  name: string; // ej: "Matemática"
  year: string; // ej: "1er Año"
  hours: number; // Carga horaria semanal
  curriculumDesign: string; // Observaciones/Diseño curricular
  formationArea?: FormationArea; // To determine rendering logic (Groups vs Single)
  
  // Docentes (Single - General/Scientific)
  teacherId?: string; 
  teacherCondition?: 'Titular' | 'Provisional' | 'Suplente';
  schedules?: ClassSchedule[]; // Horarios generales (si no tiene grupos)
  isOnLeave?: boolean; 
  substitutes?: SubstituteAssignment[]; // Changed from string[] to object array

  // Docentes (Groups - Technical Specific)
  groups?: SubjectGroup[];

  // Relación con Curso
  courseId?: string;
}

// Interfaz para el Boletín de Calificaciones
export interface StudentGrade {
  subjectId: string;
  subjectName: string;
  // 1° Cuatrimestre
  valParcial1: string; // TEA, TEP, TED o numérico
  calificacion1: number | string | null;
  intensificacion1: number | string | null;
  
  // 2° Cuatrimestre
  valParcial2: string;
  calificacion2: number | string | null;
  intensificacion1_en_2: number | string | null; // Intensificación 1° Cuat en 2° periodo
  intensificacion2: number | string | null;

  // Finales
  intensificacionDic: number | string | null;
  intensificacionFeb: number | string | null;
  calificacionFinal: number | string | null;
}

export type AttendanceStatus = 'Presente' | 'Ausente' | 'Tarde' | 'Justificado';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  subjectId?: string; // Added to distinguish attendance by subject
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  targetRoles: UserRole[]; // Roles a los que va dirigido
  senderName: string;
  priority: 'Normal' | 'Alta';
  courseId?: string; // Nuevo campo: Si está presente, es un mensaje específico para un curso
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'Feriado' | 'Examen' | 'Acto' | 'Reunión' | 'Institucional';
  description?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  id: string;
}