'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SpendingChartProps {
  categoryTotals: Record<string, number>;
  totalSpending: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  housing: 'Rent & Housing',
  transport: 'Transport & Fuel',
  entertainment: 'Entertainment',
  utilities: 'Bills & Utilities',
  lodging: 'Hotel & Lodging',
  accommodation: 'Hotel & Lodging',
  shopping: 'Shopping & Groceries',
  general: 'General / Misc',
  others: 'General / Misc'
};

const SHORT_CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  housing: 'Housing',
  transport: 'Transport',
  entertainment: 'Entertainment',
  utilities: 'Bills/Utils',
  lodging: 'Lodging',
  accommodation: 'Lodging',
  shopping: 'Shopping',
  general: 'General',
  others: 'Others'
};

const DONUT_COLORS: Record<string, string> = {
  food: '#f97316',        // orange-500
  housing: '#3b82f6',     // blue-500
  transport: '#06b6d4',   // cyan-500
  entertainment: '#ec4899', // pink-500
  utilities: '#eab308',   // yellow-500
  lodging: '#10b981',     // emerald-500
  accommodation: '#10b981',
  shopping: '#a855f7',    // purple-500
  general: '#71717a',     // zinc-500
  others: '#71717a'
};

// Custom tooltip renderer for premium visual styling
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-3 shadow-lg text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
          <span>{data.name}</span>
        </div>
        <p className="font-semibold text-zinc-600 dark:text-zinc-400">
          Amount: <span className="font-extrabold text-zinc-900 dark:text-white">RM {data.value.toFixed(2)}</span>
        </p>
        <p className="text-[10px] text-zinc-400 font-medium">
          Share: <span className="font-bold text-emerald-500 dark:text-emerald-400">{data.percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function SpendingChart({ categoryTotals, totalSpending }: SpendingChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (totalSpending === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-zinc-400 text-sm">
        No spending logs available
      </div>
    );
  }

  // Parse chart data
  const data = Object.entries(categoryTotals)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => {
      const percentage = Math.round((value / totalSpending) * 100);
      return {
        key,
        name: CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
        value: Math.round(value * 100) / 100,
        percentage,
        color: DONUT_COLORS[key] || '#71717a'
      };
    })
    .sort((a, b) => b.value - a.value);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const activeSlice = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="space-y-4">
      {/* Recharts Container */}
      <div className="relative h-44 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                  style={{
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: '50% 50%',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Count Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center p-2">
          {activeSlice ? (
            <div className="flex flex-col items-center justify-center -space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[75px]" style={{ color: activeSlice.color }}>
                {SHORT_CATEGORY_LABELS[activeSlice.key] || activeSlice.name}
              </span>
              <span className="text-xs font-black text-zinc-950 dark:text-white leading-tight">
                RM {activeSlice.value.toFixed(2)}
              </span>
              <span className="text-[9px] font-extrabold text-emerald-500 dark:text-emerald-400">
                {activeSlice.percentage}%
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Total</span>
              <span className="text-sm font-black text-zinc-950 dark:text-white leading-none mt-0.5">
                RM {totalSpending.toFixed(0)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Legend Grid */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {data.map((entry, index) => {
          const isHighlighted = activeIndex === index;
          return (
            <div
              key={entry.key}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-2 rounded-lg p-1.5 transition cursor-pointer ${
                isHighlighted ? 'bg-zinc-100 dark:bg-white/5' : 'hover:bg-zinc-50 dark:hover:bg-white/5'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 transition"
                style={{
                  backgroundColor: entry.color,
                  transform: isHighlighted ? 'scale(1.25)' : 'scale(1)'
                }}
              />
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate w-24">
                {entry.name}
              </span>
              <span className="text-[10px] text-zinc-400 ml-auto shrink-0 font-bold">
                {entry.percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
