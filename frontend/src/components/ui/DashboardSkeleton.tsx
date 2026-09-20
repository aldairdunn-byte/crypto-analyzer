import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div
      data-testid="dashboard-skeleton"
      aria-label="Cargando panel de control..."
      className="flex-1 bg-[#060709] p-2.5 sm:p-4 max-w-6xl mx-auto w-full overflow-y-auto select-none space-y-3.5 content-bottom-pad animate-pulse"
    >
      {/* 0. Macro Sentiment Bar Skeleton */}
      <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-4 w-28 bg-white/10 rounded-md" />
          <div className="h-4 w-1 bg-white/10" />
          <div className="h-4 w-24 bg-white/10 rounded-md" />
          <div className="hidden sm:block h-4 w-1 bg-white/10" />
          <div className="hidden sm:block h-4 w-32 bg-white/10 rounded-md" />
        </div>
        <div className="h-5 w-24 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" />
      </div>

      {/* 1. AutoTrader Widget Skeleton */}
      <div className="bg-[#0D1117]/90 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-amber-400/20 rounded-full" />
            <div className="h-4 w-32 bg-white/15 rounded" />
          </div>
          <div className="h-6 w-20 bg-white/10 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="h-12 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-12 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-12 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-12 bg-white/5 rounded-xl border border-white/5" />
        </div>
      </div>

      {/* 3. Total Equity Card Skeleton */}
      <div className="bg-[#0D1117]/90 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-white/10 rounded" />
            <div className="h-8 w-48 bg-white/20 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-12 w-24 bg-white/5 rounded-xl" />
            <div className="h-12 w-24 bg-white/5 rounded-xl" />
            <div className="h-12 w-24 bg-white/5 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="h-14 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-14 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-14 bg-white/5 rounded-xl border border-white/5" />
          <div className="h-14 bg-white/5 rounded-xl border border-white/5" />
        </div>
      </div>

      {/* 4. Decision Heroes Grid Skeleton (3 columns on Desktop, 1 on Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="h-44 bg-[#0D1117]/80 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="h-4 w-24 bg-emerald-400/20 rounded" />
          <div className="h-6 w-32 bg-white/15 rounded" />
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="h-8 w-full bg-emerald-500/10 rounded-xl" />
        </div>
        <div className="h-44 bg-[#0D1117]/80 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="h-4 w-24 bg-amber-400/20 rounded" />
          <div className="h-6 w-32 bg-white/15 rounded" />
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="h-8 w-full bg-amber-500/10 rounded-xl" />
        </div>
        <div className="h-44 bg-[#0D1117]/80 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="h-4 w-24 bg-blue-400/20 rounded" />
          <div className="h-6 w-32 bg-white/15 rounded" />
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="h-8 w-full bg-blue-500/10 rounded-xl" />
        </div>
      </div>

      {/* 5. Market Overview Table Skeleton */}
      <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="h-5 w-40 bg-white/15 rounded" />
        <div className="space-y-2 pt-1">
          <div className="h-9 w-full bg-white/5 rounded-xl" />
          <div className="h-9 w-full bg-white/5 rounded-xl" />
          <div className="h-9 w-full bg-white/5 rounded-xl" />
          <div className="h-9 w-full bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
