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

const COLORS = ["#e2481c", "#ef8a3c", "#0e8c74", "#3d53a8", "#b8790a", "#b5487f"];

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
              <stop offset="0%" stopColor="#e2481c" stopOpacity={0.34} />
              <stop offset="55%" stopColor="#ef8a3c" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#ef8a3c" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="breakStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2481c" />
              <stop offset="100%" stopColor="#f0872f" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#efe7db" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={18}
            tick={{ fill: "#9a8f83", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            tick={{ fill: "#9a8f83", fontSize: 11 }}
            tickFormatter={(value) => `${Number(value).toFixed(0)} kg`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e2481c", strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="url(#breakStroke)"
            strokeWidth={3.5}
            fill="url(#breakArea)"
            activeDot={{ r: 6, fill: "#ffffff", stroke: "#e2481c", strokeWidth: 3 }}
            dot={{ r: 2.5, fill: "#ffffff", stroke: "#e2481c", strokeWidth: 2 }}
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
              innerRadius="60%"
              outerRadius="84%"
              paddingAngle={2}
              cornerRadius={6}
              stroke="#fffdfa"
              strokeWidth={2.5}
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
        <BarChart data={visible} layout="vertical" margin={{ top: 8, right: 16, left: 6, bottom: 0 }} barCategoryGap="28%">
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2481c" />
              <stop offset="100%" stopColor="#f4a340" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#efe7db" strokeDasharray="4 6" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9a8f83", fontSize: 11 }}
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
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(226,72,28,.06)" }} />
          <Bar dataKey="kg" fill="url(#barFill)" radius={[0, 8, 8, 0]} background={{ fill: "#f4ede3", radius: 8 }} animationDuration={750} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
