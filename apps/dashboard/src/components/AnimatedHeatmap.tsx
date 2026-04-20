import { motion } from 'framer-motion';
import { ZoneSnapshot } from './ZoneHeatmap';

interface AnimatedHeatmapProps {
  zones: ZoneSnapshot[];
}

const getGradientColor = (status: ZoneSnapshot['status']) => {
  switch (status) {
    case 'red':
      return 'from-red-600 to-red-400';
    case 'amber':
      return 'from-orange-600 to-orange-400';
    case 'green':
      return 'from-emerald-600 to-emerald-400';
    default:
      return 'from-gray-600 to-gray-400';
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 10,
    },
  },
};

export function AnimatedHeatmap({ zones }: AnimatedHeatmapProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      {zones.map((zone) => (
        <motion.div
          key={zone.zoneId}
          variants={itemVariants}
          animate={zone.status === 'red' ? 'pulse' : 'visible'}
          className={`relative overflow-hidden rounded-lg p-4 min-h-[140px] flex flex-col justify-between bg-gradient-to-br ${getGradientColor(zone.status)} cursor-pointer group`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Animated background shimmer */}
          <motion.div
            className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'loop',
            }}
            style={{ pointerEvents: 'none' }}
          />

          {/* Content */}
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xs font-black text-white/60 uppercase tracking-wider mb-2"
            >
              {zone.zoneId}
            </motion.div>

            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-sm font-bold text-white leading-tight mb-3"
            >
              {zone.name}
            </motion.h3>
          </div>

          <div className="relative z-10">
            <motion.div
              className="flex justify-between items-end mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.span
                className="text-2xl font-black text-white"
                key={zone.currentCount}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100 }}
              >
                {zone.currentCount.toLocaleString()}
              </motion.span>
              <span className="text-sm font-bold text-white/80">
                {zone.densityPercent}%
              </span>
            </motion.div>

            {/* Progress bar with animation */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${zone.densityPercent}%` }}
                transition={{
                  duration: 0.6,
                  type: 'spring',
                  stiffness: 60,
                }}
              />
            </div>
          </div>

          {/* Status indicator */}
          <motion.div
            className="absolute top-2 right-2 w-3 h-3 rounded-full bg-white/40"
            animate={{
              scale: zone.status === 'red' ? [1, 1.3, 1] : 1,
              opacity: zone.status === 'red' ? [0.4, 1, 0.4] : 0.4,
            }}
            transition={{
              duration: 0.8,
              repeat: zone.status === 'red' ? Infinity : 0,
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
