import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CustomCalendar = ({ selectedDate, onDateSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handleDayClick = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(date.toISOString().split('T')[0]);
    onClose();
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));

  const totalDays = daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const startDay = firstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });
  const days = [];
  
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  return (
    <div className="glass-panel animate-fade-in calendar-picker" style={{
      padding: '24px', position: 'absolute', top: '100%', left: 0, zIndex: 1000,
      width: '320px', marginTop: '10px', backdropFilter: 'blur(60px)', 
      background: 'var(--bg-secondary)', border: '1px solid var(--border-glass-top)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ textTransform: 'capitalize', margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {monthName} {currentMonth.getFullYear()}
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={prevMonth} className="btn-icon" style={{ padding: '6px' }}><ChevronLeft size={18} /></button>
          <button type="button" onClick={nextMonth} className="btn-icon" style={{ padding: '6px' }}><ChevronRight size={18} /></button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
          <span key={d} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, paddingBottom: '8px' }}>{d}</span>
        ))}
        {days.map((d, i) => (
          <div key={i} 
            onClick={() => d && handleDayClick(d)}
            style={{
              padding: '10px 0', fontSize: '0.85rem', cursor: d ? 'pointer' : 'default',
              borderRadius: '12px',
              background: d && selectedDate === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).toISOString().split('T')[0] ? 'var(--accent-primary)' : 'transparent',
              color: d && selectedDate === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).toISOString().split('T')[0] ? '#000' : 'var(--text-primary)',
              transition: 'all 0.2s',
              opacity: d ? 1 : 0
            }}
            onMouseOver={(e) => d && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseOut={(e) => d && (e.currentTarget.style.background = d && selectedDate === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).toISOString().split('T')[0] ? 'var(--accent-primary)' : 'transparent')}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-glass-top)', paddingTop: '12px', textAlign: 'right' }}>
        <button type="button" onClick={onClose} style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>CERRAR</button>
      </div>
    </div>
  );
};

export default CustomCalendar;
