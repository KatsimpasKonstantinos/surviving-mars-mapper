import './Loading.css';

interface LoadingProps {
  /** 0–100. Leave out for an indeterminate bar (e.g. while a page's code loads). */
  progress?: number;
  messages?: string[];
}

function Loading({ progress, messages = [] }: LoadingProps) {
  const indeterminate = progress === undefined;
  let displayText = indeterminate ? 'Loading…' : `Loading map data... ${progress}%`;

  if (!indeterminate && messages.length > 0) {
    const messageIndex = Math.min(
      messages.length - 1,
      Math.floor((progress / 100) * messages.length),
    );
    displayText = `${messages[messageIndex]} (${progress}%)`;
  }

  return (
    <div className="loading-wrapper" role="status" aria-live="polite">
      <div className={`progress-container${indeterminate ? ' indeterminate' : ''}`}>
        <div
          className="progress-fill"
          style={indeterminate ? undefined : { width: `${progress}%` }}
        ></div>
      </div>
      <p className="progress-text">{displayText}</p>
    </div>
  );
}

export default Loading;
