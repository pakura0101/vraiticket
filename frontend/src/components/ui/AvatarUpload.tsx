"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Current avatar URL (from DB) or null */
  currentUrl?: string | null;
  /** Name used for initials fallback */
  name: string;
  /** Called with the File the user picked, plus local preview URL */
  onChange: (file: File, previewUrl: string) => void;
  /** Called when user removes the staged photo */
  onRemove?: () => void;
  /** Optional: show uploading spinner */
  uploading?: boolean;
  size?: "md" | "lg";
}

const SIZE = { md: "w-16 h-16 text-lg", lg: "w-24 h-24 text-2xl" };

function initialsColor(name: string) {
  const palettes = [
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export function AvatarUpload({
  currentUrl,
  name,
  onChange,
  onRemove,
  uploading = false,
  size = "md",
}: Props) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const displayUrl = preview ?? currentUrl ?? null;

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange(file, url);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onRemove?.();
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar circle — clickable drop zone */}
      <div
        className={cn(
          "relative rounded-full shrink-0 cursor-pointer select-none",
          "ring-2 ring-offset-2 ring-offset-[#0E0E14] transition-all",
          dragOver
            ? "ring-amber-400 scale-105"
            : "ring-[#1C1C22] hover:ring-amber-500/50",
          SIZE[size]
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Photo or initials */}
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={name}
            className={cn("rounded-full object-cover w-full h-full")}
          />
        ) : (
          <div className={cn(
            "rounded-full w-full h-full flex items-center justify-center font-display font-bold",
            initialsColor(name)
          )}>
            {initials(name)}
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}

        {/* Camera icon overlay (on hover, not during upload) */}
        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Remove button (shown when preview exists) */}
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Text instructions */}
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[13px] font-medium text-amber-400 hover:text-amber-300 transition-colors"
        >
          {displayUrl ? "Change photo" : "Upload photo"}
        </button>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          JPEG, PNG, GIF or WEBP · max 2 MB
        </p>
        {!displayUrl && (
          <p className="text-[10px] text-[var(--border)] mt-0.5">
            If skipped, initials will be shown
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleInput}
      />
    </div>
  );
}
