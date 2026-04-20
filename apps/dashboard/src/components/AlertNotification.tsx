import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';

export interface ImmersiveAlert {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface AlertManagerProps {
  alerts: ImmersiveAlert[];
  onDismiss: (id: string) => void;
}

const alertConfig = {
  error: {
    icon: AlertCircle,
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    accentColor: '#ff5451',
  },
  warning: {
    icon: Zap,
    bgGradient: 'from-orange-500/20 to-orange-600/20',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
    accentColor: '#f59e0b',
  },
  success: {
    icon: CheckCircle,
    bgGradient: 'from-emerald-500/20 to-emerald-600/20',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400',
    accentColor: '#4ae176',
  },
  info: {
    icon: Info,
    bgGradient: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    accentColor: '#adc6ff',
  },
};

export function AlertNotification({ alert, onDismiss }: { alert: ImmersiveAlert; onDismiss: (id: string) => void }) {
  const config = alertConfig[alert.type];
  const Icon = config.icon;

  useEffect(() => {
    if (alert.duration) {
      const timer = setTimeout(() => onDismiss(alert.id), alert.duration);
      return () => clearTimeout(timer);
    }
  }, [alert.id, alert.duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 100, y: -20 }}
      className={`bg-gradient-to-r ${config.bgGradient} border ${config.borderColor} backdrop-blur-md rounded-lg p-4 mb-3 cursor-pointer overflow-hidden`}
      onClick={() => onDismiss(alert.id)}
      whileHover={{ scale: 1.02 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      />

      <div className="relative z-10 flex items-start gap-3">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          <Icon className={`w-5 h-5 ${config.textColor} mt-0.5 flex-shrink-0`} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm ${config.textColor} mb-1`}>
            {alert.title}
          </h3>
          <p className="text-xs text-gray-300 opacity-90">
            {alert.message}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(alert.id);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-200"
        >
          ✕
        </motion.button>
      </div>

      {/* Progress bar */}
      {alert.duration && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r"
          style={{
            backgroundImage: `linear-gradient(to right, ${config.accentColor}, transparent)`,
          }}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: alert.duration / 1000 }}
        />
      )}
    </motion.div>
  );
}

export function AlertContainer({ alerts, onDismiss }: AlertManagerProps) {
  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm pointer-events-auto">
      <AnimatePresence>
        {alerts.map((alert) => (
          <AlertNotification
            key={alert.id}
            alert={alert}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook for managing alerts
export function useAlerts() {
  const [alerts, setAlerts] = useState<ImmersiveAlert[]>([]);

  const addAlert = (alert: Omit<ImmersiveAlert, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: ImmersiveAlert = { ...alert, id, duration: alert.duration || 5000 };
    setAlerts((prev) => [...prev, newAlert]);
    return id;
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return { alerts, addAlert, dismissAlert };
}
