import React from 'react';
import { useTheme } from '../context/ThemeContext';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend = null }) {
  const { isDark } = useTheme();

  const colorMap = {
    blue: isDark ? 'from-sky-500/20 to-sky-600/5 text-sky-400 border-sky-500/30' : 'from-sky-50 to-sky-100/50 text-sky-700 border-sky-200 shadow-sm',
    green: isDark ? 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30' : 'from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200 shadow-sm',
    purple: isDark ? 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30' : 'from-purple-50 to-purple-100/50 text-purple-700 border-purple-200 shadow-sm',
    amber: isDark ? 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30' : 'from-amber-50 to-amber-100/50 text-amber-700 border-amber-200 shadow-sm',
    rose: isDark ? 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30' : 'from-rose-50 to-rose-100/50 text-rose-700 border-rose-200 shadow-sm',
    indigo: isDark ? 'from-indigo-500/20 to-indigo-600/5 text-indigo-400 border-indigo-500/30' : 'from-indigo-50 to-indigo-100/50 text-indigo-700 border-indigo-200 shadow-sm',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} p-5 border transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{title}</p>
          <p className={`mt-2 text-3xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
          {subtitle && (
            <p className={`mt-1 text-xs font-semibold flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
