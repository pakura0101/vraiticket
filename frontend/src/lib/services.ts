import { api } from "./api";
import type {
  TokenResponse, LoginRequest, User, UserCreate, UserUpdate,
  Group, GroupCreate, GroupUpdate,
  Company, Ticket, TicketListItem, TicketCreate, TicketUpdate,
  Comment, CommentCreate, TicketLog, Rating, RatingCreate,
  Attachment, SystemStats, PaginatedResponse,
} from "@/types";

export const authAPI = {
  login: (data: LoginRequest) => api.post<TokenResponse>("/auth/login", data).then(r => r.data),
  me:    ()                   => api.get<User>("/auth/me").then(r => r.data),
};

export const usersAPI = {
  list:   (params?: { page?: number; page_size?: number; role?: string }) =>
    api.get<PaginatedResponse<User>>("/users/", { params }).then(r => r.data),
  get:    (id: number) => api.get<User>(`/users/${id}`).then(r => r.data),
  create: (data: UserCreate) => api.post<User>("/users/", data).then(r => r.data),
  update: (id: number, data: UserUpdate) => api.patch<User>(`/users/${id}`, data).then(r => r.data),

  /** Upload or replace a user's avatar. Returns updated User. */
  uploadAvatar: (userId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<User>(`/users/${userId}/avatar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },
};

export const companiesAPI = {
  list:   () => api.get<Company[]>("/companies/").then(r => r.data),
  get:    (id: number) => api.get<Company>(`/companies/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string; domain?: string }) =>
    api.post<Company>("/companies/", data).then(r => r.data),
  update: (id: number, data: { name?: string; description?: string; domain?: string; is_active?: boolean }) =>
    api.patch<Company>(`/companies/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/companies/${id}`),
};

export const groupsAPI = {
  list:   () => api.get<Group[]>("/groups/").then(r => r.data),
  get:    (id: number) => api.get<Group>(`/groups/${id}`).then(r => r.data),
  create: (data: GroupCreate) => api.post<Group>("/groups/", data).then(r => r.data),
  update: (id: number, data: GroupUpdate) => api.patch<Group>(`/groups/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/groups/${id}`),
};

export const ticketsAPI = {
  list: (params?: {
    page?: number; page_size?: number; status?: string; priority?: string;
    group_id?: number; assigned_to?: number; ticket_type?: string;
  }) => api.get<PaginatedResponse<TicketListItem>>("/tickets/", { params }).then(r => r.data),

  get:        (id: number)                     => api.get<Ticket>(`/tickets/${id}`).then(r => r.data),
  create:     (data: TicketCreate)             => api.post<Ticket>("/tickets/", data).then(r => r.data),
  update:     (id: number, data: TicketUpdate) => api.patch<Ticket>(`/tickets/${id}`, data).then(r => r.data),
  selfAssign: (id: number)                     => api.post<Ticket>(`/tickets/${id}/assign`).then(r => r.data),
  escalate:   (id: number, targetAgentId: number) =>
    api.post<Ticket>(`/tickets/${id}/escalate`, { target_agent_id: targetAgentId }).then(r => r.data),
  cancel:     (id: number)                     => api.post<Ticket>(`/tickets/${id}/cancel`).then(r => r.data),

  logs:       (id: number) => api.get<TicketLog[]>(`/tickets/${id}/logs`).then(r => r.data),
  comments:   (id: number) => api.get<Comment[]>(`/tickets/${id}/comments`).then(r => r.data),
  addComment: (id: number, data: CommentCreate) => api.post<Comment>(`/tickets/${id}/comments`, data).then(r => r.data),
  rate:       (id: number, data: RatingCreate)  => api.post<Rating>(`/tickets/${id}/rate`, data).then(r => r.data),

  uploadAttachment: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<Attachment>(`/tickets/${id}/attachments`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },

  downloadAttachment: (ticketId: number, attachmentId: number) =>
    api.get(`/tickets/${ticketId}/attachments/${attachmentId}/download`, {
      responseType: "blob",
    }).then(r => r.data as Blob),
};

export const adminAPI = {
  stats:      () => api.get<SystemStats>("/admin/stats").then(r => r.data),
  triggerSLA: () => api.post<{ escalated_count: number; message: string }>("/admin/sla/check").then(r => r.data),
};
