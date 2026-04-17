"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Lock, ImagePlus, X, FileImage, AlertCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ticketsAPI, groupsAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { Button, Input, Textarea, Select } from "@/components/ui";
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
  { value: "LOW",    label: "Low",    active: "border-teal-500/50 bg-teal-500/5 text-teal-400",   base: "border-[var(--border)] text-[var(--text-muted)] hover:border-teal-500/20"   },
  { value: "MEDIUM", label: "Medium", active: "border-amber-500/50 bg-amber-500/5 text-amber-400", base: "border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500/20" },
  { value: "HIGH",   label: "High",   active: "border-rose-500/50 bg-rose-500/5 text-rose-400",    base: "border-[var(--border)] text-[var(--text-muted)] hover:border-rose-500/20"   },
];

export default function InternalTicketPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [groups,      setGroups]      = useState<Group[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews,    setPreviews]    = useState<string[]>([]);
  const [dragOver,    setDragOver]    = useState(false);

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  const priority = watch("priority");

  useEffect(() => {
    groupsAPI.list().then(setGroups).catch(() => {});
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
                     "text/plain", "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const valid = Array.from(files).filter(f => allowed.includes(f.type) && f.size < 5_000_000);
    if (valid.length < files.length) toast.error("Some files skipped (unsupported type or >5 MB)");
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

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const ticket = await ticketsAPI.create({
        title:       data.title,
        description: data.description,
        priority:    data.priority,
        ticket_type: "internal",
        group_id:    data.group_id ? Number(data.group_id) : undefined,
      });

      if (attachments.length > 0) {
        const results = await Promise.allSettled(
          attachments.map(f => ticketsAPI.uploadAttachment(ticket.id, f))
        );
        const failed = results.filter(r => r.status === "rejected").length;
        if (failed > 0) toast.error(`${failed} attachment(s) failed to upload`);
      }

      toast.success(`Internal ticket #${ticket.id} created`);
      // Redirect to My Tickets list so agent sees their queue
      router.push("/tickets");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/tickets"
        className="inline-flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-2)] transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
      </Link>

      <div className="card p-8">
        {/* Internal badge */}
        <div className="flex items-center gap-2.5 mb-6 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 w-fit">
          <Lock className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Internal Ticket</p>
            <p className="text-[11px] text-amber-400/60">Visible only to agents and admins</p>
          </div>
        </div>

        <h2 className="page-title mb-1">Create Internal Ticket</h2>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          Use internal tickets for team coordination, infrastructure tasks, or issues not from clients.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Title"
            placeholder="e.g. Upgrade server SSL certificates"
            error={errors.title?.message}
            {...register("title")}
          />

          <Textarea
            label="Description"
            placeholder="Describe the task or issue. Include context, links, or steps needed."
            rows={5}
            error={errors.description?.message}
            {...register("description")}
          />

          {/* Group selector */}
          {groups.length > 0 && (
            <Select
              label="Assign to Group"
              placeholder="No specific group"
              options={groups.map(g => ({ value: String(g.id), label: g.name }))}
              value={watch("group_id") ?? ""}
              onValueChange={v => setValue("group_id", v)}
            />
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
                    "px-3 py-2.5 rounded-xl border text-[13px] font-medium transition-all",
                    priority === p.value ? p.active : p.base
                  )}
                >
                  {p.label}
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
                "flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                dragOver
                  ? "border-amber-500/60 bg-amber-500/5"
                  : "border-[var(--border)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]"
              )}
            >
              <ImagePlus className={cn("w-5 h-5 transition-colors", dragOver ? "text-amber-400" : "text-[var(--text-faint)]")} />
              <p className="text-sm text-[var(--text-muted)]">
                <span className="text-amber-400 font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-[var(--text-muted)]">Images, PDF, DOC, TXT</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="relative group rounded-xl overflow-hidden border border-[var(--border)] aspect-square bg-[var(--surface)]"
                  >
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
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {attachments.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border border-dashed border-[var(--border)] hover:border-amber-500/40 flex items-center justify-center text-[var(--text-faint)] hover:text-amber-400 transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {attachments.length > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <AlertCircle className="w-3 h-3 text-amber-400/60" />
                Files uploaded after ticket is created.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              Create Internal Ticket
            </Button>
            <Link href="/tickets">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
