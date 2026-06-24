import { useEffect, useState, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';
import DownloadPopup from './DownloadPopup';
import './Navbar.css';

function Navbar() {
    const [isLightMode, setIsLightMode] = useState(() => {
        return localStorage.getItem("theme") === "light";
    });

    const [downloadPopupVisible, setDownloadPopupVisible] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        document.documentElement.classList.toggle("light", isLightMode);
        localStorage.setItem("theme", isLightMode ? "light" : "dark");
    }, [isLightMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDownloadPopupVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="navbar-wrapper">
            <nav className="navbar">
                <Link to="/" className="navbar-logo">
                    <h1>Surviving Mars Mapper</h1>
                </Link>

                <div className="right-section">
                    
                    <NavLink 
                        to="/" 
                        className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                        end
                    >
                        Map
                    </NavLink>

                    <NavLink 
                        to="/finder" 
                        className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                    >
                        Finder
                    </NavLink>
                    
                    <NavLink 
                        to="/faq" 
                        className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                    >
                        FAQ
                    </NavLink>

                    <div className="dropdown-container" ref={dropdownRef}>
                        <button
                            onClick={() => setDownloadPopupVisible(!downloadPopupVisible)}
                            aria-expanded={downloadPopupVisible}
                            aria-haspopup="true"
                            className="nav-button"
                        >
                            Download
                        </button>
                        {downloadPopupVisible && <DownloadPopup />}
                    </div>

                    <a
                        className="nav-button"
                        href="https://konsti.zip/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Other Projects
                    </a>

                    <a
                        href="https://github.com/your-username/your-repo"
                        className="github-icon"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View Surviving Mars Mapper source code on GitHub"
                        title="View Source Code"
                    >
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                    </a>

                    <DarkModeToggle
                        checked={isLightMode}
                        onChange={() => setIsLightMode(!isLightMode)}
                    />
                </div>
            </nav>
        </header>
    );
}

export default Navbar;