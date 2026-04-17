"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Clock, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { categoriesAPI, usersAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { Button, Input, Textarea, Select, Modal, Spinner, EmptyState, Avatar } from "@/components/ui";
import type { Category, User } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  default_agent_id: z.string().optional(),
  sla_hours: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    Promise.all([
      categoriesAPI.list().then(setCategories),
      usersAPI.list({ role: "agent", page_size: 100 }).then((r) => setAgents(r.items)),
    ]).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditTarget(null);
    reset({ name: "", description: "", default_agent_id: "", sla_hours: "" });
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditTarget(cat);
    reset({
      name: cat.name,
      description: cat.description ?? "",
      default_agent_id: cat.default_agent_id ? String(cat.default_agent_id) : "",
      sla_hours: cat.sla_hours ? String(cat.sla_hours) : "",
    });
    setModalOpen(true);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        default_agent_id: data.default_agent_id ? Number(data.default_agent_id) : undefined,
        sla_hours: data.sla_hours ? Number(data.sla_hours) : undefined,
      };
      if (editTarget) {
        const updated = await categoriesAPI.update(editTarget.id, payload);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success("Category updated");
      } else {
        const created = await categoriesAPI.create(payload);
        setCategories((prev) => [...prev, created]);
        toast.success("Category created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: Category) {
    try {
      const updated = await categoriesAPI.update(cat.id, { is_active: !cat.is_active });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(`Category ${updated.is_active ? "activated" : "deactivated"}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner className="w-6 h-6 text-amber-400" /></div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="page-title">Categories</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Manage ticket categories and smart auto-assignment.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          New Category
        </Button>
      </div>

      {/* Grid */}
      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create a category to enable smart ticket assignment."
          action={<Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" />Create</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className={`card p-5 animate-slide-up ${!cat.is_active ? "opacity-50" : ""}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display font-semibold text-[var(--text)]">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleActive(cat)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      cat.is_active
                        ? "text-teal-400 hover:bg-teal-500/10"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    {cat.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                {cat.default_agent ? (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Default agent:</span>
                    <div className="flex items-center gap-1.5">
                      <Avatar name={cat.default_agent.full_name} size="sm" />
                      <span className="text-xs text-[var(--text-2)]">{cat.default_agent.full_name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">No default agent</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">SLA:</span>
                  <span className="text-xs text-[var(--text-2)]">
                    {cat.sla_hours ? `${cat.sla_hours}h` : "Global default"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Category" : "New Category"}
        description="Categories help organize tickets and enable automatic agent assignment."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" placeholder="e.g. Network Issues" error={errors.name?.message} {...register("name")} />

          <div>
            <label className="label">Description</label>
            <textarea className="input-base resize-none" rows={2} placeholder="Optional description…" {...register("description")} />
          </div>

          {agents.length > 0 && (
            <Select
              label="Default Agent (auto-assign)"
              placeholder="No default agent"
              options={agents.map((a) => ({ value: String(a.id), label: a.full_name }))}
              value={watch("default_agent_id") ?? ""}
              onValueChange={(v) => setValue("default_agent_id", v)}
            />
          )}

          <Input
            label="SLA Hours (overrides global default)"
            type="number"
            placeholder="e.g. 8"
            {...register("sla_hours")}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">
              {editTarget ? "Save Changes" : "Create Category"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
