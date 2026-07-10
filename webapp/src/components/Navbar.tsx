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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement | null>(null);
    // 1. Create a new ref for the entire navbar
    const navRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        document.documentElement.classList.toggle("light", isLightMode);
        localStorage.setItem("theme", isLightMode ? "light" : "dark");
    }, [isLightMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close the download popup if clicking outside of it
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDownloadPopupVisible(false);
            }

            // 2. Close the mobile menu if clicking outside the entire navbar
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <header className="navbar-wrapper">
            {/* 3. Attach the ref to the nav element */}
            <nav className="navbar" ref={navRef}>
                <div className="navbar-header">
                    <Link to="/" className="navbar-logo" onClick={closeMobileMenu}>
                        <h1>Surviving Mars Mapper</h1>
                    </Link>

                    <button
                        className="hamburger-btn"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle navigation menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
                        </svg>
                    </button>
                </div>

                <div className={`right-section ${isMobileMenuOpen ? 'open' : ''}`}>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                        end
                        onClick={closeMobileMenu}
                    >
                        Map
                    </NavLink>

                    <NavLink
                        to="/finder"
                        className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                        onClick={closeMobileMenu}
                    >
                        Finder
                    </NavLink>

                    <NavLink
                        to="/breakthrough"
                        className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                        onClick={closeMobileMenu}
                    >
                        Breakthrough
                    </NavLink>

                    <NavLink
                        to="/faq"
                        className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}
                        onClick={closeMobileMenu}
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
                        onClick={closeMobileMenu}
                    >
                        Other Projects
                    </a>

                    <a
                        href="https://github.com/KatsimpasKonstantinos/surviving-mars-mapper"
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