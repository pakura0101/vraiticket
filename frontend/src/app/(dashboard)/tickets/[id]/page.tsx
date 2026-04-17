"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, User, Tag, Lock, Send, Star, AlertTriangle,
  ChevronDown, CheckCircle2, XCircle, UserCheck, Users2, ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { ticketsAPI, usersAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badges";
import { Avatar, Button, Modal, Select, Spinner, Textarea, EmptyState } from "@/components/ui";
import { AuthAvatar } from "@/components/ui/AuthAvatar";
import { AttachmentGallery } from "@/components/tickets/AttachmentGallery";
import {
  formatDate, timeAgo, isOverdue,
  AGENT_EDITABLE_STATUSES, ADMIN_EDITABLE_STATUSES, STATUS_CONFIG,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Ticket, Comment, TicketLog, User as UserType } from "@/types";

export default function TicketDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router   = useRouter();

  const [ticket,   setTicket]   = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs,     setLogs]     = useState<TicketLog[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [agents,   setAgents]   = useState<UserType[]>([]);

  // Comment state
  const [commentText,    setCommentText]    = useState("");
  const [isInternal,     setIsInternal]     = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Rating state
  const [ratingOpen,     setRatingOpen]     = useState(false);
  const [ratingScore,    setRatingScore]    = useState(0);
  const [hoverScore,     setHoverScore]     = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingLoading,  setRatingLoading]  = useState(false);

  // Update status (agent/admin)
  const [updateOpen,    setUpdateOpen]    = useState(false);
  const [newStatus,     setNewStatus]     = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  // Escalate to another agent
  const [escalateOpen,    setEscalateOpen]    = useState(false);
  const [escalateTarget,  setEscalateTarget]  = useState("");
  const [escalateLoading, setEscalateLoading] = useState(false);

  // Cancel (client/admin only)
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // Self-assign
  const [assignLoading, setAssignLoading] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const [t, c, l] = await Promise.all([
        ticketsAPI.get(Number(id)),
        ticketsAPI.comments(Number(id)),
        ticketsAPI.logs(Number(id)),
      ]);
      setTicket(t);
      setComments(c);
      setLogs(l);
      setNewStatus(t.status);
    } catch {
      toast.error("Ticket not found");
      router.push("/tickets");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadTicket(); }, [loadTicket]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "agent") {
      usersAPI.list({ role: "agent", page_size: 100 })
        .then(r => setAgents(r.items))
        .catch(() => {});
    }
  }, [user]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function submitComment() {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const c = await ticketsAPI.addComment(Number(id), {
        content: commentText, is_internal: isInternal,
      });
      setComments(prev => [...prev, c]);
      setCommentText("");
      setIsInternal(false);
      toast.success("Comment added");
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCommentLoading(false); }
  }

  async function submitRating() {
    if (ratingScore === 0) { toast.error("Please select a star rating"); return; }
    setRatingLoading(true);
    try {
      await ticketsAPI.rate(Number(id), {
        score: ratingScore, feedback: ratingFeedback || undefined,
      });
      toast.success("Thank you for your feedback!");
      setRatingOpen(false);
      loadTicket();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setRatingLoading(false); }
  }

  async function submitUpdate() {
    if (!ticket) return;
    setUpdateLoading(true);
    try {
      await ticketsAPI.update(Number(id), { status: newStatus as Ticket["status"] });
      toast.success("Ticket updated");
      setUpdateOpen(false);
      loadTicket();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setUpdateLoading(false); }
  }

  async function submitEscalate() {
    if (!escalateTarget) { toast.error("Select an agent to escalate to"); return; }
    setEscalateLoading(true);
    try {
      await ticketsAPI.escalate(Number(id), Number(escalateTarget));
      toast.success("Ticket escalated");
      setEscalateOpen(false);
      setEscalateTarget("");
      loadTicket();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setEscalateLoading(false); }
  }

  async function handleSelfAssign() {
    setAssignLoading(true);
    try {
      await ticketsAPI.selfAssign(Number(id));
      toast.success("Ticket assigned to you!");
      loadTicket();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setAssignLoading(false); }
  }

  async function handleCancel() {
    setCancelLoading(true);
    try {
      await ticketsAPI.cancel(Number(id));
      toast.success("Ticket cancelled");
      setCancelConfirm(false);
      loadTicket();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCancelLoading(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-6 h-6 text-amber-400" />
    </div>
  );
  if (!ticket) return null;

  const isResolved   = ticket.status === "RESOLVED";
  const isClosed     = ticket.status === "CLOSED";
  const isCancelled  = ticket.status === "CANCELLED";
  const isTerminal   = isResolved || isClosed || isCancelled;

  // Role-based visibility
  const isOwner       = user?.role === "client" && ticket.created_by === user.id;
  const isAssignedAgent = user?.role === "agent" && ticket.assigned_to === user.id;
  const isAdmin       = user?.role === "admin";

  const canModify     = isAssignedAgent || isAdmin;
  const canSelfAssign = (user?.role === "agent" || isAdmin)
    && !ticket.assigned_to
    && !isTerminal;
  // Only agents who own the ticket (or admin) can escalate
  const canEscalate   = (isAssignedAgent || isAdmin) && !isTerminal;
  // Only clients (own ticket) and admins can cancel — not agents
  const canCancel     = !isTerminal && (isOwner || isAdmin);
  const canRate       = isOwner && isResolved && !ticket.rating;
  const canUploadFile = !isCancelled && !isClosed;
  const overdue       = isOverdue(ticket.due_at) && !isTerminal;

  const editableStatuses = isAdmin ? ADMIN_EDITABLE_STATUSES : AGENT_EDITABLE_STATUSES;
  const displayScore  = hoverScore || ratingScore;
  const STAR_LABELS   = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  // Exclude current agent from escalate targets
  const escalateOptions = agents.filter(a => a.id !== user?.id);

  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/tickets"
        className="inline-flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-2)] transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5">

        {/* ── Main ──────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Header card */}
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded">
                    #{ticket.id}
                  </span>
                  {ticket.ticket_type === "internal" && (
                    <span className="badge bg-amber-500/12 text-amber-700 dark:text-amber-400 text-[10px]">
                      <Lock className="w-3 h-3" /> Internal
                    </span>
                  )}
                  {overdue && (
                    <span className="badge bg-rose-500/12 text-rose-700 dark:text-rose-400 text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> SLA Breached
                    </span>
                  )}
                </div>
                <h2 className="font-display text-xl font-bold text-[var(--text)] leading-snug">
                  {ticket.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Opened {timeAgo(ticket.created_at)} by {ticket.creator?.full_name ?? "Unknown"}
                  {ticket.group && (
                    <> · <span style={{ color: ticket.group.color ?? "#9898AA" }}>{ticket.group.name}</span></>
                  )}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <StatusBadge status={ticket.status} />

                {/* Agent: Take Ticket (unassigned) */}
                {canSelfAssign && (
                  <Button variant="secondary" size="sm" onClick={handleSelfAssign} loading={assignLoading}>
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Take Ticket
                  </Button>
                )}

                {/* Agent/admin: Update status */}
                {canModify && !isTerminal && (
                  <Button variant="secondary" size="sm" onClick={() => setUpdateOpen(true)}>
                    Update <ChevronDown className="w-3 h-3" />
                  </Button>
                )}

                {/* Agent/admin: Escalate to another agent */}
                {canEscalate && (
                  <Button variant="secondary" size="sm" onClick={() => setEscalateOpen(true)}>
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" /> Escalate
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
              <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Client CTAs */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {/* Rating CTA — shows prompt if not yet rated, shows result once submitted */}
              {isOwner && isResolved && (
                ticket.rating ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-300 text-sm">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn("w-3.5 h-3.5",
                          s <= ticket.rating!.score ? "fill-amber-400 text-amber-400" : "text-[var(--border)]"
                        )}/>
                      ))}
                    </div>
                    <span>You rated {ticket.rating.score}/5</span>
                  </div>
                ) : (
                  <button onClick={() => setRatingOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-500/15 transition-colors">
                    <Star className="w-4 h-4" /> Rate this support
                  </button>
                )
              )}
              {canCancel && (
                <button onClick={() => setCancelConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-500/15 transition-colors">
                  <XCircle className="w-4 h-4" /> Cancel ticket
                </button>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="card p-6">
            <AttachmentGallery
              ticketId={ticket.id}
              attachments={ticket.attachments ?? []}
              canUpload={canUploadFile}
              onUploaded={loadTicket}
            />
          </div>

          {/* Comments */}
          <div className="card p-6">
            <h3 className="section-title mb-5">
              Discussion
              <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">({comments.length})</span>
            </h3>

            <div className="space-y-3">
              {comments.length === 0
                ? <EmptyState title="No comments yet" description="Add the first comment below." />
                : comments.map(c => (
                  <div key={c.id} className={cn(
                    "flex gap-3 p-4 rounded-xl border",
                    c.is_internal
                      ? "bg-amber-500/5 border-amber-500/15"
                      : "bg-[var(--bg)] border-[var(--border)]"
                  )}>
                    <AuthAvatar
                      name={c.author?.full_name ?? "?"}
                      avatarPath={c.author?.avatar_url}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-[var(--text-2)]">
                          {c.author?.full_name ?? "Unknown"}
                        </span>
                        {c.author?.job_title && (
                          <span className="text-[10px] text-[var(--text-muted)]">{c.author.job_title}</span>
                        )}
                        <span className="text-[10px] text-[var(--text-muted)] capitalize">{c.author?.role}</span>
                        {c.is_internal && (
                          <span className="badge bg-amber-500/12 text-amber-700 dark:text-amber-400 text-[10px]">
                            <Lock className="w-2.5 h-2.5" /> Internal
                          </span>
                        )}
                        <span className="text-xs text-[var(--text-muted)] ml-auto">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-[var(--text-2)] whitespace-pre-wrap leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Comment box — hide for cancelled/closed */}
            {!isCancelled && !isClosed && (
              <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-3">
                <Textarea
                  placeholder={isInternal ? "Write an internal note…" : "Write a reply…"}
                  rows={3}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
                <div className="flex items-center justify-between gap-3">
                  {(user?.role === "agent" || user?.role === "admin") && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        onClick={() => setIsInternal(!isInternal)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all relative cursor-pointer border",
                          isInternal ? "bg-amber-500 border-amber-500" : "bg-[var(--surface-3)] border-[var(--border-2)]"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                          isInternal ? "translate-x-4 left-0.5" : "left-0.5"
                        )} />
                      </div>
                      <span className={cn("text-xs", isInternal ? "text-amber-400" : "text-[var(--text-muted)]")}>
                        {isInternal ? "Internal note" : "Public reply"}
                      </span>
                    </label>
                  )}
                  <Button
                    size="sm"
                    onClick={submitComment}
                    loading={commentLoading}
                    disabled={!commentText.trim()}
                    className="ml-auto"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Audit log */}
          <div className="card p-6">
            <h3 className="section-title mb-5">Activity Log</h3>
            {logs.length === 0
              ? <EmptyState title="No activity recorded" />
              : logs.map((log, i) => (
                <div key={log.id} className="flex gap-3 relative">
                  {i < logs.length - 1 && (
                    <div className="absolute left-[15px] top-7 bottom-0 w-px bg-[var(--surface-3)]" />
                  )}
                  <div className="w-[30px] h-[30px] rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[9px] font-bold text-[var(--text-muted)] z-10 mt-0.5">
                    {log.action.slice(0, 2)}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--text-2)] leading-snug">{log.description}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[var(--text-muted)]">{formatDate(log.created_at)}</span>
                      {log.old_value && log.new_value && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">
                          {log.old_value} → {log.new_value}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Details</h3>

            <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Priority">
              <PriorityBadge priority={ticket.priority} />
            </MetaRow>

            {ticket.group && (
              <MetaRow icon={<Users2 className="w-3.5 h-3.5" />} label="Department">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full"
                    style={{ background: ticket.group.color ?? "#4A4A5E" }} />
                  <span className="text-xs text-[var(--text-2)]">{ticket.group.name}</span>
                </div>
              </MetaRow>
            )}

            <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Reported by">
              {ticket.creator ? (
                <div className="flex items-center gap-2">
                  <AuthAvatar name={ticket.creator.full_name} avatarPath={ticket.creator.avatar_url} size="sm" />
                  <div>
                    <p className="text-xs text-[var(--text-2)]">{ticket.creator.full_name}</p>
                    {ticket.creator.job_title && (
                      <p className="text-[10px] text-[var(--text-muted)]">{ticket.creator.job_title}</p>
                    )}
                  </div>
                </div>
              ) : "—"}
            </MetaRow>

            <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Assigned to">
              {ticket.assignee ? (
                <div className="flex items-center gap-2">
                  <AuthAvatar name={ticket.assignee.full_name} avatarPath={ticket.assignee.avatar_url} size="sm" />
                  <div>
                    <p className="text-xs text-[var(--text-2)]">{ticket.assignee.full_name}</p>
                    {ticket.assignee.job_title && (
                      <p className="text-[10px] text-[var(--text-muted)]">{ticket.assignee.job_title}</p>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Unassigned — open to agents</span>
              )}
            </MetaRow>

            <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Opened">
              <span className="text-xs text-[var(--text-muted)]">{formatDate(ticket.created_at)}</span>
            </MetaRow>

            {ticket.due_at && (
              <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="SLA Deadline">
                <span className={cn("text-xs font-medium", overdue ? "text-rose-400" : "text-[var(--text-muted)]")}>
                  {formatDate(ticket.due_at)}{overdue && " · OVERDUE"}
                </span>
              </MetaRow>
            )}

            {ticket.resolved_at && (
              <MetaRow icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />} label="Resolved">
                <span className="text-xs text-emerald-600 dark:text-emerald-400">{formatDate(ticket.resolved_at)}</span>
              </MetaRow>
            )}

            {ticket.cancelled_at && (
              <MetaRow icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />} label="Cancelled">
                <span className="text-xs text-rose-600 dark:text-rose-400">{formatDate(ticket.cancelled_at)}</span>
              </MetaRow>
            )}
          </div>

          {/* Agent profile card — visible to all roles */}
          {ticket.assignee && (
            <div className="card p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
                Handling Agent
              </h3>
              <div className="flex items-start gap-3">
                <AuthAvatar
                  name={ticket.assignee.full_name}
                  avatarPath={ticket.assignee.avatar_url}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{ticket.assignee.full_name}</p>
                  {ticket.assignee.job_title && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{ticket.assignee.job_title}</p>
                  )}
                  <span className="badge bg-blue-500/12 text-blue-700 dark:text-blue-300 text-[10px] mt-1.5">Agent</span>
                </div>
              </div>
            </div>
          )}

          {ticket.rating && (
            <div className="card p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
                Client Rating
              </h3>
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn("w-4 h-4",
                    s <= ticket.rating!.score ? "text-amber-400 fill-amber-400" : "text-[var(--border)]"
                  )} />
                ))}
                <span className="ml-1.5 font-display font-bold text-amber-400 text-sm">
                  {ticket.rating.score}/5
                </span>
              </div>
              {ticket.rating.feedback && (
                <p className="text-xs text-[var(--text-muted)] italic mt-1">"{ticket.rating.feedback}"</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}

      {/* Update status */}
      <Modal open={updateOpen} onClose={() => setUpdateOpen(false)}
        title="Update Status" description="Change the ticket status.">
        <div className="space-y-4">
          <Select
            label="New Status"
            options={editableStatuses.map(s => ({ value: s, label: STATUS_CONFIG[s].label }))}
            value={newStatus}
            onValueChange={setNewStatus}
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={submitUpdate} loading={updateLoading} className="flex-1">Save</Button>
            <Button variant="secondary" onClick={() => setUpdateOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Escalate to another agent */}
      <Modal open={escalateOpen} onClose={() => setEscalateOpen(false)}
        title="Escalate Ticket"
        description="Transfer this ticket to another agent. Status will be set to Escalated.">
        <div className="space-y-4">
          {escalateOptions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No other agents available to escalate to.</p>
          ) : (
            <div className="space-y-2">
              <label className="label">Select Agent</label>
              <div className="max-h-52 overflow-y-auto space-y-1 border border-[var(--border)] rounded-xl p-2 bg-[var(--bg)]">
                {escalateOptions.map(agent => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setEscalateTarget(String(agent.id))}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      escalateTarget === String(agent.id)
                        ? "bg-rose-500/12 border border-rose-500/30 text-rose-700 dark:text-rose-300"
                        : "hover:bg-[var(--surface-2)] text-[var(--text-muted)] border border-transparent"
                    )}
                  >
                    <AuthAvatar name={agent.full_name} avatarPath={agent.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{agent.full_name}</p>
                      {agent.job_title && (
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{agent.job_title}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={submitEscalate}
              loading={escalateLoading}
              disabled={!escalateTarget}
              variant="danger"
              className="flex-1"
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
            </Button>
            <Button variant="secondary" onClick={() => { setEscalateOpen(false); setEscalateTarget(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel confirmation */}
      <Modal open={cancelConfirm} onClose={() => setCancelConfirm(false)}
        title="Cancel Ticket?" size="sm"
        description="This will close the ticket as cancelled. It cannot be reopened.">
        <div className="flex gap-3 pt-2">
          <Button variant="danger" onClick={handleCancel} loading={cancelLoading} className="flex-1">
            Yes, Cancel
          </Button>
          <Button variant="secondary" onClick={() => setCancelConfirm(false)}>Keep Open</Button>
        </div>
      </Modal>

      {/* Rating */}
      <Modal open={ratingOpen} onClose={() => setRatingOpen(false)}
        title="Rate Your Experience"
        description="How satisfied were you with the support you received?" size="sm">
        <div className="space-y-5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button"
                  onClick={() => setRatingScore(s)}
                  onMouseEnter={() => setHoverScore(s)}
                  onMouseLeave={() => setHoverScore(0)}
                  className="transition-transform hover:scale-125 active:scale-95">
                  <Star className={cn("w-9 h-9 transition-all",
                    s <= displayScore
                      ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                      : "text-[var(--border)] hover:text-amber-400/30"
                  )} />
                </button>
              ))}
            </div>
            {displayScore > 0
              ? <p className="text-sm font-semibold text-amber-400">{STAR_LABELS[displayScore]}</p>
              : <p className="text-sm text-[var(--text-muted)]">Click a star to rate</p>
            }
          </div>
          <Textarea
            label="Feedback (optional)"
            placeholder="Tell us what went well or how we can improve…"
            rows={3}
            value={ratingFeedback}
            onChange={e => setRatingFeedback(e.target.value)}
          />
          <div className="flex gap-3">
            <Button onClick={submitRating} loading={ratingLoading} disabled={ratingScore === 0} className="flex-1">
              Submit Rating
            </Button>
            <Button variant="secondary" onClick={() => setRatingOpen(false)}>Skip</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MetaRow({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[var(--text-muted)] mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-0.5">{label}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}
