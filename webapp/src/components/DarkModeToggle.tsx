import "./DarkModeToggle.css";

type Props = {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function DarkModeToggle({ checked, onChange }: Props) {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isDarkMode = e.target.checked;
        localStorage.setItem("theme", isDarkMode ? "light" : "dark");
    
        onChange(e);
    };

    return (
        <label className="DarkModeToggle">
            <input
                type="checkbox"
                checked={checked}
                onChange={handleChange}
            />

            <svg viewBox="0 0 101 51" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <mask id="darkmode-toggle-mask">
                        <rect x="0" y="0" width="101" height="51" rx="25" fill="white" />
                        <circle
                            className="darkmode-hole"
                            cx="25"
                            cy="25.5"
                            r="20"
                            fill="black"
                        />
                    </mask>
                </defs>

                <rect
                    className="toggle-container"
                    x="0"
                    y="0"
                    width="100"
                    height="50"
                    rx="25"
                    fill={"var(--color-shadow)"}
                />

                <g className="toggle-stars">
                    <circle cx="70" cy="15" r="1.5" fill="white" />
                    <circle cx="80" cy="10" r="1.5" fill="white" />
                    <circle cx="85" cy="20" r="1.5" fill="white" />
                </g>

                <g className="toggle-cloud">
                    <ellipse cx="30" cy="30" rx="10" ry="6" fill="white" />
                    <ellipse cx="40" cy="28" rx="8" ry="5" fill="white" />
                </g>

                <g className="toggle-button">
                    <circle cx="25" cy="25" r="18" fill="#ffffff" />
                    <circle className="toggle-sun" cx="25" cy="25" r="18" fill="#f9d71c" />
                    <path
                        className="toggle-moon"
                        d="M28 17a8 8 0 1 0 0 16a10 10 0 1 1 0-16z"
                        fill="#dfe9f3"
                    />
                </g>

                <g className="toggle-patches"></g>
                <rect
                    className="darkmode-cover"
                    x="0"
                    y="0"
                    width="100"
                    height="50"
                    rx="25"
                    fill="var(--color-shadow)"
                    mask="url(#darkmode-toggle-mask)"
                />
            </svg>
        </label>
    );
}