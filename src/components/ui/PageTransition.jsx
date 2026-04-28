import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageTransition - Wraps page content with subtle entrance animation only
 * 
 * Features:
 * - Subtle entrance: opacity 0.96→1, y: 4→0
 * - NO exit animation (prevents blink/flicker)
 * - Ultra-fast (0.18s) for smooth, stable navigation
 * - Respects prefers-reduced-motion for accessibility
 * - Zero performance impact on data fetching or routing
 */
const PageTransition = ({ children }) => {
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Animation variants - subtle entrance only
  const pageVariants = {
    initial: {
      opacity: prefersReducedMotion ? 1 : 0.96,
      y: prefersReducedMotion ? 0 : 4,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
  };

  // Transition config - ultra-fast and smooth
  const pageTransition = {
    duration: prefersReducedMotion ? 0 : 0.18,
    ease: 'easeOut',
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageVariants}
      transition={pageTransition}
      style={{
        width: '100%',
        height: '100%',
        // Avoid layout shift during animation
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
