"use client";

export type ChatMsg = {
  role: "avatar" | "user";
  german?: string; // avatar spoken line
  erklarung?: string;
  korrektur?: string;
  text?: string; // user raw text OR fallback avatar text
};

export default function ChatList({ messages, avatarColor }: { messages: ChatMsg[]; avatarColor: string }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m, i) =>
        m.role === "avatar" ? (
          <div key={i} className="bubble-in self-start max-w-[85%]">
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-base font-semibold text-amber-300">{m.german || m.text}</p>
              {m.erklarung && <p className="text-sm opacity-80 mt-1.5">💡 {m.erklarung}</p>}
              {m.korrektur && m.korrektur !== "None" && (
                <p className="text-sm mt-1.5 text-emerald-300">✏️ {m.korrektur}</p>
              )}
            </div>
          </div>
        ) : (
          <div key={i} className={`bubble-in self-end max-w-[85%]`}>
            <div className={`rounded-2xl rounded-br-sm px-4 py-3 ${avatarColor}`}>
              <p className="text-base">{m.text}</p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
