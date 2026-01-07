import { User, UserRole, AuthResponse } from '../types';

const STORAGE_KEY = 'tecnicaconnect_users_data_v1';

// --- MOCK DATA GENERATION ---

// 1. Admin & Directors
const admins: User[] = [
  {
    id: 'admin-01',
    dni: '11111111',
    name: 'Administrador',
    lastName: 'Principal',
    roles: [UserRole.ADMIN],
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin+Principal&background=1e293b&color=fff',
    password: '111',
    email: 'admin@tecnicaconnect.edu.ar',
    notes: 'Cuenta de administrador por defecto.',
    enrollmentDate: '2020-01-15',
    isActive: true
  },
  {
    id: 'dir-01',
    dni: '33445566',
    name: 'Roberto',
    lastName: 'Sánchez',
    roles: [UserRole.DIRECTIVO],
    avatarUrl: 'https://ui-avatars.com/api/?name=Roberto+Sanchez&background=4338ca&color=fff',
    password: 'dir',
    email: 'direccion@tecnicaconnect.edu.ar',
    enrollmentDate: '2018-03-01',
    isActive: true
  }
];

// 1.5 Office Staff
const officeStaff: User[] = [
  {
    id: 'oficina-01',
    dni: '55555555',
    name: 'Patricia',
    lastName: 'Alvarez',
    roles: [UserRole.OFICINA_ALUMNOS],
    avatarUrl: 'https://ui-avatars.com/api/?name=Patricia+Alvarez&background=0d9488&color=fff',
    password: '123',
    email: 'alumnos@tecnicaconnect.edu.ar',
    notes: 'Encargada de legajos e inscripciones.',
    enrollmentDate: '2019-02-20',
    isActive: true
  }
];

// 2. Preceptors (5)
const preceptors: User[] = [
  { id: 'prec-01', dni: '20000001', name: 'María', lastName: 'González', roles: [UserRole.PRECEPTOR], email: 'maria.g@escuela.edu.ar', password: '123', enrollmentDate: '2021-03-01' },
  { id: 'prec-02', dni: '20000002', name: 'Jorge', lastName: 'Ramírez', roles: [UserRole.PRECEPTOR], email: 'jorge.r@escuela.edu.ar', password: '123', enrollmentDate: '2021-03-01' },
  { id: 'prec-03', dni: '20000003', name: 'Silvia', lastName: 'López', roles: [UserRole.PRECEPTOR], email: 'silvia.l@escuela.edu.ar', password: '123', enrollmentDate: '2022-02-15' },
  { id: 'prec-04', dni: '20000004', name: 'Esteban', lastName: 'Quito', roles: [UserRole.PRECEPTOR], email: 'esteban.q@escuela.edu.ar', password: '123', enrollmentDate: '2023-03-01' },
  { id: 'prec-05', dni: '20000005', name: 'Laura', lastName: 'Fernández', roles: [UserRole.PRECEPTOR], email: 'laura.f@escuela.edu.ar', password: '123', enrollmentDate: '2023-03-01' },
];

