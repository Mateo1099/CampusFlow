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
    <div style={{
      padding: '24px',
      borderRadius: '16px',
      background: 'rgba(15, 15, 20, 0.95)',
      backdropFilter: 'blur(30px)',
      border: '1px solid rgba(0, 243, 255, 0.3)',
      width: '320px',
      boxShadow: '0 0 30px rgba(0, 243, 255, 0.2), 0 12px 40px rgba(0,0,0,0.5)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ textTransform: 'capitalize', margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
          {monthName} {currentMonth.getFullYear()}
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={prevMonth} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#00f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={18} /></button>
          <button type="button" onClick={nextMonth} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#00f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} /></button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, idx) => (
          <span key={`${d}-${idx}`} style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, paddingBottom: '8px' }}>{d}</span>
        ))}
        {days.map((d, i) => {
          const isSelected = d && selectedDate === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d).toISOString().split('T')[0];
          return (
            <div key={i} 
              onClick={() => d && handleDayClick(d)}
              style={{
                padding: '10px 0',
                fontSize: '0.85rem',
                cursor: d ? 'pointer' : 'default',
                borderRadius: '8px',
                background: isSelected ? '#00f3ff' : 'transparent',
                color: isSelected ? '#000' : '#ffffff',
                transition: 'all 0.2s',
                opacity: d ? 1 : 0,
                fontWeight: d ? '500' : '400'
              }}
              onMouseOver={(e) => {
                if (d && !isSelected) {
                  e.currentTarget.style.background = 'rgba(0, 243, 255, 0.15)';
                }
              }}
              onMouseOut={(e) => {
                if (d && !isSelected) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(0, 243, 255, 0.2)', paddingTop: '12px', textAlign: 'right' }}>
        <button type="button" onClick={onClose} style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', color: '#00f3ff', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s' }}>CERRAR</button>
      </div>
    </div>
  );
};

export default CustomCalendar;
