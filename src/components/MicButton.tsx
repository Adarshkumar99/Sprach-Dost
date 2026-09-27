"use client";

export default function MicButton({
  listening,
  disabled,
  onClick,
}: {
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all
        ${listening ? "bg-red-500 mic-listening scale-110" : "bg-gradient-to-br from-amber-500 to-red-600 hover:scale-105"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      aria-label={listening ? "Listening…" : "Speak"}
      title={listening ? "Sunny ho…" : "Bolo!"}
    >
      {/* mic icon */}
      <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
        <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
      </svg>
      <span className="absolute -bottom-6 text-xs opacity-70 whitespace-nowrap">
        {listening ? "Listening…" : "Tap & speak"}
      </span>
    </button>
  );
}