// 3. Teachers (10)
const teachers: User[] = [
  { id: 'prof-01', dni: '30000001', name: 'Alberto', lastName: 'Einstein', roles: [UserRole.DOCENTE], email: 'alberto.e@escuela.edu.ar', password: '123', enrollmentDate: '2015-03-01' }, // Física/Matemática
  { id: 'prof-02', dni: '30000002', name: 'Marie', lastName: 'Curie', roles: [UserRole.DOCENTE], email: 'marie.c@escuela.edu.ar', password: '123', enrollmentDate: '2016-04-10' }, // Química
  { id: 'prof-03', dni: '30000003', name: 'Isaac', lastName: 'Newton', roles: [UserRole.DOCENTE], email: 'isaac.n@escuela.edu.ar', password: '123', enrollmentDate: '2017-03-01' }, // Física
  { id: 'prof-04', dni: '30000004', name: 'Ada', lastName: 'Lovelace', roles: [UserRole.DOCENTE], email: 'ada.l@escuela.edu.ar', password: '123', enrollmentDate: '2019-02-28' }, // Computación
  { id: 'prof-05', dni: '30000005', name: 'Nikola', lastName: 'Tesla', roles: [UserRole.DOCENTE], email: 'nikola.t@escuela.edu.ar', password: '123', enrollmentDate: '2018-06-15' }, // Electromecánica
  { id: 'prof-06', dni: '30000006', name: 'Gabriela', lastName: 'Mistral', roles: [UserRole.DOCENTE], email: 'gabriela.m@escuela.edu.ar', password: '123', enrollmentDate: '2020-03-01' }, // Literatura
  { id: 'prof-07', dni: '30000007', name: 'Salvador', lastName: 'Dalí', roles: [UserRole.DOCENTE], email: 'salvador.d@escuela.edu.ar', password: '123', enrollmentDate: '2021-03-01' }, // Arte
  { id: 'prof-08', dni: '30000008', name: 'Steve', lastName: 'Jobs', roles: [UserRole.DOCENTE], email: 'steve.j@escuela.edu.ar', password: '123', enrollmentDate: '2022-03-01' }, // Taller
  { id: 'prof-09', dni: '30000009', name: 'Alan', lastName: 'Turing', roles: [UserRole.DOCENTE], email: 'alan.t@escuela.edu.ar', password: '123', enrollmentDate: '2019-08-01' }, // Lógica
  { id: 'prof-10', dni: '30000010', name: 'Frida', lastName: 'Kahlo', roles: [UserRole.DOCENTE], email: 'frida.k@escuela.edu.ar', password: '123', enrollmentDate: '2023-03-01' }, // Historia
];

// 4. Students (30)
const studentNames = [
  ['Juan', 'Pérez'], ['Ana', 'García'], ['Pedro', 'Rodríguez'], ['Lucía', 'Martínez'], ['Carlos', 'Sánchez'],
  ['Sofía', 'Díaz'], ['Miguel', 'Fernández'], ['Valentina', 'López'], ['David', 'Gómez'], ['Camila', 'Ruiz'],
  ['Javier', 'Alvarez'], ['Martina', 'Torres'], ['Diego', 'Romero'], ['Julia', 'Benítez'], ['Lucas', 'Acosta'],
  ['Mateo', 'Flores'], ['Zoe', 'Pereyra'], ['Bautista', 'Rojas'], ['Bianca', 'Molina'], ['Benjamín', 'Castro'],
  ['Delfina', 'Ortiz'], ['Joaquín', 'Silva'], ['Alma', 'Luna'], ['Tomás', 'Cabrera'], ['Morena', 'Ríos'],
  ['Santino', 'Ferreyra'], ['Mia', 'Godoy'], ['Facundo', 'Morales'], ['Emilia', 'Peralta'], ['Lautaro', 'Vega']
];

const students: User[] = studentNames.map((name, index) => {
  const courseIndex = Math.floor(index / 5) + 1; 
  const courseId = `C${courseIndex}`;
  const group = index % 3 === 0 ? 'A' : index % 3 === 1 ? 'B' : 'C';
  const year = 2022 + Math.floor(Math.random() * 3);
  const month = 1 + Math.floor(Math.random() * 3);
  const day = 1 + Math.floor(Math.random() * 28);
  const enrollmentDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (index === 0) {
      return {
        id: '1',
        dni: '12345678',
        name: name[0],
        lastName: name[1],
        roles: [UserRole.ALUMNO],
        email: `${name[0].toLowerCase()}.${name[1].toLowerCase()}@alumno.edu.ar`,
        password: 'password',
        courseId: 'C1',
        technicalGroup: 'A',
        enrollmentDate: '2024-03-01',
        avatarUrl: `https://ui-avatars.com/api/?name=${name[0]}+${name[1]}&background=0D8ABC&color=fff`
      };
  }

  return {
    id: `alu-${1000 + index}`,
    dni: (40000000 + index).toString(),
    name: name[0],
    lastName: name[1],
    roles: [UserRole.ALUMNO],
    email: `${name[0].toLowerCase()}.${name[1].toLowerCase()}@alumno.edu.ar`,
    password: '123',
    courseId: courseId,
    technicalGroup: group,
    enrollmentDate: enrollmentDate,
    avatarUrl: `https://ui-avatars.com/api/?name=${name[0]}+${name[1]}&background=random`
  };
});

