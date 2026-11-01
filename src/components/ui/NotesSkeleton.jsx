import React from 'react';
import { motion } from 'framer-motion';

/**
 * NotesSkeleton — Cyber Luxe skeleton for Notes (Apuntes) page.
 * Displays shimmering header, filter pills, and bento grid note cards.
 */
export default function NotesSkeleton() {
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
        duration: 2.3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div
      style={{
        padding: '32px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        width: '100%',
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
              width: '240px',
              height: '38px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          />
          <div
            style={{
              width: '320px',
              height: '18px',
              background: 'linear-gradient(135deg, rgba(0,243,255,0.12), rgba(0,243,255,0.04))',
              borderRadius: '8px',
              border: '1px solid rgba(0,243,255,0.1)'
            }}
          />
        </div>

        <div
          style={{
            width: '160px',
            height: '46px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.3) 0%, rgba(188, 19, 254, 0.3) 100%)',
            border: '1px solid rgba(0, 243, 255, 0.4)'
          }}
        />
      </motion.div>

      {/* Filter and Search Bar Skeleton */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={pulseVariants}
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            flex: '1 1 280px',
            height: '44px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: '100px',
              height: '38px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          />
        ))}
      </motion.div>

      {/* Bento Grid Notes Skeleton */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={shimmerVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '18px',
          width: '100%'
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            variants={pulseVariants}
            style={{
              padding: '24px',
              borderRadius: '20px',
              background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.6) 0%, rgba(10, 14, 26, 0.7) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div
              style={{
                width: '70%',
                height: '22px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)'
              }}
            />
            <div
              style={{
                width: '100%',
                height: '14px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            />
            <div
              style={{
                width: '85%',
                height: '14px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            />
            <div
              style={{
                width: '60%',
                height: '14px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <div
                style={{
                  width: '60px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'rgba(0, 243, 255, 0.12)'
                }}
              />
              <div
                style={{
                  width: '70px',
                  height: '20px',
                  borderRadius: '6px',
                  background: 'rgba(188, 19, 254, 0.12)'
                }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
