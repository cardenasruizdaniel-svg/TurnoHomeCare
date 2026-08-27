import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend = null }) {
  const colorMap = {
    blue: 'from-sky-500/20 to-sky-600/5 text-sky-400 border-sky-500/30',
    green: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30',
    rose: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30',
    indigo: 'from-indigo-500/20 to-indigo-600/5 text-indigo-400 border-indigo-500/30',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} p-5 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold font-display text-white tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-inner">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
