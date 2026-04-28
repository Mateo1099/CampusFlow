import React from 'react';
import { motion } from 'framer-motion';

/**
 * WeeklyPlannerSkeleton - Premium glass skeleton loading UI for WeeklyPlanner
 * 
 * Features:
 * - Glass card placeholders with shimmer effect
 * - Header and metric cards skeletons
 * - Weekly grid with placeholder blocks
 * - Soft pulse animation matching CampusFlow theme
 */
const WeeklyPlannerSkeleton = () => {
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
      {/* Header Skeleton */}
      <motion.div initial="initial" animate="animate" variants={shimmerVariants} style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{
              width: '320px',
              height: '48px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '12px'
            }} />
            <div style={{
              width: '220px',
              height: '20px',
              background: 'linear-gradient(135deg, rgba(0,243,255,0.12), rgba(0,243,255,0.05))',
              borderRadius: '10px',
              border: '1px solid rgba(0,243,255,0.1)'
            }} />
          </div>
          <div style={{
            width: '140px',
            height: '44px',
            background: 'linear-gradient(135deg, rgba(0,243,255,0.12), rgba(0,243,255,0.05))',
            borderRadius: '50px',
            border: '1px solid rgba(0,243,255,0.15)'
          }} />
        </div>

        {/* Filter Buttons Skeleton */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              variants={pulseVariants}
              style={{
                width: '120px',
                height: '40px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Metric Cards Skeleton */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={shimmerVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '32px'
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            variants={pulseVariants}
            style={{
              height: '140px',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
              padding: '16px'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              background: 'rgba(0,243,255,0.15)',
              borderRadius: '8px',
              marginBottom: '12px'
            }} />
            <div style={{
              width: '60px',
              height: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              marginBottom: '8px'
            }} />
            <div style={{
              width: '40px',
              height: '24px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '6px'
            }} />
          </motion.div>
        ))}
      </motion.div>

      {/* Weekly Grid Skeleton */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={shimmerVariants}
        style={{
          borderRadius: '28px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          boxShadow: '0 34px 68px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
          padding: '12px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(118px, 142px) repeat(7, minmax(170px, 1fr))',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '8px'
          }}
        >
          {/* Header cells */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <motion.div
              key={`header-${i}`}
              variants={pulseVariants}
              style={{
                height: '72px',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            />
          ))}

          {/* Time blocks (3 rows × 8 columns) */}
          {[1, 2, 3].map((row) =>
            [1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
              <motion.div
                key={`block-${row}-${col}`}
                variants={pulseVariants}
                style={{
                  height: col === 1 ? '160px' : '190px',
                  background: col === 1
                    ? 'linear-gradient(145deg, rgba(0,243,255,0.12), rgba(0,243,255,0.05))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(12, 15, 24, 0.78))',
                  borderRadius: '20px',
                  border: col === 1
                    ? '1px solid rgba(0,243,255,0.15)'
                    : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {col !== 1 && (
                  <>
                    <div style={{
                      height: '8px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      width: '40%'
                    }} />
                    <div style={{
                      height: '6px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '3px',
                      width: '70%'
                    }} />
                    <div style={{
                      height: '6px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '3px',
                      width: '60%',
                      marginTop: '4px'
                    }} />
                  </>
                )}
              </motion.div>
            ))
          )}
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
          opacity: 0.4,
        }}
      />
    </div>
  );
};

export default WeeklyPlannerSkeleton;
