import { useState } from 'react';
import './Clipboard.css';

interface ClipboardProps {
    copy: string | null;
}

function Clipboard({ copy }: ClipboardProps) {
    const [isCopied, setIsCopied] = useState(false);
    const size = 22;

    const handleCopy = async () => {
        if (copy === null) return;

        try {
            await navigator.clipboard.writeText(copy);
            setIsCopied(true);

            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <button
            className={`Clipboard-btn ${isCopied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label="Copy to clipboard"
            title="Copy to clipboard"
        >
            {isCopied && (
                <div className="glitter-container">
                    <span className="particle particle-1"></span>
                    <span className="particle particle-2"></span>
                    <span className="particle particle-3"></span>
                    <span className="particle particle-4"></span>
                    <span className="particle particle-5"></span>
                    <span className="particle particle-6"></span>
                </div>
            )}

            <div className="icon-container" style={{ width: size, height: size }}>
                <svg
                    className="icon-copy"
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M9 3H15M9 3C8.45 3 8 3.45 8 4V5H16V4C16 3.45 15.55 3 15 3M9 3H15M7 5H17C18.1 5 19 5.9 19 7V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V7C5 5.9 5.9 5 7 5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>

                <svg
                    className="icon-check"
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M20 6L9 17L4 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        </button>
    );
}

export default Clipboard;