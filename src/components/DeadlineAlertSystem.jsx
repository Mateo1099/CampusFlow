import React, { useEffect, useRef } from 'react';
import { useTasksContext } from '../context/TaskContext';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';

export default function DeadlineAlertSystem() {
  const { tasks } = useTasksContext();
  const { settings } = useSettings();
  const notifiedTasksRef = useRef(new Set()); // Keeps track of which tasks have been notified recently

  useEffect(() => {
    // Si las notificaciones in-app están desactivadas, no hacemos nada.
    if (settings.inAppAlertsEnabled === false) return;

    const checkDeadlines = () => {
      const now = new Date();

      tasks?.forEach(task => {
        // Ignorar tareas ya entregadas o sin fecha límite
        if (task.status === 'entregado' || !task.deadline) return;

        // Construir fecha exacta
        let deadlineStr = task.deadline;
        if (task.deadline_time) {
          deadlineStr = `${task.deadline}T${task.deadline_time}`;
        } else {
          deadlineStr = `${task.deadline}T23:59:59`; // Final del día por defecto
        }

        const deadlineDate = new Date(deadlineStr);
        if (isNaN(deadlineDate)) return;

        const msRemaining = deadlineDate.getTime() - now.getTime();
        const hoursRemaining = msRemaining / (1000 * 60 * 60);

        // Si ya pasó la fecha, no hacemos ruido de alerta in-app continua
        if (hoursRemaining < 0) return;

        let alertLevel = null;
        let alertKey = '';

        if (hoursRemaining <= 2) {
          alertLevel = 'CRÍTICO';
          alertKey = '2h';
        } else if (hoursRemaining <= 6) {
          alertLevel = 'ALTA';
          alertKey = '6h';
        } else if (hoursRemaining <= 24) {
          alertLevel = 'MODERADA';
          alertKey = '24h';
        }

        if (alertLevel) {
          const notificationId = `${task.id}-${alertKey}`;
          
          if (!notifiedTasksRef.current.has(notificationId)) {
            // Guardar para no repetir
            notifiedTasksRef.current.add(notificationId);
            
            // Mostrar Toast
            toast.custom((t) => (
              <div
                className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
                style={{
                  maxWidth: '400px',
                  width: '100%',
                  background: alertLevel === 'CRÍTICO' ? 'rgba(239, 68, 68, 0.95)' : 
                              alertLevel === 'ALTA' ? 'rgba(249, 115, 22, 0.95)' : 
                              'rgba(234, 179, 8, 0.95)',
                  backdropFilter: 'blur(10px)',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🚨 ALERTA {alertLevel}: ENTREGA PRÓXIMA
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>
                    Faltan menos de {alertKey} para entregar: <strong style={{color: '#fff'}}>{task.title}</strong>
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '12px'
                  }}
                >
                  ✕
                </button>
              </div>
            ), {
              duration: 8000,
              position: 'top-right',
            });
          }
        }
      });
    };

    // Revisión inicial y luego cada minuto
    checkDeadlines();
    const intervalId = setInterval(checkDeadlines, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [tasks, settings.inAppAlertsEnabled]);

  return null; // Componente lógico, no renderiza DOM
}
