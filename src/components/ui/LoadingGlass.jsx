import React from 'react';

export const LoadingGlass = () => {
  return (
    <div className="loading-glass-container">
      <div className="loading-glass">
        {/* Glassmorphism backdrop */}
        <div className="loading-backdrop"></div>
        
        {/* Animated spinner */}
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
        </div>
        
        {/* Loading text */}
        <div className="loading-text">
          <span>Cargando</span>
          <span className="dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>

      <style>{`
        .loading-glass-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 200px;
        }

        .loading-glass {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          padding: 3rem 4rem;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          box-shadow: 
            0 8px 32px rgba(31, 38, 135, 0.2),
            inset 0 0 32px rgba(255, 255, 255, 0.05);
          animation: fadeInGlass 0.4s ease-out;
        }

        @keyframes fadeInGlass {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .loading-spinner {
          position: relative;
          width: 48px;
          height: 48px;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid rgba(255, 255, 255, 0.15);
          border-top: 3px solid var(--accent-primary, #3b82f6);
          border-radius: 50%;
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-primary, #fff);
          font-family: var(--font-display, 'Inter', sans-serif);
          letter-spacing: 0.05em;
        }

        .dots {
          display: inline-flex;
          gap: 0.15rem;
          min-width: 1rem;
        }

        .dots span {
          display: inline-block;
          width: 4px;
          height: 4px;
          background-color: var(--accent-primary, #3b82f6);
          border-radius: 50%;
          animation: pulse 1.4s ease-in-out infinite;
        }

        .dots span:nth-child(1) {
          animation-delay: 0s;
        }

        .dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .loading-glass {
            padding: 2rem 2.5rem;
            gap: 1.5rem;
          }

          .loading-text {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingGlass;
