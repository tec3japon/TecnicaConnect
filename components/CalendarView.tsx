import React, { useState } from 'react';
import { CalendarEvent } from '../types';

interface CalendarViewProps {
  events: CalendarEvent[];
  canEdit: boolean;
  onDateClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, canEdit, onDateClick, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Helper to get events for a specific day
  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
        case 'Feriado': return 'bg-red-100 text-red-700 border-red-200';
        case 'Examen': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'Acto': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Reunión': return 'bg-purple-100 text-purple-700 border-purple-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const renderCells = () => {
    const cells = [];
    
    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/30 border-r border-b border-slate-100"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      cells.push(
        <div 
            key={day} 
            onClick={() => canEdit && onDateClick(dateStr)}
            className={`min-h-[6rem] md:min-h-[8rem] p-2 border-r border-b border-slate-100 transition-colors relative group ${canEdit ? 'cursor-pointer hover:bg-brand-50/30' : ''} ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start">
             <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white' : 'text-slate-700'}`}>
                {day}
             </span>
             {canEdit && (
                 <span className="opacity-0 group-hover:opacity-100 text-xs text-brand-400 font-bold">+</span>
             )}
          </div>
          
          <div className="mt-2 space-y-1 overflow-y-auto max-h-[4.5rem] custom-scrollbar">
            {dayEvents.map(ev => (
                <div 
                    key={ev.id}
                    onClick={(e) => {
                        e.stopPropagation();
                        if(canEdit) onEventClick(ev);
                    }}
                    className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 ${getEventTypeColor(ev.type)}`}
                    title={`${ev.title} - ${ev.description || ''}`}
                >
                    {ev.type === 'Feriado' && '🇦🇷 '}
                    {ev.type === 'Examen' && '📝 '}
                    {ev.title}
                </div>
            ))}
          </div>
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 capitalize">
                {monthNames[month]} <span className="text-slate-400 font-normal">{year}</span>
            </h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button onClick={prevMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextMonth} className="p-1 hover:bg-white rounded shadow-sm text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
        <button onClick={goToday} className="text-sm font-medium text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors">
            Hoy
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {dayNames.map(day => (
            <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                {day}
            </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {renderCells()}
      </div>
    </div>
  );
};

export default CalendarView;