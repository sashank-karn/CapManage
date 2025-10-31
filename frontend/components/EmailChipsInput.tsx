"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "classnames";

const EMAIL_REGEX = /[^\s,;]+@[^\s,;]+\.[^\s,;]+/i;

export type EmailChipsInputProps = {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function EmailChipsInput({ value, onChange, placeholder, disabled, className }: EmailChipsInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalized = useMemo(() => Array.from(new Set(value.map((e) => e.trim().toLowerCase()).filter(Boolean))), [value]);

  const commitToken = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;
    // split by common separators
    const parts = text.split(/[\s,;\n]+/).map((p) => p.trim()).filter(Boolean);
    const emails = parts.filter((p) => EMAIL_REGEX.test(p));
    if (emails.length) {
      const merged = Array.from(new Set([...normalized, ...emails]));
      onChange(merged);
    }
  }, [normalized, onChange]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commitToken(input);
      setInput("");
    } else if (e.key === 'Backspace' && !input) {
      // remove last chip
      onChange(normalized.slice(0, -1));
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const data = e.clipboardData.getData('text');
    if (data && /[,;\s\n]/.test(data)) {
      e.preventDefault();
      commitToken(data);
      setInput("");
    }
  };

  const removeAt = (idx: number) => {
    const next = normalized.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const blurCommit = () => {
    if (input.trim()) {
      commitToken(input);
      setInput("");
    }
  };

  return (
    <div className={clsx("flex min-h-[40px] w-full flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm", className, disabled && "opacity-60")}
      onClick={() => inputRef.current?.focus()}
    >
      {normalized.map((email, idx) => (
        <span key={email + idx} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-800">
          {email}
          <button type="button" onClick={() => removeAt(idx)} className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200" aria-label={`Remove ${email}`}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="flex-1 min-w-[160px] border-0 bg-transparent px-1 py-1 outline-none placeholder:text-slate-400"
        placeholder={placeholder || "Add emails"}
        disabled={disabled}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={blurCommit}
      />
    </div>
  );
}
