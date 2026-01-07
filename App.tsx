import React, { useState } from 'react';
import { User, UserRole, AuthResponse } from './types';
import { login } from './services/authService';
import Dashboard from './components/Dashboard';
import Button from './components/Button';

// Application States
type AppState = 'LOGIN' | 'ROLE_SELECTION' | 'DASHBOARD';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LOGIN');
  const [user, setUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  
  // Login Form State
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response: AuthResponse = await login(dni, password);
      
      if (response.success && response.user) {
        setUser(response.user);
        
        // LOGIC: Check roles
        if (response.user.roles.length === 1) {
          // Only one role, go directly to dashboard
          setCurrentRole(response.user.roles[0]);
          setAppState('DASHBOARD');
        } else {
          // Multiple roles, go to selection screen
          setAppState('ROLE_SELECTION');
        }
      } else {
        setError(response.message || 'Error desconocido');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setCurrentRole(role);
    setAppState('DASHBOARD');
  };

  const handleChangeRole = () => {
    setAppState('ROLE_SELECTION');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentRole(null);
    setDni('');
    setPassword('');
    setAppState('LOGIN');
  };

  // -------------------------------------------------------------------------
  // Render: Login Screen (Modern Redesign)
  // -------------------------------------------------------------------------
  if (appState === 'LOGIN') {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-50 via-slate-50 to-indigo-50 z-0"></div>
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-200/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-indigo-200/40 rounded-full blur-3xl"></div>

        <div className="relative z-10 w-full max-w-5xl h-auto md:h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/50">
          
          {/* Left Side: Visual/Brand */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 p-12 text-white flex flex-col justify-between relative overflow-hidden">
             {/* Abstract Shapes overlay */}
             <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                </svg>
             </div>

             <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
                   <span className="text-2xl font-bold">TC</span>
                </div>
                <h1 className="text-4xl font-bold mb-4 leading-tight">Gestión Educativa Inteligente</h1>
                <p className="text-brand-100 text-lg">Conectando alumnos, docentes y directivos en una sola plataforma unificada.</p>
             </div>
             
             <div className="relative z-10 text-xs text-brand-200 mt-8 md:mt-0">
               © 2024 TecnicaConnect. V2.0
             </div>
          </div>

          {/* Right Side: Form */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Bienvenido de nuevo</h2>
              <p className="text-slate-500">Ingresa tus credenciales para acceder.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 ml-1">DNI / Usuario</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                     </svg>
                  </span>
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none text-slate-800"
                    placeholder="Ingrese su DNI"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 ml-1">Contraseña</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none text-slate-800"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center gap-3 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <Button type="submit" isLoading={isLoading} className="w-full py-3.5 text-lg mt-4">
                Ingresar a Plataforma
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Role Selection Screen (Modern Grid)
  // -------------------------------------------------------------------------
  if (appState === 'ROLE_SELECTION' && user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/50 via-slate-50 to-white z-0"></div>
        
        <div className="relative z-10 w-full max-w-4xl">
          <div className="text-center mb-12">
             <div className="inline-block p-1 bg-white rounded-full shadow-sm mb-4">
               <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full object-cover border-4 border-white" />
             </div>
            <h2 className="text-4xl font-bold text-slate-800 tracking-tight">Hola, {user.name}</h2>
            <p className="text-slate-500 mt-3 text-lg">¿Con qué perfil deseas operar hoy?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.roles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className="group relative bg-white p-8 rounded-3xl shadow-soft hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 border border-slate-100 hover:border-brand-200 text-left hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {role === UserRole.DOCENTE ? '📚' : 
                     role === UserRole.PRECEPTOR ? '📋' : 
                     role === UserRole.DIRECTIVO ? '📊' : 
                     role === UserRole.OFICINA_ALUMNOS ? '🗄️' :
                     role === UserRole.ADMIN ? '⚙️' : '🎓'}
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-brand-600 transition-colors">{role}</h3>
                
                <p className="text-slate-500 text-sm leading-relaxed">
                  {role === UserRole.DOCENTE ? 'Gestión académica, carga de notas y planificación.' : 
                   role === UserRole.PRECEPTOR ? 'Control de asistencia, conducta y comunicados.' : 
                   role === UserRole.DIRECTIVO ? 'Supervisión general y reportes estadísticos.' : 
                   role === UserRole.OFICINA_ALUMNOS ? 'Gestión de legajos, inscripciones y documentación.' :
                   role === UserRole.ADMIN ? 'Gestión de usuarios y configuración del sistema.' : 
                   'Acceso a calificaciones, material de estudio y asistencia.'}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
             <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors text-sm font-medium flex items-center justify-center gap-2 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
             </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Main Dashboard
  // -------------------------------------------------------------------------
  if (appState === 'DASHBOARD' && user && currentRole) {
    return (
      <Dashboard 
        user={user} 
        currentRole={currentRole} 
        onLogout={handleLogout}
        onChangeRole={handleChangeRole}
      />
    );
  }

  return null;
};

export default App;