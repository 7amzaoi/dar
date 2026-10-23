"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TimePoint } from "@/lib/data";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-soft)",
  fontSize: 12,
  color: "var(--popover-foreground)",
};

/** Charts stay left-to-right in both locales (time reads left → right by convention). */
export function AreaTrend({
  data,
  formatLabel = (l) => l,
  formatValue = (v) => String(v),
  height = 260,
  color = "var(--chart-1)",
}: {
  data: TimePoint[];
  formatLabel?: (label: string) => string;
  formatValue?: (v: number) => string;
  height?: number;
  color?: string;
}) {
  return (
    <div dir="ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis dataKey="label" tickFormatter={formatLabel} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} minTickGap={28} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={44} tickFormatter={(v: number) => formatValue(v)} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(l) => formatLabel(String(l))}
            formatter={(v) => [formatValue(Number(v)), ""]}
            separator=""
            cursor={{ stroke: "var(--border)" }}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.8} fill="url(#area-fill)" activeDot={{ r: 4, fill: color, stroke: "var(--background)", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Bars({
  data,
  formatLabel = (l) => l,
  formatValue = (v) => String(v),
  height = 260,
  color = "var(--chart-2)",
}: {
  data: TimePoint[];
  formatLabel?: (label: string) => string;
  formatValue?: (v: number) => string;
  height?: number;
  color?: string;
}) {
  return (
    <div dir="ltr" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis dataKey="label" tickFormatter={formatLabel} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={44} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => formatLabel(String(l))} formatter={(v) => [formatValue(Number(v)), ""]} separator="" cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal proportional bars — used for status / category breakdowns. */
export function BreakdownList({
  items,
  className,
}: {
  items: { key: string; label: string; value: number; display?: string; color?: string }[];
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-4", className)}>
      {items.map((item, i) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span>{item.label}</span>
            <span className="tabular-nums text-muted-foreground">{item.display ?? item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? `var(--chart-${(i % 5) + 1})` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
