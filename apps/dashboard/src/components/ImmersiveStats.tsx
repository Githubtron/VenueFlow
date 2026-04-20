import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Users, Activity } from 'lucide-react';
import { ZoneSnapshot } from './ZoneHeatmap';

interface ImmersiveStatsProps {
  zones: ZoneSnapshot[];
  alerts: number;
  staffCount: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color,
  delay,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: number | string;
  unit?: string;
  trend?: { direction: 'up' | 'down'; percent: number };
  color: string;
  delay: number;
}) => {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    green: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
  };

  const iconColors = {
    blue: 'text-blue-400',
    red: 'text-red-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
  };

  const accentColors = {
    blue: '#adc6ff',
    red: '#ffb3ad',
    green: '#4ae176',
    amber: '#ffc689',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 100 }}
      className={`relative overflow-hidden rounded-lg p-6 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border cursor-pointer group`}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute -inset-full opacity-0 group-hover:opacity-20"
        animate={{
          background: [
            `radial-gradient(circle at 0% 0%, ${accentColors[color as keyof typeof accentColors]} 0%, transparent 50%)`,
            `radial-gradient(circle at 100% 100%, ${accentColors[color as keyof typeof accentColors]} 0%, transparent 50%)`,
            `radial-gradient(circle at 0% 0%, ${accentColors[color as keyof typeof accentColors]} 0%, transparent 50%)`,
          ],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Glass effect overlay */}
      <motion.div
        className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Icon className={`w-6 h-6 ${iconColors[color as keyof typeof iconColors]}`} />
          </motion.div>

          {trend && (
            <motion.div
              className={`flex items-center gap-1 text-xs font-bold ${trend.direction === 'up' ? 'text-red-400' : 'text-green-400'}`}
              animate={{
                y: trend.direction === 'up' ? [0, -2, 0] : [0, 2, 0],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <TrendingUp className={`w-3 h-3 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
              {trend.percent}%
            </motion.div>
          )}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {label}
        </p>

        <motion.div
          className="flex items-baseline gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
        >
          <motion.span
            className="text-3xl font-black text-white"
            key={value}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            {value}
          </motion.span>
          {unit && (
            <span className="text-xs text-gray-400 font-semibold">
              {unit}
            </span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export function ImmersiveStats({ zones, staffCount }: ImmersiveStatsProps) {
  const stats = useMemo(() => {
    const totalAttendees = zones.reduce((sum, z) => sum + z.currentCount, 0);
    const avgDensity = Math.round(
      zones.reduce((sum, z) => sum + z.densityPercent, 0) / zones.filter(z => z.status !== 'unavailable').length
    );
    const criticalZones = zones.filter(z => z.status === 'red').length;

    return { totalAttendees, avgDensity, criticalZones };
  }, [zones]);

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      <StatCard
        icon={Users}
        label="Total Attendees"
        value={stats.totalAttendees.toLocaleString()}
        color="blue"
        delay={0}
      />

      <StatCard
        icon={Activity}
        label="Avg Density"
        value={stats.avgDensity}
        unit="%"
        trend={{ direction: 'up', percent: Math.floor(Math.random() * 10) }}
        color="amber"
        delay={0.1}
      />

      <StatCard
        icon={AlertTriangle}
        label="Critical Zones"
        value={stats.criticalZones}
        trend={{ direction: 'down', percent: 5 }}
        color="red"
        delay={0.2}
      />

      <StatCard
        icon={Users}
        label="Active Staff"
        value={staffCount}
        color="green"
        delay={0.3}
      />
    </motion.div>
  );
}
