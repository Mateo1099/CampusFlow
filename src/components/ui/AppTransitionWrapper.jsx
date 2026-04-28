import React from 'react';
import { useLocation } from 'react-router-dom';
import PageTransition from './PageTransition';

/**
 * AppTransitionWrapper - Handles route transitions at the app level
 * Wraps entire route content (including login, mfa, etc.) for consistent transitions
 * 
 * Uses entrance-only animations to prevent blink/flicker effects
 * 
 * Usage: Wrap your Routes component with this component
 */
const AppTransitionWrapper = ({ children }) => {
  const location = useLocation();

  return (
    <PageTransition key={location.pathname}>
      {children}
    </PageTransition>
  );
};

export default AppTransitionWrapper;
