"use client";

import { useEffect, useState } from "react";
import { Plus, Search, UserCheck, UserX, Pencil, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { usersAPI, companiesAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { Button, Input, Select, Modal, Spinner, EmptyState } from "@/components/ui";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { AuthAvatar } from "@/components/ui/AuthAvatar";
import { ROLE_CONFIG, cn, timeAgo, formatDate } from "@/lib/utils";
import type { Company, User, UserRole } from "@/types";

// ── Schemas ────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  role:       z.enum(["client", "agent", "admin"]),
  full_name:  z.string().min(2, "Name required"),
  email:      z.string().email("Invalid email"),
  password:   z.string().min(8, "Min 8 characters"),
  phone:      z.string().optional(),
  company_id: z.string().optional(),   // client only
  job_title:  z.string().optional(),   // agent/admin only
  department: z.string().optional(),   // agent/admin only
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  role:       z.enum(["client", "agent", "admin"]),
  full_name:  z.string().min(2),
  phone:      z.string().optional(),
  password:   z.string().optional(),
  is_active:  z.boolean(),
  company_id: z.string().optional(),   // client only
  job_title:  z.string().optional(),   // agent/admin only
});
type EditForm = z.infer<typeof editSchema>;

export default function UsersPage() {
  const [users,      setUsers]      = useState<User[]>([]);
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Create modal
  const [createOpen,       setCreateOpen]       = useState(false);
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [createAvatarPrev, setCreateAvatarPrev] = useState<string>("");
  const [creating,         setCreating]         = useState(false);

  // Edit modal
  const [editUser,       setEditUser]       = useState<User | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPrev, setEditAvatarPrev] = useState<string>("");
  const [saving,         setSaving]         = useState(false);

  // View modal
  const [viewUser, setViewUser] = useState<User | null>(null);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "client" },
  });
  const createRole = createForm.watch("role");

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const editRole = editForm.watch("role");

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await usersAPI.list({ role: roleFilter || undefined, page_size: 100 });
      setUsers(res.items);
      setTotal(res.total);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, [roleFilter]); // eslint-disable-line
  useEffect(() => { companiesAPI.list().then(setCompanies).catch(() => {}); }, []);

  const filtered = search.trim()
    ? users.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.department ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.job_title ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : users;

  // ── Create ─────────────────────────────────────────────────────────────────

  function openCreate() {
    createForm.reset({ role: "client" });
    setCreateAvatarFile(null);
    setCreateAvatarPrev("");
    setCreateOpen(true);
  }

  async function onCreateSubmit(data: CreateForm) {
    setCreating(true);
    try {
      // Step 1: create user (no avatar_url — we upload separately)
      let created = await usersAPI.create({
        email:      data.email,
        full_name:  data.full_name,
        password:   data.password,
        role:       data.role as UserRole,
        phone:      data.phone || undefined,
        company_id: data.role === "client" && data.company_id ? Number(data.company_id) : undefined,
        job_title:  data.role !== "client" ? data.job_title || undefined : undefined,
        department: data.role !== "client" ? data.department || undefined : undefined,
      });

      // Step 2: upload avatar if one was staged
      if (createAvatarFile) {
        try {
          created = await usersAPI.uploadAvatar(created.id, createAvatarFile);
        } catch {
          toast.error("User created but avatar upload failed");
        }
      }

      setUsers(prev => [created, ...prev]);
      setTotal(t => t + 1);
      toast.success(`User ${created.full_name} created`);
      setCreateOpen(false);
      createForm.reset({ role: "client" });
      setCreateAvatarFile(null);
      setCreateAvatarPrev("");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCreating(false); }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  function openEdit(u: User) {
    setEditUser(u);
    setEditAvatarFile(null);
    setEditAvatarPrev("");
    editForm.reset({
      role:       u.role,
      full_name:  u.full_name,
      phone:      u.phone ?? "",
      password:   "",
      is_active:  u.is_active,
      company_id: u.company_id ? String(u.company_id) : "",
      job_title:  u.job_title ?? "",
    });
  }

  async function onEditSubmit(data: EditForm) {
    if (!editUser) return;
    setSaving(true);
    try {
      // Update profile fields
      const payload: Parameters<typeof usersAPI.update>[1] = {
        full_name:  data.full_name,
        phone:      data.phone || undefined,
        role:       data.role as UserRole,
        is_active:  data.is_active,
        company_id: data.role === "client" && data.company_id ? Number(data.company_id) : undefined,
        job_title:  data.role !== "client" ? data.job_title || undefined : undefined,
      };
      if (data.password && data.password.length >= 8) payload.password = data.password;

      let updated = await usersAPI.update(editUser.id, payload);

      // Upload new avatar if staged
      if (editAvatarFile) {
        try {
          updated = await usersAPI.uploadAvatar(editUser.id, editAvatarFile);
        } catch {
          toast.error("Profile saved but avatar upload failed");
        }
      }

      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      toast.success("User updated");
      setEditUser(null);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  }

  async function toggleActive(u: User) {
    try {
      const updated = await usersAPI.update(u.id, { is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x));
      toast.success(`User ${updated.is_active ? "activated" : "deactivated"}`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  }

  const companyOptions = companies.map(c => ({ value: String(c.id), label: c.name }));

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{total} users registered</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New User
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 items-center animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
          <input type="text" placeholder="Search by name, email, title or department…"
            value={search} onChange={e => setSearch(e.target.value)} className="input-base pl-9" />
        </div>
        <div className="w-36">
          <Select placeholder="All roles"
            options={[
              { value: "client", label: "Client" },
              { value: "agent",  label: "Agent"  },
              { value: "admin",  label: "Admin"  },
            ]}
            value={roleFilter}
            onValueChange={v => setRoleFilter(v === roleFilter ? "" : v)}
          />
        </div>
        {roleFilter && (
          <button onClick={() => setRoleFilter("")}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: "0.1s" }}>
        {loading ? (
          <div className="flex items-center justify-center h-48"><Spinner className="w-5 h-5 text-amber-400" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search className="w-8 h-8" />} title="No users found" />
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1A1A1E] bg-[var(--bg)]/60">
                {["User", "Role", "Info", "Contact", "Status", "Joined", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.18em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(u => {
                const roleCfg = ROLE_CONFIG[u.role];
                return (
                  <tr key={u.id} className="hover:bg-[var(--surface)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AuthAvatar name={u.full_name} avatarPath={u.avatar_url} size="sm" />
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--text)]">{u.full_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge", roleCfg.color)}>{roleCfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "client" ? (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {companies.find(c => c.id === u.company_id)?.name ?? "—"}
                        </p>
                      ) : (
                        <>
                          <p className="text-[12px] text-[var(--text-muted)]">{u.job_title || "—"}</p>
                          {u.department && <p className="text-[10px] text-[var(--text-muted)]">{u.department}</p>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-[var(--text-muted)]">{u.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge",
                        u.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-[var(--surface-3)] text-[var(--text-muted)]"
                      )}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-[var(--text-muted)]">{timeAgo(u.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewUser(u)} title="View"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(u)} title="Edit"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleActive(u)} title={u.is_active ? "Deactivate" : "Activate"}
                          className={cn("p-1.5 rounded-lg transition-colors",
                            u.is_active
                              ? "text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10"
                              : "text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10"
                          )}>
                          {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {/* ── View modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User Profile" size="sm">
        {viewUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border)]">
              <AuthAvatar name={viewUser.full_name} avatarPath={viewUser.avatar_url} size="lg" />
              <div>
                <h3 className="font-display font-bold text-[var(--text)] text-lg">{viewUser.full_name}</h3>
                {viewUser.job_title && <p className="text-sm text-[var(--text-muted)] mt-0.5">{viewUser.job_title}</p>}
                <span className={cn("badge text-[10px] mt-1.5", ROLE_CONFIG[viewUser.role].color)}>
                  {ROLE_CONFIG[viewUser.role].label}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Email",  value: viewUser.email },
                { label: "Phone",  value: viewUser.phone || "—" },
                { label: "Status", value: viewUser.is_active ? "Active" : "Inactive" },
                ...(viewUser.role === "client"
                  ? [{ label: "Company", value: companies.find(c => c.id === viewUser.company_id)?.name || "—" }]
                  : [
                      { label: "Job Title",  value: viewUser.job_title || "—" },
                      { label: "Department", value: viewUser.department || "—" },
                    ]
                ),
                { label: "Joined", value: formatDate(viewUser.created_at) },
              ].map(row => (
                <div key={row.label} className="flex justify-between gap-4 py-1.5 border-b border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{row.label}</span>
                  <span className="text-[12px] text-[var(--text-2)] text-right max-w-[220px] truncate">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" className="flex-1"
                onClick={() => { setViewUser(null); openEdit(viewUser); }}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setViewUser(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)}
        title="Edit User"
        description="Changes saved immediately. Leave password blank to keep unchanged."
        size="md">
        {editUser && (
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">

            {/* Avatar upload — shown for all roles, most useful for agents/admins */}
            <div className="pb-4 border-b border-[var(--border)]">
              <AvatarUpload
                currentUrl={editAvatarPrev || editUser.avatar_url || null}
                name={editUser.full_name}
                size="lg"
                uploading={saving && !!editAvatarFile}
                onChange={(file, prevUrl) => { setEditAvatarFile(file); setEditAvatarPrev(prevUrl); }}
                onRemove={() => { setEditAvatarFile(null); setEditAvatarPrev(""); }}
              />
            </div>

            {/* Role FIRST */}
            <Select label="Role"
              options={[
                { value: "client", label: "Client" },
                { value: "agent",  label: "Agent"  },
                { value: "admin",  label: "Admin"  },
              ]}
              value={editForm.watch("role")}
              onValueChange={v => editForm.setValue("role", v as UserRole)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name" error={editForm.formState.errors.full_name?.message}
                {...editForm.register("full_name")} />
              <Input label="Phone" placeholder="+1 555 000 0000" {...editForm.register("phone")} />
            </div>

            {/* Client: company */}
            {editRole === "client" && (
              <Select label="Company" placeholder="No company"
                options={companyOptions}
                value={editForm.watch("company_id") ?? ""}
                onValueChange={v => editForm.setValue("company_id", v)}
              />
            )}

            {/* Agent/Admin: job title */}
            {editRole !== "client" && (
              <Input label="Job Title" placeholder="e.g. Senior Support Engineer"
                {...editForm.register("job_title")} />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Select label="Status"
                options={[
                  { value: "true",  label: "Active"   },
                  { value: "false", label: "Inactive" },
                ]}
                value={String(editForm.watch("is_active"))}
                onValueChange={v => editForm.setValue("is_active", v === "true")}
              />
              <Input label="New Password" type="password"
                placeholder="Leave blank to keep"
                {...editForm.register("password")} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={saving} className="flex-1">Save Changes</Button>
              <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Create modal ───────────────────────────────────────────────────── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)}
        title="Create New User"
        description="Role determines which additional fields appear."
        size="md">
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">

          {/* Avatar upload */}
          <div className="pb-4 border-b border-[var(--border)]">
            <AvatarUpload
              currentUrl={createAvatarPrev || null}
              name={createForm.watch("full_name") || "New User"}
              size="md"
              uploading={creating && !!createAvatarFile}
              onChange={(file, prevUrl) => { setCreateAvatarFile(file); setCreateAvatarPrev(prevUrl); }}
              onRemove={() => { setCreateAvatarFile(null); setCreateAvatarPrev(""); }}
            />
          </div>

          {/* Role FIRST */}
          <Select label="Role"
            options={[
              { value: "client", label: "Client" },
              { value: "agent",  label: "Agent"  },
              { value: "admin",  label: "Admin"  },
            ]}
            value={createForm.watch("role")}
            onValueChange={v => createForm.setValue("role", v as UserRole)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Jane Smith"
              error={createForm.formState.errors.full_name?.message}
              {...createForm.register("full_name")} />
            <Input label="Phone" placeholder="+1 555 000 0000" {...createForm.register("phone")} />
          </div>

          <Input label="Email" type="email" placeholder="jane@company.com"
            error={createForm.formState.errors.email?.message}
            {...createForm.register("email")} />

          <Input label="Password" type="password" placeholder="Min. 8 characters"
            error={createForm.formState.errors.password?.message}
            {...createForm.register("password")} />

          {/* Client: company */}
          {createRole === "client" && (
            <Select label="Company" placeholder="No company"
              options={companyOptions}
              value={createForm.watch("company_id") ?? ""}
              onValueChange={v => createForm.setValue("company_id", v)}
            />
          )}

          {/* Agent/Admin: job title + department */}
          {createRole !== "client" && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Job Title" placeholder="e.g. IT Engineer"
                {...createForm.register("job_title")} />
              <Input label="Department" placeholder="e.g. Infrastructure"
                {...createForm.register("department")} />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={creating} className="flex-1">Create User</Button>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
