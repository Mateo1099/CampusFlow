import React from 'react';
import { motion } from 'framer-motion';

/**
 * PomodoroSkeleton — Cyber Luxe skeleton for Pomodoro / Study session page.
 * Displays shimmering glass timer ring, mode switchers, and controls.
 */
export default function PomodoroSkeleton() {
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
      opacity: [0.6, 0.85, 0.6],
      transition: {
        duration: 2.2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div
      style={{
        padding: '32px 24px',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        minHeight: '80vh',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Skeleton */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={shimmerVariants}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              width: '260px',
              height: '36px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          />
          <div
            style={{
              width: '180px',
              height: '18px',
              background: 'linear-gradient(135deg, rgba(0,243,255,0.12), rgba(0,243,255,0.04))',
              borderRadius: '8px',
              border: '1px solid rgba(0,243,255,0.1)'
            }}
          />
        </div>

        {/* Method selector skeleton */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '80px',
                height: '36px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Main Timer Dial Card */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={pulseVariants}
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '48px 32px',
          borderRadius: '32px',
          background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.7) 0%, rgba(10, 14, 26, 0.8) 100%)',
          border: '1px solid rgba(0, 243, 255, 0.2)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px'
        }}
      >
        {/* Mode chips */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '90px',
                height: '32px',
                borderRadius: '999px',
                background: i === 1 ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: i === 1 ? '1px solid rgba(0, 243, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)'
              }}
            />
          ))}
        </div>

        {/* Circular Dial Placeholder */}
        <div
          style={{
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            border: '6px solid rgba(0, 243, 255, 0.15)',
            boxShadow: '0 0 35px rgba(0, 243, 255, 0.15), inset 0 0 25px rgba(0, 243, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '160px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))'
            }}
          />
          <div
            style={{
              width: '100px',
              height: '16px',
              borderRadius: '8px',
              background: 'rgba(0, 243, 255, 0.12)'
            }}
          />
        </div>

        {/* Action Controls Skeleton */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
          <div
            style={{
              width: '140px',
              height: '54px',
              borderRadius: '27px',
              background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.3) 0%, rgba(188, 19, 254, 0.3) 100%)',
              border: '1px solid rgba(0, 243, 255, 0.4)'
            }}
          />
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
