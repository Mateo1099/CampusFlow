import React from 'react';
import { playClick } from '../../lib/audioService';

// Opciones y colores neón compartidos por los 3 filtros de institución
// (Dashboard, TaskBoard, Agenda). Antes cada página tenía su propia copia
// de este array y su propio mapeo de colores/frecuencias de sonido,
// ligeramente distintos entre sí; ahora viven en un solo lugar.
const INSTITUTION_FILTER_OPTIONS = ['TODAS', 'UNAD', 'SENA', 'PERSONALIZADO'];

const NEON_COLORS = {
  TODAS: '#00f3ff',
  UNAD: '#ffcc00',
  SENA: '#00ff88',
  PERSONALIZADO: '#bc13fe',
};

const CLICK_FREQUENCIES = {
  TODAS: 800,
  UNAD: 1000,
  SENA: 1200,
  PERSONALIZADO: 1500,
};

/**
 * Fila de filtros "neon-pills" para institución (TODAS/UNAD/SENA/PERSONALIZADO).
 * Componente compartido por Dashboard, TaskBoard y Agenda: antes cada página
 * tenía su propia copia casi idéntica de este bloque, lo que obligaba a tocar
 * 3 archivos para cualquier cambio de color, texto o comportamiento.
 *
 * @param {string} activeFilter - id del filtro actualmente seleccionado.
 * @param {(id: string) => void} onSelect - callback al elegir un filtro.
 * @param {object} [style] - estilos extra para el contenedor (ej. marginBottom).
 */
const InstitutionFilterPills = ({ activeFilter, onSelect, style }) => {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', ...style }}>
      {INSTITUTION_FILTER_OPTIONS.map(f => {
        const isActive = activeFilter === f;
        const neonColor = NEON_COLORS[f];

        return (
          <button
            key={f}
            onClick={() => {
              onSelect(f);
              playClick(CLICK_FREQUENCIES[f] || 800);
            }}
            style={{
              padding: '10px 24px',
              borderRadius: '50px',
              border: isActive ? `2px solid ${neonColor}` : '2px solid rgba(255,255,255,0.05)',
              background: isActive ? `${neonColor}15` : 'rgba(255,255,255,0.02)',
              color: isActive ? neonColor : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 900,
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isActive ? `0 0 20px ${neonColor}33, inset 0 0 10px ${neonColor}11` : 'none',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isActive ? neonColor : 'rgba(255,255,255,0.2)',
              boxShadow: isActive ? `0 0 10px ${neonColor}` : 'none'
            }} />
            {f}
          </button>
        );
      })}
    </div>
  );
};

export default InstitutionFilterPills;
