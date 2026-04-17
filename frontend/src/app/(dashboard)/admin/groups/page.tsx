"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Users2, Trash2, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { groupsAPI, usersAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { Button, Input, Modal, Spinner, EmptyState, Avatar } from "@/components/ui";
import { AuthAvatar } from "@/components/ui/AuthAvatar";
import { GROUP_COLORS, cn } from "@/lib/utils";
import type { Group, User } from "@/types";

const schema = z.object({
  name:        z.string().min(2, "Name required"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function GroupsPage() {
  const [groups,     setGroups]     = useState<Group[]>([]);
  const [agents,     setAgents]     = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [color,      setColor]      = useState(GROUP_COLORS[0]);
  const [memberIds,  setMemberIds]  = useState<number[]>([]);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    Promise.all([
      groupsAPI.list().then(setGroups),
      usersAPI.list({ role: "agent", page_size: 100 }).then(r => setAgents(r.items)),
    ]).finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditTarget(null);
    setColor(GROUP_COLORS[0]);
    setMemberIds([]);
    reset({ name: "", description: "" });
    setModalOpen(true);
  }

  function openEdit(g: Group) {
    setEditTarget(g);
    setColor(g.color || GROUP_COLORS[0]);
    setMemberIds(g.members.map(m => m.id));
    reset({ name: g.name, description: g.description ?? "" });
    setModalOpen(true);
  }

  function toggleMember(id: number) {
    setMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload = { name: data.name, description: data.description || undefined, color, member_ids: memberIds };
      if (editTarget) {
        const updated = await groupsAPI.update(editTarget.id, payload);
        setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
        toast.success("Group updated");
      } else {
        const created = await groupsAPI.create(payload);
        setGroups(prev => [...prev, created]);
        toast.success("Group created");
      }
      setModalOpen(false);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await groupsAPI.delete(deleteId);
      setGroups(prev => prev.filter(g => g.id !== deleteId));
      toast.success("Group deleted");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleteId(null); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="w-6 h-6 text-amber-400"/></div>;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="page-title">Groups</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Departments / teams. Clients route tickets to a group; agents in that group see and self-assign them.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5"/>New Group</Button>
      </div>

      {/* Group grid */}
      {groups.length === 0 ? (
        <EmptyState icon={<Users2 className="w-10 h-10"/>} title="No groups yet"
          description="Create your first group to enable department-based ticket routing."
          action={<Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5"/>Create Group</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g, i) => (
            <div key={g.id}
              className={cn("card p-5 animate-slide-up", !g.is_active && "opacity-50")}
              style={{ animationDelay: `${i * 0.04}s` }}>
              {/* Color bar */}
              <div className="h-1 rounded-full mb-4 -mt-5 -mx-5 rounded-t-2xl" style={{ background: g.color ?? "#4A4A5E" }} />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: (g.color ?? "#4A4A5E") + "22" }}>
                    <Users2 className="w-4 h-4" style={{ color: g.color ?? "#4A4A5E" }} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-[var(--text)] text-sm">{g.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {g.members.length} agent{g.members.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(g)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                    <Pencil className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={() => setDeleteId(g.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>

              {g.description && (
                <p className="text-xs text-[var(--text-muted)] mt-3 line-clamp-2 leading-relaxed">{g.description}</p>
              )}

              {/* Member avatars */}
              {g.members.length > 0 && (
                <div className="flex items-center mt-4 pt-3 border-t border-[var(--border)]">
                  <div className="flex -space-x-2">
                    {g.members.slice(0, 5).map(m => (
                      <div key={m.id} className="ring-2 ring-[var(--surface)] rounded-full">
                        <AuthAvatar name={m.full_name} avatarPath={m.avatar_url} size="sm"/>
                      </div>
                    ))}
                    {g.members.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] ring-2 ring-[var(--surface)] flex items-center justify-center">
                        <span className="text-[9px] text-[var(--text-muted)] font-bold">+{g.members.length - 5}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] ml-3">
                    {g.members.slice(0, 2).map(m => m.full_name.split(" ")[0]).join(", ")}
                    {g.members.length > 2 && ` +${g.members.length - 2} more`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Group" : "New Group"}
        description="Groups represent departments. Clients select one when submitting a ticket."
        size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Group Name" placeholder="e.g. Network & Infrastructure" error={errors.name?.message} {...register("name")} />

          <div>
            <label className="label">Description</label>
            <textarea className="input-base resize-none" rows={2} placeholder="Brief description of what this group handles…" {...register("description")} />
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-lg transition-all",
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0E0E14] scale-110" : "hover:scale-105")}
                  style={{ background: c }}>
                  {color === c && <Check className="w-3 h-3 text-white mx-auto"/>}
                </button>
              ))}
            </div>
          </div>

          {/* Agent member selector */}
          {agents.length > 0 && (
            <div>
              <label className="label">Members <span className="text-[var(--text-muted)] normal-case font-normal">(agents)</span></label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-[var(--border)] rounded-xl p-2 bg-[var(--bg)]">
                {agents.map(agent => {
                  const selected = memberIds.includes(agent.id);
                  return (
                    <button key={agent.id} type="button" onClick={() => toggleMember(agent.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
                        selected ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
                      )}>
                      <Avatar name={agent.full_name} size="sm"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{agent.full_name}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{agent.email}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-amber-400 shrink-0"/>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{memberIds.length} agent{memberIds.length !== 1 ? "s" : ""} selected</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">
              {editTarget ? "Save Changes" : "Create Group"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Group?" size="sm"
        description="Tickets in this group will become ungrouped. This cannot be undone.">
        <div className="flex gap-3 pt-2">
          <Button variant="danger" onClick={confirmDelete} className="flex-1">Delete Group</Button>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
