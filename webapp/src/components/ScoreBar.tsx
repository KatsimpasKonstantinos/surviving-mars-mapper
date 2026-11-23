import './ScoreBar.css';

/** A match value (0–100) on a bar, or a dash when there is none */
export default function ScoreBar({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="score-empty">–</span>;
  return (
    <div className="ScoreBar">
      <span className="score-bar-fill" style={{ inlineSize: `${value}%` }} />
      <span>{value.toFixed(1)}</span>
    </div>
  );
}
