"use client";

import { useSyncExternalStore } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const noopSubscribe = () => () => {};

// Recharts needs a real DOM box before it can measure, so charts render only after hydration.
function useChartReady() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const tooltipStyle = { background: "#102033", border: "none", borderRadius: 12, color: "white", fontSize: 12 };

export function TrendChart({ data, x = "date", lines }: { data: Record<string, string | number>[]; x?: string; lines: { key: string; color: string; name: string }[] }) {
  const ready = useChartReady();
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500">Not enough attendance history yet.</p>;
  if (!ready) return <div className="h-72" />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid stroke="#efeae2" vertical={false} />
          <XAxis dataKey={x} tick={{ fill: "#708093", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#708093", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {lines.map((line) => (
            <Area key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} fill={line.color} fillOpacity={0.16} strokeWidth={2.2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarBlock({ data, x = "name", y = "percentage", color = "#0e6e6a" }: { data: Record<string, string | number>[]; x?: string; y?: string; color?: string }) {
  const ready = useChartReady();
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500">No grouped attendance yet.</p>;
  if (!ready) return <div className="h-72" />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="#efeae2" vertical={false} />
          <XAxis dataKey={x} tick={{ fill: "#708093", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={data.length > 4 ? -18 : 0} height={data.length > 4 ? 60 : 30} />
          <YAxis tick={{ fill: "#708093", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey={y} fill={color} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE = ["#0e6e6a", "#c2410c", "#9f1239", "#a78462", "#36567a"];

export function StatusPie({ data }: { data: { name: string; value: number }[] }) {
  const ready = useChartReady();
  const visible = data.filter((item) => item.value > 0);
  if (!ready) return <div className="h-72" />;
  if (!visible.length) return <p className="py-10 text-center text-sm text-slate-500">No status mix yet.</p>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={visible} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
            {visible.map((entry, index) => <Cell key={entry.name} fill={PIE[index % PIE.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
