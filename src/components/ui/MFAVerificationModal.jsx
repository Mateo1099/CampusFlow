import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MFAVerificationModal = ({ isOpen, onVerificationSuccess, userId }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Reset cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setSuccess('');
      setAttempt(0);
    }
  }, [isOpen]);

  // Limpieza automática de mensajes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Obtener factores MFA (TOTP)
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) throw factorsError;
      if (!factors?.totp?.length) {
        throw new Error('No se encontró factor TOTP. Habilita MFA primero.');
      }

      const totpFactor = factors.totp[0];

      // Crear challenge MFA
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });

      if (challengeError) throw challengeError;

      // Verificar el código
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) throw verifyError;

      setSuccess('✓ Verificación exitosa. Accediendo a la app...');
      setAttempt(0);

      // Callback después de 800ms
      setTimeout(() => {
        onVerificationSuccess();
      }, 800);

    } catch (err) {
      const newAttempt = attempt + 1;
      setAttempt(newAttempt);

      let errorMsg = err.message || 'Error verificando el código';
      
      // Mensajes más amigables
      if (errorMsg.includes('Invalid authentication code')) {
        errorMsg = 'Código incorrecto. Intenta de nuevo.';
      } else if (errorMsg.includes('Invalid TOTP code')) {
        errorMsg = 'Código expirado o inválido. Intenta con uno nuevo.';
      } else if (errorMsg.includes('No TOTP factor')) {
        errorMsg = 'MFA no está configurado correctamente.';
      }

      setError(errorMsg);
      setCode('');

      // Bloquea después de 5 intentos fallidos
      if (newAttempt >= 5) {
        setError('Demasiados intentos fallidos. Por favor, intenta más tarde.');
      }

      console.error('MFA Verification Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-2 dark:text-white">
              Verificación de Seguridad
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-6">
              Ingresa el código de 6 dígitos de tu autenticador para acceder a CampusFlow
            </p>

            {/* Intentos restantes */}
            {attempt > 0 && attempt < 5 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Intento {attempt} de 5
                </p>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              {/* Input de código */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  maxLength="6"
                  disabled={loading || attempt >= 5}
                  className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Mensajes de error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {/* Mensajes de éxito */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                </motion.div>
              )}

              {/* Botón de verificación */}
              <motion.button
                type="submit"
                disabled={loading || code.length !== 6 || attempt >= 5}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Verificar Código</span>
                )}
              </motion.button>
            </form>

            {/* Ayuda */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                ¿Necesitas ayuda? Abre tu aplicación autenticadora y copia el código actual
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MFAVerificationModal;
