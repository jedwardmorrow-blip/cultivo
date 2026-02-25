interface RevenueSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function RevenueSparkline({ data, width = 80, height = 24, className = '' }: RevenueSparklineProps) {
  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-[9px] text-cult-medium-gray">--</span>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const firstHalf = data.slice(0, Math.ceil(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

  let color: string;
  const diff = secondAvg - firstAvg;
  const threshold = firstAvg * 0.05;

  if (diff > threshold) {
    color = '#34d399';
  } else if (diff < -threshold) {
    color = '#f87171';
  } else {
    color = '#fbbf24';
  }

  const gradientId = `spark-${data.join('-').replace(/\./g, '_')}`;

  const areaPoints = `${padding},${padding + chartHeight} ${points} ${width - padding},${padding + chartHeight}`;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
