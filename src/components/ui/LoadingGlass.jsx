import React from 'react';

export const LoadingGlass = () => {
  return (
    <div className="loading-glass-container">
      <div className="loading-glass gamer-glow">
        {/* Animated spinner */}
        <div className="cyber-spinner">
          <div className="cyber-ring-outer"></div>
          <div className="cyber-ring-inner"></div>
          <div className="cyber-core"></div>
        </div>
        
        {/* Loading text */}
        <div className="loading-text">
          <span className="cyber-text">INICIANDO</span>
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
          min-height: 50vh;
        }

        .loading-glass {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          padding: 3rem 4rem;
          background: rgba(10, 15, 30, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 243, 255, 0.2);
          border-radius: 24px;
          box-shadow: 
            0 20px 50px rgba(0,0,0,0.5), 
            0 0 20px rgba(0, 243, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: fadeInGlass 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeInGlass {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .cyber-spinner {
          position: relative;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cyber-ring-outer {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid transparent;
          border-top: 2px solid #00f3ff;
          border-bottom: 2px solid rgba(0, 243, 255, 0.3);
          border-radius: 50%;
          animation: spinOuter 1.5s linear infinite;
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.4);
        }

        .cyber-ring-inner {
          position: absolute;
          width: 70%;
          height: 70%;
          border: 2px dashed rgba(255, 77, 77, 0.6);
          border-radius: 50%;
          animation: spinInner 2s linear infinite reverse;
        }

        .cyber-core {
          width: 25%;
          height: 25%;
          background: #00f3ff;
          border-radius: 50%;
          box-shadow: 0 0 20px #00f3ff, 0 0 40px #00f3ff;
          animation: pulseCore 1.2s ease-in-out infinite alternate;
        }

        @keyframes spinOuter {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes spinInner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulseCore {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.2); opacity: 1; }
        }

        .loading-text {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 1rem;
          font-weight: 800;
          color: #00f3ff;
          font-family: var(--font-display, 'Inter', sans-serif);
          letter-spacing: 0.2em;
          text-shadow: 0 0 10px rgba(0, 243, 255, 0.6);
        }

        .dots {
          display: inline-flex;
          gap: 0.2rem;
          min-width: 1.5rem;
        }

        .dots span {
          display: inline-block;
          width: 5px;
          height: 5px;
          background-color: #00f3ff;
          border-radius: 50%;
          box-shadow: 0 0 8px #00f3ff;
          animation: pulseDot 1.4s ease-in-out infinite;
        }

        .dots span:nth-child(1) { animation-delay: 0s; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulseDot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default LoadingGlass;
