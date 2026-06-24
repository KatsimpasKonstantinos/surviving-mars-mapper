import React from 'react';
import './DownloadPopup.css';

const DownloadPopup: React.FC = () => {
    return (
        <div className="download-popup" role="menu">
            <a
                href="/mars_data.csv"
                download="surviving_mars_relaunched.csv"
                className="popup-item"
                role="menuitem"
            >
                <svg className="popup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="8" y1="17" x2="16" y2="17" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="10 9 9 9 8 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="popup-text">
                    <span className="popup-title">CSV File</span>
                </div>
            </a>

            <a
                href="/mars_data.db"
                download="surviving_mars_relaunched.db"
                className="popup-item"
                role="menuitem"
            >
                <svg className="popup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="popup-text">
                    <span className="popup-title">SQLite Database</span>
                </div>
            </a>
        </div>
    );
};

export default DownloadPopup;