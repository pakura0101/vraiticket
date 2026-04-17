export type UserRole = "client" | "agent" | "admin";

export type TicketStatus =
  | "NEW" | "ASSIGNED" | "IN_PROGRESS" | "ON_HOLD"
  | "RESOLVED" | "CLOSED" | "ESCALATED" | "CANCELLED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketType     = "standard" | "internal";

export type LogAction =
  | "CREATED" | "STATUS_CHANGED" | "ASSIGNED" | "PRIORITY_CHANGED"
  | "CATEGORY_CHANGED" | "COMMENT_ADDED" | "ESCALATED" | "RESOLVED"
  | "CLOSED" | "RATED" | "UPDATED";

export interface LoginRequest  { email: string; password: string; }
export interface TokenResponse { access_token: string; token_type: string; }

export interface UserSummary {
  id: number; full_name: string; email: string; role: UserRole;
  job_title: string | null; avatar_url: string | null;
}

export interface User extends UserSummary {
  phone: string | null;
  company_id: number | null;
  job_title: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string; full_name: string; password: string;
  role: UserRole; phone?: string; company_id?: number;
  job_title?: string; department?: string;
  avatar_url?: string;   // optional photo for agents/admins at creation
}

export interface UserUpdate {
  full_name?: string; phone?: string; avatar_url?: string;
  is_active?: boolean; company_id?: number;
  job_title?: string; department?: string;
  role?: UserRole;
  password?: string;
}

export interface Company {
  id: number; name: string; description: string | null;
  domain: string | null; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface Group {
  id: number; name: string; description: string | null;
  color: string | null; is_active: boolean;
  members: UserSummary[];
  created_at: string; updated_at: string;
}

export interface GroupSummary { id: number; name: string; color: string | null; }

export interface GroupCreate {
  name: string; description?: string; color?: string; member_ids?: number[];
}

export interface GroupUpdate {
  name?: string; description?: string; color?: string;
  is_active?: boolean; member_ids?: number[];
}

export interface Attachment {
  id: number; ticket_id: number; uploader_id: number;
  filename: string; mime_type: string; size_bytes: number;
  created_at: string; uploader: UserSummary | null; url: string;
}

export interface Ticket {
  id: number; title: string; description: string;
  status: TicketStatus; priority: TicketPriority; ticket_type: TicketType;
  company_id: number | null;
  group_id: number | null; created_by: number; assigned_to: number | null;
  due_at: string | null; first_response_at: string | null;
  resolved_at: string | null; cancelled_at: string | null;
  created_at: string; updated_at: string;
  creator: UserSummary | null; assignee: UserSummary | null;
  group: GroupSummary | null;
  attachments?: Attachment[];
  rating?: Rating | null;
}

export interface TicketListItem {
  id: number; title: string; status: TicketStatus;
  priority: TicketPriority; ticket_type: TicketType;
  created_by: number; assigned_to: number | null;
  group_id: number | null; due_at: string | null;
  created_at: string; updated_at: string;
  creator: UserSummary | null; assignee: UserSummary | null;
  group: GroupSummary | null;
}

export interface TicketCreate {
  title: string; description: string;
  priority: TicketPriority; ticket_type?: TicketType;
  company_id?: number; group_id?: number;
}

export interface TicketUpdate {
  title?: string; description?: string; status?: TicketStatus;
  priority?: TicketPriority; group_id?: number; assigned_to?: number; due_at?: string;
}

export interface Comment {
  id: number; ticket_id: number; author_id: number;
  content: string; is_internal: boolean;
  created_at: string; updated_at: string; author: UserSummary | null;
}

export interface CommentCreate { content: string; is_internal?: boolean; }

export interface TicketLog {
  id: number; ticket_id: number; actor_id: number | null;
  action: LogAction; description: string | null;
  old_value: string | null; new_value: string | null;
  created_at: string; actor: UserSummary | null;
}

export interface Rating {
  id: number; ticket_id: number; client_id: number; agent_id: number;
  score: number; feedback: string | null; created_at: string;
  client: UserSummary | null; agent: UserSummary | null;
}

export interface RatingCreate { score: number; feedback?: string; }

export interface TicketStatusCount { status: string; count: number; }

export interface AgentStats {
  agent_id: number; agent_name: string;
  assigned: number; resolved: number;
  avg_rating: number | null;
  rating_count: number;
  star_counts: Record<number, number>;
}

export interface SystemStats {
  total_tickets: number; open_tickets: number;
  resolved_tickets: number; escalated_tickets: number;
  cancelled_tickets: number;
  avg_resolution_hours: number | null;
  by_status: TicketStatusCount[]; agent_stats: AgentStats[];
}

export interface Notification {
  id: number; type: string; title: string;
  body: string; time: string; read: boolean;
  ticket_id?: number;
}

export interface PaginatedResponse<T> {
  items: T[]; total: number; page: number; page_size: number; pages: number;
}

export interface APIError { detail: string; }
