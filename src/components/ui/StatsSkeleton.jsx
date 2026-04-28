import React from 'react';
import { motion } from 'framer-motion';

/**
 * StatsSkeleton - Premium glass skeleton loading UI for Stats/Analítica
 * 
 * Features:
 * - Glass metric card placeholders
 * - Chart area skeletons
 * - Insights section skeleton
 * - Soft shimmer and pulse animations
 * - Matches CampusFlow dark cyber-luxe aesthetic
 */
const StatsSkeleton = () => {
  const shimmerVariants = {
    initial: { opacity: 0.7 },
    animate: {
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const pulseVariants = {
    initial: { opacity: 0.6 },
    animate: {
      opacity: [0.6, 0.8, 0.6],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div style={{ padding: '32px 40px', height: '100%', overflowY: 'auto' }}>
      {/* Page Title Skeleton */}
      <motion.div initial="initial" animate="animate" variants={shimmerVariants} style={{ marginBottom: '32px' }}>
        <div style={{
          width: '280px',
          height: '52px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '12px'
        }} />
        <div style={{
          width: '340px',
          height: '24px',
          background: 'linear-gradient(135deg, rgba(0,194,255,0.12), rgba(0,194,255,0.05))',
          borderRadius: '12px',
          border: '1px solid rgba(0,194,255,0.1)'
        }} />
      </motion.div>

      {/* Main Metric Cards Grid */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={shimmerVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            variants={pulseVariants}
            style={{
              minHeight: '160px',
              background: 'linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 30px rgba(0,0,0,0.2)',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Icon and title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: '80px',
                height: '14px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '7px'
              }} />
              <div style={{
                width: '20px',
                height: '20px',
                background: 'rgba(0,243,255,0.15)',
                borderRadius: '6px'
              }} />
            </div>

            {/* Main value */}
            <div style={{
              width: '90px',
              height: '32px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              marginBottom: '4px'
            }} />

            {/* Helper text */}
            <div style={{
              width: '110px',
              height: '12px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '6px'
            }} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={shimmerVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        {/* Weekly Minutes Chart Skeleton */}
        <motion.div
          variants={pulseVariants}
          style={{
            background: 'linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 30px rgba(0,0,0,0.2)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: '280px'
          }}
        >
          {/* Chart title */}
          <div style={{
            width: '180px',
            height: '18px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '9px'
          }} />

          {/* Chart area */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            gap: '12px',
            paddingTop: '20px'
          }}>
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day, idx) => (
              <div
                key={day}
                style={{
                  width: '100%',
                  height: `${Math.random() * 140 + 40}px`,
                  background: `linear-gradient(180deg, rgba(0,243,255,0.15), rgba(0,243,255,0.05))`,
                  borderRadius: '12px 12px 0 0',
                  border: '1px solid rgba(0,243,255,0.15)',
                  opacity: 0.7
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Time Distribution Skeleton */}
        <motion.div
          variants={pulseVariants}
          style={{
            background: 'linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 30px rgba(0,0,0,0.2)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Chart title */}
          <div style={{
            width: '200px',
            height: '18px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '9px'
          }} />

          {/* Pie chart placeholder */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px'
          }}>
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(0,243,255,0.2), rgba(255,179,71,0.15), rgba(141,125,255,0.15))',
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 0 30px rgba(0,243,255,0.1)'
            }} />
          </div>
        </motion.div>
      </motion.div>

      {/* Insights Section */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={shimmerVariants}
        style={{
          background: 'linear-gradient(155deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 30px rgba(0,0,0,0.2)',
          padding: '24px'
        }}
      >
        {/* Section title */}
        <div style={{
          width: '160px',
          height: '18px',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: '9px',
          marginBottom: '16px'
        }} />

        {/* Insight items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={pulseVariants}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                minWidth: '24px',
                background: 'rgba(0,243,255,0.15)',
                borderRadius: '8px'
              }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{
                  width: '70%',
                  height: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px'
                }} />
                <div style={{
                  width: '90%',
                  height: '10px',
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: '5px'
                }} />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Shimmer overlay effect */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 0%', '100% 0%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent, rgba(0,243,255,0.1), transparent)',
          backgroundSize: '200% 100%',
          zIndex: 1,
          opacity: 0.3,
        }}
      />
    </div>
  );
};

export default StatsSkeleton;
