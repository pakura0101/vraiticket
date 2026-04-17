"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building2, Globe, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { companiesAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { Button, Input, Modal, Spinner, EmptyState } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import type { Company } from "@/types";

const schema = z.object({
  name:        z.string().min(2, "Company name required"),
  description: z.string().optional(),
  domain:      z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CompaniesPage() {
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    companiesAPI.list()
      .then(setCompanies)
      .catch(() => toast.error("Failed to load companies"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? companies.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.domain ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : companies;

  function openCreate() {
    setEditTarget(null);
    reset({ name: "", description: "", domain: "" });
    setModalOpen(true);
  }

  function openEdit(c: Company) {
    setEditTarget(c);
    reset({ name: c.name, description: c.description ?? "", domain: c.domain ?? "" });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload = {
        name:        data.name,
        description: data.description || undefined,
        domain:      data.domain || undefined,
      };
      if (editTarget) {
        const updated = await companiesAPI.update(editTarget.id, payload);
        setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success("Company updated");
      } else {
        const created = await companiesAPI.create(payload);
        setCompanies(prev => [created, ...prev]);
        toast.success("Company created");
      }
      setModalOpen(false);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await companiesAPI.delete(deleteId);
      setCompanies(prev => prev.filter(c => c.id !== deleteId));
      toast.success("Company deleted");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleteId(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-6 h-6 text-amber-400" />
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="page-title">Companies</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Manage client companies. Clients can be assigned to a company.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New Company
        </Button>
      </div>

      {/* Search */}
      <div className="card p-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
          <input
            type="text"
            placeholder="Search by name or domain…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base pl-9"
          />
        </div>
      </div>

      {/* Companies grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-10 h-10" />}
          title="No companies yet"
          description="Create a company to group client users."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" /> Create Company
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={cn("card p-5 animate-slide-up", !c.is_active && "opacity-50")}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Icon + name */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-[var(--text)] text-sm truncate">
                      {c.name}
                    </h3>
                    {c.domain && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{c.domain}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {c.description && (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2 mb-3">
                  {c.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <span className={cn("badge text-[10px]",
                  c.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-muted)]"
                )}>
                  {c.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Created {timeAgo(c.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Company" : "New Company"}
        description="Companies group client users. Assign clients to a company when creating their account."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Company Name"
            placeholder="e.g. Acme Corporation"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Domain (optional)"
            placeholder="e.g. acme.com"
            {...register("domain")}
          />
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input-base resize-none"
              rows={2}
              placeholder="Brief description of this company…"
              {...register("description")}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">
              {editTarget ? "Save Changes" : "Create Company"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Company?"
        size="sm"
        description="Users assigned to this company will become unaffiliated. This cannot be undone."
      >
        <div className="flex gap-3 pt-2">
          <Button variant="danger" onClick={confirmDelete} className="flex-1">
            Delete Company
          </Button>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
