import React from "react";

export interface StorageChartTable {
  name: string;
  count: number;
  color?: string;
}
interface StorageChartsProps {
  tables: StorageChartTable[];
  usageBytes?: number;
  quotaBytes?: number;
  formatBytes: (bytes: number) => string;
}
const COLORS = [
  "#171717",
  "#737373",
  "#a3a3a3",
  "#d4d4d4",
  "#8b5cf6",
  "#c4b5fd",
];
const polar = (cx: number, cy: number, r: number, a: number) => {
  const t = ((a - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
};
const arc = (cx: number, cy: number, r: number, start: number, end: number) => {
  const a = polar(cx, cy, r, end),
    b = polar(cx, cy, r, start);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 0 ${b.x} ${b.y}`;
};

export const StorageCharts: React.FC<StorageChartsProps> = ({
  tables,
  usageBytes = 0,
  quotaBytes = 0,
  formatBytes,
}) => {
  const active = tables.filter((t) => t.count > 0);
  const total = active.reduce((sum, t) => sum + t.count, 0);
  let angle = 0;
  const segments = active.map((t, i) => {
    const sweep = total ? (t.count / total) * 359.99 : 0;
    const result = {
      ...t,
      color: t.color || COLORS[i % COLORS.length],
      start: angle,
      end: angle + sweep,
    };
    angle += sweep;
    return result;
  });
  const top = [...tables].sort((a, b) => b.count - a.count).slice(0, 6);
  const max = Math.max(1, ...top.map((t) => t.count));
  const percent =
    quotaBytes > 0 ? Math.min(100, (usageBytes / quotaBytes) * 100) : 0;
  return (
    <section
      className="sm-chart-grid"
      aria-label="Визуальная статистика хранилища"
    >
      <article className="sm-card">
        <div className="sm-card-heading">
          <div>
            <h4>Распределение записей</h4>
            <p>По таблицам IndexedDB</p>
          </div>
          <span className="sm-badge">
            {total.toLocaleString("ru-RU")} записей
          </span>
        </div>
        {!total ? (
          <div className="sm-empty">Пока нет записей для диаграммы</div>
        ) : (
          <>
            <svg
              className="sm-chart-svg"
              viewBox="0 0 240 190"
              role="img"
              aria-label={`Всего записей: ${total}`}
            >
              {segments.map((s) => (
                <path
                  key={s.name}
                  d={arc(120, 88, 58, s.start, s.end)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="18"
                >
                  <title>
                    {s.name}: {s.count}
                  </title>
                </path>
              ))}
              <text
                x="120"
                y="84"
                textAnchor="middle"
                fontSize="23"
                fontWeight="650"
                fill="currentColor"
              >
                {total.toLocaleString("ru-RU")}
              </text>
              <text
                x="120"
                y="103"
                textAnchor="middle"
                className="sm-chart-label"
              >
                записей
              </text>
            </svg>
            <div className="sm-chart-legend">
              {segments.map((s) => (
                <span className="sm-legend-item" key={s.name}>
                  <i
                    className="sm-legend-dot"
                    style={{ background: s.color }}
                  />
                  {s.name}: {s.count.toLocaleString("ru-RU")}
                </span>
              ))}
            </div>
          </>
        )}
      </article>
      <article className="sm-card">
        <div className="sm-card-heading">
          <div>
            <h4>Записи по таблицам</h4>
            <p>Топ-6 таблиц по количеству записей</p>
          </div>
        </div>
        <div
          className="sm-card-heading"
          style={{ marginTop: 16, marginBottom: 8 }}
        >
          <div>
            <h4>Использование хранилища браузера</h4>
            <p>Оценка браузера, не размер одной базы</p>
          </div>
          <strong>{quotaBytes > 0 ? `${percent.toFixed(1)}%` : "—"}</strong>
        </div>
        <div
          style={{
            height: 7,
            borderRadius: 999,
            overflow: "hidden",
            background: "var(--sm-muted)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percent}%`,
              background: "var(--sm-primary)",
              borderRadius: 999,
              transition: "width .25s ease",
            }}
          />
        </div>
        <div className="sm-chart-legend">
          <span>{formatBytes(usageBytes)} использовано</span>
          <span>
            {quotaBytes > 0
              ? `${formatBytes(quotaBytes)} оценочная квота`
              : "Квота недоступна"}
          </span>
        </div>
      </article>
    </section>
  );
};