const superUser: User = {
    id: 'super-01',
    dni: '22222222',
    name: 'Super',
    lastName: 'Usuario',
    roles: [UserRole.ADMIN, UserRole.DIRECTIVO, UserRole.PRECEPTOR, UserRole.DOCENTE, UserRole.ALUMNO, UserRole.OFICINA_ALUMNOS],
    email: 'super@tecnicaconnect.edu.ar',
    password: '222',
    avatarUrl: 'https://ui-avatars.com/api/?name=Super+Usuario&background=8b5cf6&color=fff',
    notes: 'Usuario multi-rol para pruebas.',
    courseId: 'C1',
    technicalGroup: 'A',
    enrollmentDate: '2020-01-01',
    isActive: true
};

// Data Storage Logic
let users: User[] = [];

const loadUsersFromStorage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            users = JSON.parse(stored);
        } else {
            // Initial Mock Data Load
            users = [
              ...admins,
              ...officeStaff,
              ...preceptors,
              ...teachers,
              ...students,
              superUser
            ].map(u => ({...u, isActive: u.isActive ?? true}));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        }
    } catch (e) {
        console.error("Error loading users from storage", e);
        users = [];
    }
};

// Load immediately
loadUsersFromStorage();

// Service Functions

export const login = async (dni: string, password: string): Promise<AuthResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  // Re-read storage on login to ensure freshness if modified elsewhere
  loadUsersFromStorage();

  const user = users.find((u) => u.dni === dni);

  if (!user) {
    return { success: false, message: 'DNI no encontrado.' };
  }

  if (user.isActive === false) {
      return { success: false, message: 'Usuario inactivo. Contacte a administración.' };
  }

  const storedPassword = user.password || '123';
  if (password !== storedPassword) {
    return { success: false, message: 'Contraseña incorrecta.' };
  }

  return { success: true, user };
};

export const getRoleDashboardInfo = (role: UserRole) => {
  switch (role) {
    case UserRole.ALUMNO: return { title: 'Portal del Alumno', theme: 'blue' };
    case UserRole.DOCENTE: return { title: 'Sala de Profesores', theme: 'emerald' };
    case UserRole.PRECEPTOR: return { title: 'Gestión de Asistencia', theme: 'amber' };
    case UserRole.DIRECTIVO: return { title: 'Dirección General', theme: 'indigo' };
    case UserRole.OFICINA_ALUMNOS: return { title: 'Administración de Alumnado', theme: 'teal' };
    case UserRole.ADMIN: return { title: 'Administración del Sistema', theme: 'slate' };
    default: return { title: 'Bienvenido', theme: 'gray' };
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...users];
};

export const saveUser = async (user: User): Promise<User> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (!user.avatarUrl) {
    user.avatarUrl = `https://ui-avatars.com/api/?name=${user.name}+${user.lastName}&background=random`;
  }

  const userToSave = { ...user, isActive: user.isActive ?? true };

  if (!userToSave.enrollmentDate) {
      userToSave.enrollmentDate = new Date().toISOString().split('T')[0];
  }

  if (existingIndex >= 0) {
    const existingUser = users[existingIndex];
    const passwordToSave = (user.password && user.password.trim() !== '') ? user.password : existingUser.password;
    users[existingIndex] = { ...userToSave, password: passwordToSave };
  } else {
    if (!user.password) userToSave.password = '123456';
    users.push(userToSave);
  }
  
  // Persist
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  
  return userToSave;
};

export const deleteUser = async (id: string): Promise<{ success: boolean, message?: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
      users.splice(idx, 1);
      // Persist
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      return { success: true };
  }
  return { success: false, message: 'Usuario no encontrado.' };
};
