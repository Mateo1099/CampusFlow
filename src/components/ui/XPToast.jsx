import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowUpCircle } from 'lucide-react';

const XPToast = ({ amount, isLevelUp, newLevel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9, rotateX: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25,
        mass: 0.8 
      }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 24px',
        background: isLevelUp 
          ? 'linear-gradient(135deg, rgba(188, 19, 254, 0.15) 0%, rgba(0, 243, 255, 0.1) 100%)'
          : 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isLevelUp 
          ? '1px solid rgba(188, 19, 254, 0.5)'
          : '1px solid rgba(0, 243, 255, 0.3)',
        borderRadius: '20px',
        boxShadow: isLevelUp 
          ? '0 10px 40px rgba(188, 19, 254, 0.3), inset 0 0 20px rgba(188, 19, 254, 0.2)'
          : '0 8px 32px rgba(0, 243, 255, 0.15), inset 0 0 15px rgba(0, 243, 255, 0.05)',
        overflow: 'hidden'
      }}
    >
      {/* Liquid Glass Highlight */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '1px',
        background: isLevelUp 
          ? 'linear-gradient(90deg, transparent, rgba(188, 19, 254, 0.8), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.6), transparent)',
        zIndex: 1
      }} />

      {/* Shimmer Effect */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }}
        style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0, width: '30%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          transform: 'skewX(-20deg)',
          zIndex: 1
        }}
      />

      {/* Icon Area */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px', height: '44px',
        borderRadius: '50%',
        background: isLevelUp 
          ? 'linear-gradient(135deg, #bc13fe 0%, #00f3ff 100%)'
          : 'rgba(0, 243, 255, 0.1)',
        border: isLevelUp ? 'none' : '1px solid rgba(0, 243, 255, 0.4)',
        boxShadow: isLevelUp ? '0 0 20px rgba(188, 19, 254, 0.5)' : '0 0 15px rgba(0,243,255,0.4)',
        zIndex: 2,
        flexShrink: 0
      }}>
        {isLevelUp ? (
          <ArrowUpCircle size={24} color="#fff" />
        ) : (
          <Sparkles size={22} color="#00f3ff" />
        )}
      </div>

      {/* Content Area */}
      <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column' }}>
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{ 
            fontFamily: 'var(--font-display)',
            fontSize: isLevelUp ? '1.1rem' : '1rem',
            fontWeight: 800,
            color: '#fff',
            textShadow: isLevelUp ? '0 0 10px rgba(188, 19, 254, 0.8)' : '0 0 10px rgba(0, 243, 255, 0.8)',
            letterSpacing: '0.05em'
          }}
        >
          {isLevelUp ? '¡NUEVO NIVEL!' : '¡Misión Cumplida!'}
        </motion.span>
        
        <motion.span 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ 
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: 600,
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ 
            color: isLevelUp ? '#e879f9' : '#00f3ff', 
            fontWeight: 800 
          }}>
            +{amount} XP
          </span>
          {isLevelUp && (
            <span style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '2px 8px', 
              borderRadius: '10px',
              fontSize: '0.75rem',
              color: '#00f3ff'
            }}>
              Nivel {newLevel}
            </span>
          )}
        </motion.span>
      </div>

    </motion.div>
  );
};

export default XPToast;
