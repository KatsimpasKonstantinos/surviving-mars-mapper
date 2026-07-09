import './Loading.css';

interface LoadingProps {
  progress?: number;
  messages?: string[];
}

function Loading({ progress = 0, messages = [] }: LoadingProps) {
  let displayText = `Loading map data... ${progress}%`;

  if (messages.length > 0) {
    let messageIndex = Math.floor((progress / 100) * messages.length);
    
    if (messageIndex >= messages.length) {
      messageIndex = messages.length - 1;
    }
    
    displayText = `${messages[messageIndex]} (${progress}%)`;
  }

  return (
    <div className="loading-wrapper">
      
      <div className="progress-container">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <p className="progress-text">{displayText}</p>
    </div>
  );
}

export default Loading;