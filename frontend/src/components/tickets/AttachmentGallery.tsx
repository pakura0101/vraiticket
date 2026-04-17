"use client";

import { useRef, useState } from "react";
import {
  Download, FileText, ImagePlus, Paperclip, X,
  File as FileIcon, FileType, Loader2, ZoomIn,
} from "lucide-react";
import toast from "react-hot-toast";
import { ticketsAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { useAuthFiles } from "@/hooks/useAuthImage";
import { formatBytes, cn } from "@/lib/utils";
import type { Attachment } from "@/types";

interface Props {
  ticketId: number;
  attachments: Attachment[];
  canUpload: boolean;
  onUploaded: () => void;
}

function NonImageIcon({ mime }: { mime: string }) {
  if (mime === "application/pdf")
    return <FileType className="w-8 h-8 text-rose-400" />;
  if (mime.includes("word") || mime.includes("document"))
    return <FileText className="w-8 h-8 text-blue-400" />;
  if (mime.startsWith("text/"))
    return <FileText className="w-8 h-8 text-slate-400" />;
  return <FileIcon className="w-8 h-8 text-[var(--text-muted)]" />;
}

function fileBorderColor(mime: string) {
  if (mime === "application/pdf")      return "border-rose-500/25 bg-rose-500/5";
  if (mime.includes("word"))           return "border-blue-500/25 bg-blue-500/5";
  if (mime.startsWith("text/"))        return "border-slate-500/25 bg-slate-500/5";
  return "border-[var(--border)] bg-[var(--bg)]";
}

export function AttachmentGallery({ ticketId, attachments, canUpload, onUploaded }: Props) {
  const fileRef             = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox,  setLightbox]  = useState<string | null>(null);

  const images    = attachments.filter(a => a.mime_type.startsWith("image/"));
  const nonImages = attachments.filter(a => !a.mime_type.startsWith("image/"));

  // Build RELATIVE paths (no baseURL prefix) so axios doesn't double-prepend
  // Path format: /tickets/{ticketId}/attachments/{id}/download
  const imagePaths = images.map(a => `/tickets/${ticketId}/attachments/${a.id}/download`);
  const authEntries = useAuthFiles(imagePaths);

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(files).map(f => ticketsAPI.uploadAttachment(ticketId, f))
      );
      const ok  = results.filter(r => r.status === "fulfilled").length;
      const bad = results.filter(r => r.status === "rejected").length;
      if (ok  > 0) toast.success(`${ok} file${ok > 1 ? "s" : ""} uploaded`);
      if (bad > 0) toast.error(`${bad} file${bad > 1 ? "s" : ""} failed`);
      onUploaded();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  async function downloadFile(att: Attachment) {
    try {
      const blob = await ticketsAPI.downloadAttachment(ticketId, att.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = att.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">
          Attachments
          <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
            ({attachments.length})
          </span>
        </h3>
        {canUpload && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
              : <><ImagePlus className="w-3.5 h-3.5" />Add files</>
            }
          </button>
        )}
        <input
          ref={fileRef} type="file" multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {/* Empty state */}
      {attachments.length === 0 && (
        <div className="flex flex-col items-center py-8 gap-2 text-[var(--text-faint)]">
          <Paperclip className="w-7 h-7" />
          <p className="text-sm">No attachments</p>
          {canUpload && (
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Upload a file
            </button>
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-5">

          {/* ── Image grid ──────────────────────────────────────── */}
          {images.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">
                Images ({images.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map(att => {
                  const path  = `/tickets/${ticketId}/attachments/${att.id}/download`;
                  const entry = authEntries[path];
                  const state = entry?.state ?? "loading";

                  return (
                    <div key={att.id}
                      className="group relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg)] hover:border-amber-500/30 transition-all">

                      {/* Thumbnail area */}
                      <div className="w-full aspect-square flex items-center justify-center bg-[var(--surface)]">

                        {state === "loading" && (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-amber-400/40 animate-spin" />
                            <p className="text-[9px] text-[var(--text-muted)]">Loading…</p>
                          </div>
                        )}

                        {state === "ready" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.src}
                            alt={att.filename}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightbox(entry.src)}
                          />
                        )}

                        {state === "error" && (
                          <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                            <ImagePlus className="w-6 h-6 text-[var(--text-faint)]" />
                            <p className="text-[9px] text-[var(--text-muted)] break-all">{att.filename}</p>
                          </div>
                        )}
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 pointer-events-none group-hover:pointer-events-auto">
                        {state === "ready" && (
                          <button
                            onClick={() => setLightbox(entry.src)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors"
                          >
                            <ZoomIn className="w-3.5 h-3.5" /> View
                          </button>
                        )}
                        <button
                          onClick={() => downloadFile(att)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                        <p className="text-[9px] text-white/40">{formatBytes(att.size_bytes)}</p>
                      </div>

                      {/* Uploader strip */}
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/75 to-transparent pointer-events-none">
                        <p className="text-[9px] text-white/50 truncate">
                          {att.uploader?.full_name ?? "Unknown"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── File list (non-images) ───────────────────────── */}
          {nonImages.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">
                Files ({nonImages.length})
              </p>
              <div className="space-y-2">
                {nonImages.map(att => (
                  <div key={att.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl border",
                      fileBorderColor(att.mime_type)
                    )}>
                    <div className="shrink-0">
                      <NonImageIcon mime={att.mime_type} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--text-2)] truncate">{att.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[var(--text-muted)]">{formatBytes(att.size_bytes)}</span>
                        <span className="text-[10px] text-[var(--border)]">·</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{att.uploader?.full_name ?? "Unknown"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => downloadFile(att)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-amber-400 hover:border-amber-500/30 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/93 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Preview"
            className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
