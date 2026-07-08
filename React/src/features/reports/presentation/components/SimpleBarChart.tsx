export interface SimpleBarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  items: SimpleBarChartItem[];
  maxValue?: number;
  height?: number;
  valueSuffix?: string;
  emptyMessage?: string;
}

const DEFAULT_COLORS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#059669",
  "#ea580c",
];

export function SimpleBarChart({
  items,
  maxValue,
  height = 180,
  valueSuffix = "",
  emptyMessage = "No chart data yet.",
}: SimpleBarChartProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const peak = Math.max(
    maxValue ?? 0,
    ...items.map((item) => item.value),
    1,
  );
  const barWidth = 36;
  const gap = 18;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 36;
  const chartWidth = paddingX * 2 + items.length * barWidth + (items.length - 1) * gap;
  const chartHeight = height;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Bar chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="min-w-full"
        style={{ height }}
      >
        <line
          x1={paddingX - 8}
          y1={paddingTop + plotHeight}
          x2={chartWidth - paddingX + 8}
          y2={paddingTop + plotHeight}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        {items.map((item, index) => {
          const barHeight = (item.value / peak) * plotHeight;
          const x = paddingX + index * (barWidth + gap);
          const y = paddingTop + plotHeight - barHeight;
          const color = item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];

          return (
            <g key={`${item.label}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={6}
                fill={color}
                opacity={0.9}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-slate-700"
                fontSize={11}
                fontWeight={600}
              >
                {item.value}
                {valueSuffix}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight - 12}
                textAnchor="middle"
                className="fill-slate-500"
                fontSize={10}
              >
                {item.label.length > 10
                  ? `${item.label.slice(0, 9)}…`
                  : item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
