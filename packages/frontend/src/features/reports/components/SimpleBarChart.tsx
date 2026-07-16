import { Typography } from 'antd';

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  title?: string;
  color?: string;
  height?: number;
}

export const SimpleBarChart = ({
  data,
  title,
  color = '#1B73E8',
  height = 200,
}: Props) => {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      {title && (
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          {title}
        </Typography.Text>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height,
          padding: '0 4px',
        }}
      >
        {data.map((d, i) => {
          const barHeight = Math.max((d.value / maxVal) * (height - 30), 2);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: '#666',
                  marginBottom: 2,
                }}
              >
                {d.value}
              </span>
              <div
                style={{
                  width: '80%',
                  maxWidth: 40,
                  height: barHeight,
                  background: color,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.3s',
                }}
                title={`${d.label}: ${d.value}`}
              />
              <span
                style={{
                  fontSize: 9,
                  color: '#999',
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  textAlign: 'center',
                }}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface PieDataPoint {
  label: string;
  value: number;
  color: string;
}

interface PieProps {
  data: PieDataPoint[];
  title?: string;
  size?: number;
}

const PIE_COLORS = ['#1B73E8', '#34A853', '#EA4335', '#FBBC04', '#9334E6', '#FF6D01', '#46BDC6', '#7BAAF7'];

export const SimplePieChart = ({ data, title, size = 160 }: PieProps) => {
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const coloredData = data.map((d, i) => ({
    ...d,
    color: d.color || PIE_COLORS[i % PIE_COLORS.length],
  }));

  let cumulativePercent = 0;
  const slices = coloredData.map((d) => {
    const percent = d.value / total;
    const startAngle = cumulativePercent * 360;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 360;
    return { ...d, percent, startAngle, endAngle };
  });

  const r = size / 2;
  const cx = r;
  const cy = r;

  return (
    <div>
      {title && (
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          {title}
        </Typography.Text>
      )}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s, i) => {
            const startRad = ((s.startAngle - 90) * Math.PI) / 180;
            const endRad = ((s.endAngle - 90) * Math.PI) / 180;
            const largeArc = s.endAngle - s.startAngle > 180 ? 1 : 0;
            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);
            if (s.percent >= 0.999) {
              return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} />;
            }
            return (
              <path
                key={i}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={s.color}
              />
            );
          })}
        </svg>
        <div style={{ fontSize: 12 }}>
          {coloredData.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span>{d.label}: {d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
