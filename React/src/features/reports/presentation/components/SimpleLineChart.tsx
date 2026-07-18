export interface SimpleLineChartPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  points: SimpleLineChartPoint[];
  maxValue?: number;
  height?: number;
  valueSuffix?: string;
  emptyMessage?: string;
}

export function SimpleLineChart({
  points,
  maxValue,
  height = 180,
  valueSuffix = "",
  emptyMessage = "No trend data yet.",
}: SimpleLineChartProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const peak = Math.max(maxValue ?? 0, ...points.map((point) => point.value), 1);
  const paddingX = 28;
  const paddingTop = 24;
  const paddingBottom = 36;
  const chartWidth = Math.max(320, paddingX * 2 + (points.length - 1) * 56);
  const plotHeight = height - paddingTop - paddingBottom;
  const plotWidth = chartWidth - paddingX * 2;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? chartWidth / 2
        : paddingX + (index / (points.length - 1)) * plotWidth;
    const y = paddingTop + plotHeight - (point.value / peak) * plotHeight;
    return { x, y, ...point };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = [
    `M ${coords[0].x} ${paddingTop + plotHeight}`,
    ...coords.map((point) => `L ${point.x} ${point.y}`),
    `L ${coords[coords.length - 1].x} ${paddingTop + plotHeight}`,
    "Z",
  ].join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Line chart"
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="min-w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line
          x1={paddingX - 8}
          y1={paddingTop + plotHeight}
          x2={chartWidth - paddingX + 8}
          y2={paddingTop + plotHeight}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <path d={areaPath} fill="url(#lineFill)" />
        <path
          d={path}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r={4} fill="#2563eb" />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              className="fill-slate-700"
              fontSize={11}
              fontWeight={600}
            >
              {point.value}
              {valueSuffix}
            </text>
            <text
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize={10}
            >
              {point.label.length > 10
                ? `${point.label.slice(0, 9)}…`
                : point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
