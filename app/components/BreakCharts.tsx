"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#e9562d", "#f4a340", "#4e8e78", "#5578ae", "#8d62b5", "#d36a8f"];

const weight = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { name?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  const title = payload[0]?.payload?.name || label || "";

  return (
    <div className="chart-tooltip">
      <span>{title}</span>
      <strong>{weight.format(value)} kg</strong>
    </div>
  );
}

export function BreakTrendChart({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="interactive-chart trend-chart" aria-label="Gráfico interativo de quebra por dia">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="breakArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e9562d" stopOpacity={0.32} />
              <stop offset="92%" stopColor="#e9562d" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ece9e4" strokeDasharray="4 5" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={18}
            tick={{ fill: "#898681", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            tick={{ fill: "#898681", fontSize: 11 }}
            tickFormatter={(value) => `${Number(value).toFixed(0)} kg`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e9562d", strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#e9562d"
            strokeWidth={3}
            fill="url(#breakArea)"
            activeDot={{ r: 6, fill: "#ffffff", stroke: "#e9562d", strokeWidth: 3 }}
            dot={{ r: 2.5, fill: "#ffffff", stroke: "#e9562d", strokeWidth: 2 }}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakDistributionChart({
  data,
}: {
  data: Array<{ name: string; kg: number }>;
}) {
  const visible = data.slice(0, 6);

  if (!visible.length) {
    return (
      <div className="chart-empty">
        <span>◎</span>
        <strong>Nenhuma quebra neste mês</strong>
        <small>Os produtos aparecerão após o primeiro lançamento.</small>
      </div>
    );
  }

  return (
    <div className="distribution-chart">
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="kg"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={3}
              cornerRadius={5}
            >
              {visible.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{visible.length}</strong>
          <span>carnes</span>
        </div>
      </div>
      <div className="chart-legend-list">
        {visible.map((item, index) => (
          <div key={item.name}>
            <i style={{ background: COLORS[index % COLORS.length] }} />
            <span title={item.name}>{item.name}</span>
            <strong>{weight.format(item.kg)} kg</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductBars({
  data,
}: {
  data: Array<{ name: string; kg: number }>;
}) {
  const visible = data.slice(0, 8).reverse();

  return (
    <div className="interactive-chart product-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={visible} layout="vertical" margin={{ top: 8, right: 16, left: 6, bottom: 0 }}>
          <CartesianGrid stroke="#eeece8" strokeDasharray="4 5" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#898681", fontSize: 11 }}
            tickFormatter={(value) => `${Number(value).toFixed(0)} kg`}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={150}
            tick={{ fill: "#4a4946", fontSize: 11 }}
            tickFormatter={(value) => String(value).slice(0, 22)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f6f3ee" }} />
          <Bar dataKey="kg" fill="#e9562d" radius={[0, 7, 7, 0]} animationDuration={750} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
