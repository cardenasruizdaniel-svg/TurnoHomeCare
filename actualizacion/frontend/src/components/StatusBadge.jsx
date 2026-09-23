import React from 'react';

export function StatusBadge({ status }) {
  const configs = {
    ESPERANDO: {
      label: 'En Espera',
      bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    },
    LLAMADO: {
      label: 'Llamando',
      bg: 'bg-sky-500/20 text-sky-300 border-sky-400/40 animate-pulse'
    },
    EN_ATENCION: {
      label: 'En Atención',
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    },
    FINALIZADO: {
      label: 'Finalizado',
      bg: 'bg-slate-500/15 text-slate-400 border-slate-600/30'
    },
    NO_PRESENTO: {
      label: 'No se presentó',
      bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    CANCELADO: {
      label: 'Cancelado',
      bg: 'bg-zinc-500/15 text-zinc-400 border-zinc-600/30'
    },
    PAUSADO: {
      label: 'Pausado',
      bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
    }
  };

  const config = configs[status] || { label: status, bg: 'bg-slate-700 text-slate-300 border-slate-600' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}>
      {config.label}
    </span>
  );
}

export function TypeBadge({ type }) {
  if (type === 'PRIORITARIO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
        Prioritario (60+)
      </span>
    );
  }

  if (type === 'ESPECIAL') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
        Especial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
      Normal
    </span>
  );
}
