"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ImagePlus, X, FileImage, AlertCircle, Users2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ticketsAPI, groupsAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { Button, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Group } from "@/types";

const schema = z.object({
  title:       z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Please provide more detail"),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH"]),
  group_id:    z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const PRIORITY_CARDS = [
  { value: "LOW",    label: "Low",    desc: "Minor issue, no urgency",        active: "border-teal-500/50 bg-teal-500/5",   dot: "bg-teal-500",  text: "text-teal-400",  base: "border-[var(--border)] hover:border-teal-500/20"  },
  { value: "MEDIUM", label: "Medium", desc: "Affects work, needs attention",  active: "border-amber-500/50 bg-amber-500/5", dot: "bg-amber-400", text: "text-amber-400", base: "border-[var(--border)] hover:border-amber-500/20" },
  { value: "HIGH",   label: "High",   desc: "Critical — blocking operations", active: "border-rose-500/50 bg-rose-500/5",   dot: "bg-rose-500",  text: "text-rose-400",  base: "border-[var(--border)] hover:border-rose-500/20"  },
];

export default function NewTicketPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [groups,       setGroups]       = useState<Group[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [attachments,  setAttachments]  = useState<File[]>([]);
  const [previews,     setPreviews]     = useState<string[]>([]);
  const [dragOver,     setDragOver]     = useState(false);
  const [uploadingIds, setUploadingIds] = useState<number[]>([]);

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  const priority = watch("priority");
  const groupId  = watch("group_id");

  useEffect(() => {
    groupsAPI.list().then(setGroups).catch(() => {});
  }, []);

  // ── File helpers ─────────────────────────────────────────────────────────────

  function addFiles(files: FileList | null) {
    if (!files) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    const valid   = Array.from(files).filter(f => allowed.includes(f.type) && f.size < 5_000_000);
    if (valid.length < files.length) toast.error("Some files skipped (images/PDF only, max 5 MB)");
    setAttachments(prev => [...prev, ...valid].slice(0, 5));
    valid.forEach(f => {
      setPreviews(prev => [...prev, f.type.startsWith("image/") ? URL.createObjectURL(f) : ""]);
    });
  }

  function removeFile(i: number) {
    setAttachments(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => {
      if (prev[i]) URL.revokeObjectURL(prev[i]);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const ticket = await ticketsAPI.create({
        title:       data.title,
        description: data.description,
        priority:    data.priority,
        group_id:    data.group_id ? Number(data.group_id) : undefined,
      });

      if (attachments.length > 0) {
        setUploadingIds(attachments.map((_, i) => i));
        const results = await Promise.allSettled(
          attachments.map(f => ticketsAPI.uploadAttachment(ticket.id, f))
        );
        const failed = results.filter(r => r.status === "rejected").length;
        if (failed > 0) toast.error(`${failed} attachment(s) failed to upload`);
        else            toast.success(`Ticket #${ticket.id} created with ${attachments.length} attachment(s)!`);
      } else {
        toast.success(`Ticket #${ticket.id} created!`);
      }

      router.push("/tickets");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
      setUploadingIds([]);
    }
  }

  const selectedGroup = groups.find(g => String(g.id) === groupId);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/tickets"
        className="inline-flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-2)] transition-colors animate-slide-up">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
      </Link>

      <div className="card p-8 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <h2 className="page-title mb-1">Open a New Ticket</h2>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          Describe your issue clearly so our team can assist you quickly.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Title */}
          <Input
            label="Title"
            placeholder="e.g. Cannot access company VPN from home"
            error={errors.title?.message}
            {...register("title")}
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="Describe your issue in detail. Include error messages, steps to reproduce, OS, browser version, etc."
            rows={5}
            error={errors.description?.message}
            {...register("description")}
          />

          {/* Department / Group */}
          {groups.length > 0 && (
            <div>
              <label className="label">
                Department <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setValue("group_id", groupId === String(g.id) ? "" : String(g.id))}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all duration-150",
                      groupId === String(g.id)
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                        : "border-[var(--border)] hover:border-[var(--border-2)] text-[var(--text-muted)] hover:text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: g.color || "#4A4A5E" }} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold truncate">{g.name}</p>
                      {g.members.length > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {g.members.length} agent{g.members.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedGroup && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <Users2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-400/80">
                    Visible to all agents in <strong>{selectedGroup.name}</strong>. An agent will pick it up shortly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <div className="grid grid-cols-3 gap-3">
              {PRIORITY_CARDS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setValue("priority", p.value as "LOW" | "MEDIUM" | "HIGH")}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all duration-150",
                    priority === p.value ? p.active : p.base
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("w-2 h-2 rounded-full", p.dot)} />
                    <span className={cn("text-xs font-semibold",
                      priority === p.value ? p.text : "text-[var(--text-muted)]")}>
                      {p.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-snug">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="label">
              Attachments{" "}
              <span className="text-[var(--text-muted)] normal-case font-normal">(optional · max 5 · 5 MB each)</span>
            </label>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                dragOver
                  ? "border-amber-500/60 bg-amber-500/5"
                  : "border-[var(--border)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]"
              )}
            >
              <ImagePlus className={cn("w-6 h-6 transition-colors",
                dragOver ? "text-amber-400" : "text-[var(--text-faint)]")} />
              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  <span className="text-amber-400 font-medium">Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">PNG, JPG, GIF, WEBP, PDF</p>
              </div>
              <input
                ref={fileRef} type="file" multiple accept="image/*,.pdf"
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {attachments.map((file, i) => (
                  <div key={i} className={cn(
                    "relative group rounded-xl overflow-hidden border aspect-square bg-[var(--surface)]",
                    uploadingIds.includes(i) ? "border-amber-500/50 animate-pulse" : "border-[var(--border)]"
                  )}>
                    {previews[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                        <FileImage className="w-5 h-5 text-[var(--text-muted)]" />
                        <p className="text-[9px] text-[var(--text-muted)] truncate w-full text-center">{file.name}</p>
                      </div>
                    )}
                    <button
                      type="button" onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                    {uploadingIds.includes(i) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ))}
                {attachments.length < 5 && (
                  <button
                    type="button" onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border border-dashed border-[var(--border)] hover:border-amber-500/40 flex items-center justify-center text-[var(--text-faint)] hover:text-amber-400 transition-colors">
                    <ImagePlus className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {attachments.length > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <AlertCircle className="w-3 h-3 text-amber-400/60" />
                Files will be uploaded when you submit the ticket.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">Submit Ticket</Button>
            <Link href="/tickets">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
