import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, WifiOff } from 'lucide-react'

const ReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  React.useEffect(() => {
    if (offlineReady) {
      toast('CampusFlow listo para funcionar sin conexión', {
        icon: <WifiOff size={18} color="#00f3ff" />,
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(0, 243, 255, 0.4)',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0, 243, 255, 0.15)'
        }
      })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady])

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, filter: 'blur(5px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(8, 11, 17, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(188, 19, 254, 0.5)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 10px 40px rgba(188, 19, 254, 0.25), inset 0 0 20px rgba(188, 19, 254, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '340px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #bc13fe 0%, #00f3ff 100%)',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(188, 19, 254, 0.4)',
              flexShrink: 0
            }}>
              <RefreshCw size={20} color="#fff" />
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.02em', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                Actualización Disponible
              </h4>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 500 }}>
                Hay una nueva versión de CampusFlow.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => updateServiceWorker(true)}
              style={{
                flex: 1,
                background: 'rgba(188, 19, 254, 0.15)',
                border: '1px solid rgba(188, 19, 254, 0.4)',
                color: '#fff',
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 0 10px rgba(188, 19, 254, 0.1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(188, 19, 254, 0.3)'
                e.currentTarget.style.boxShadow = '0 0 15px rgba(188, 19, 254, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(188, 19, 254, 0.15)'
                e.currentTarget.style.boxShadow = 'inset 0 0 10px rgba(188, 19, 254, 0.1)'
              }}
            >
              Actualizar ahora
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ReloadPrompt
