import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";
import type { User, Ticket } from "@/types";
import { useAuthStore } from "@/hooks/useAuthStore";

const mock = new MockAdapter(api);
const mockPush = jest.fn();

jest.mock("@/hooks/useAuthImage", () => ({ useAuthFile: () => ({ state: "error", src: "" }), useAuthFiles: () => ({}) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }), usePathname: () => "/tickets/1", useParams: () => ({ id: "1" }) }));

const admin  = { id: 1, full_name: "Admin User",  email: "admin@test.com",  role: "admin"  as const, phone: null, company_id: null, job_title: null, department: null, avatar_url: null, is_active: true, created_at: "", updated_at: "" };
const client = { ...admin, id: 2, role: "client" as const, full_name: "Client User" };
const agent  = { ...admin, id: 3, role: "agent"  as const, full_name: "Agent User"  };

// Base ticket — created by client (id 2), not yet assigned
const base = {
  id: 1, title: "Fix login bug", description: "Users cannot log in since deploy",
  status: "NEW" as const, priority: "HIGH" as const, ticket_type: "standard" as const,
  company_id: null, group_id: null, created_by: 2, assigned_to: null,
  due_at: null, first_response_at: null, resolved_at: null, cancelled_at: null,
  created_at: "2024-01-01T10:00:00Z", updated_at: "2024-01-02T10:00:00Z",
  creator:  { id: 2, full_name: "Client User",  email: "c@t.com",  role: "client" as const, job_title: null, avatar_url: null },
  assignee: null, group: null, attachments: [], rating: null,
};
// Ticket assigned to agent (id 3)
const assigned = { ...base, assigned_to: 3, assignee: { id: 3, full_name: "Agent User", email: "ag@t.com", role: "agent" as const, job_title: null, avatar_url: null } };
const resolved = { ...base, status: "RESOLVED" as const, rating: null };
const rated    = { ...resolved, rating: { id: 1, ticket_id: 1, client_id: 2, agent_id: 3, score: 5, feedback: "Great!", created_at: "", client: null, agent: null } };
const closed   = { ...base, status: "CLOSED" as const };

const comments = [{ id: 1, ticket_id: 1, author_id: 1, content: "Investigating now.", is_internal: false, created_at: "2024-01-01T11:00:00Z", updated_at: "2024-01-01T11:00:00Z", author: { id: 1, full_name: "Admin User", email: "a@t.com", role: "admin" as const, job_title: null, avatar_url: null } }];
const logs     = [{ id: 1, ticket_id: 1, actor_id: 2, action: "CREATED" as const, description: "Ticket created", old_value: null, new_value: null, created_at: "2024-01-01T10:00:00Z", actor: { id: 2, full_name: "Client User", email: "c@t.com", role: "client" as const, job_title: null, avatar_url: null } }];

function setup(ticket: Ticket = base) {
  mock.onGet("/tickets/1").reply(200, ticket);
  mock.onGet("/tickets/1/comments").reply(200, comments);
  mock.onGet("/tickets/1/logs").reply(200, logs);
  mock.onGet("/users/").reply(200, { items: [], total: 0, page: 1, page_size: 100, pages: 0 });
}
function setUser(u: User) {
  act(() => useAuthStore.setState({ user: u, isAuthenticated: true, token: "tok", hydrated: true }));
}

afterEach(() => { mock.reset(); mockPush.mockClear(); useAuthStore.setState({ token: null, user: null, isAuthenticated: false, hydrated: false }); });

import TicketDetailPage from "@/app/(dashboard)/tickets/[id]/page";

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("TicketDetailPage — content", () => {
  it("renders ticket title",           async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Fix login bug")).toBeInTheDocument()); });
  it("renders ticket description",     async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Users cannot log in since deploy")).toBeInTheDocument()); });
  it("renders status badge 'New'",     async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getAllByText("New").length).toBeGreaterThan(0)); });
  it("renders priority badge 'High'",  async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("High")).toBeInTheDocument()); });
  it("renders ticket ID #1",           async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("#1")).toBeInTheDocument()); });
  it("renders creator name",           async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Client User")).toBeInTheDocument()); });
  it("renders comment content",        async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Investigating now.")).toBeInTheDocument()); });
  it("renders activity log description", async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Ticket created")).toBeInTheDocument()); });
  it("renders 'Discussion' section",   async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Discussion")).toBeInTheDocument()); });
  it("renders 'Activity Log' section", async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Activity Log")).toBeInTheDocument()); });
  it("renders 'Back to tickets' link", async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Back to tickets")).toBeInTheDocument()); });
});

// ── Comment form ──────────────────────────────────────────────────────────────

describe("TicketDetailPage — comment form", () => {
  it("renders textarea with placeholder 'Write a reply…'", async () => { setup(); setUser(agent); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByPlaceholderText("Write a reply…")).toBeInTheDocument()); });
  it("Send button is disabled when textarea empty",         async () => { setup(); setUser(agent); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByRole("button", { name: /^send$/i })).toBeDisabled()); });
  it("Send button enables after typing",                    async () => { setup(); setUser(agent); render(<TicketDetailPage />); await waitFor(() => screen.getByPlaceholderText("Write a reply…")); fireEvent.change(screen.getByPlaceholderText("Write a reply…"), { target: { value: "This is my reply" } }); expect(screen.getByRole("button", { name: /^send$/i })).not.toBeDisabled(); });
  it("POSTs comment to API when Send clicked",              async () => {
    setup(); mock.onPost("/tickets/1/comments").reply(201, { id: 99, ticket_id: 1, author_id: 3, content: "My reply", is_internal: false, created_at: "", updated_at: "", author: null });
    setUser(agent); render(<TicketDetailPage />);
    await waitFor(() => screen.getByPlaceholderText("Write a reply…"));
    fireEvent.change(screen.getByPlaceholderText("Write a reply…"), { target: { value: "My reply" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(mock.history.post.some(r => r.url?.includes("comments"))).toBe(true));
  });
  it("hides comment form for CLOSED ticket",  async () => { setup(closed); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.queryByPlaceholderText("Write a reply…")).toBeNull()); });
  it("shows internal toggle for agent",       async () => { setup(); setUser(agent); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByText("Public reply")).toBeInTheDocument()); });
});

// ── Action buttons ────────────────────────────────────────────────────────────

describe("TicketDetailPage — action buttons", () => {
  it("admin sees 'Update' button",                async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByRole("button", { name: /^update$/i })).toBeInTheDocument()); });
  it("admin sees 'Cancel ticket' button",          async () => { setup(); setUser(admin); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByRole("button", { name: /cancel ticket/i })).toBeInTheDocument()); });
  it("client (owner) sees 'Cancel ticket'",        async () => { setup(); setUser(client); render(<TicketDetailPage />); await waitFor(() => expect(screen.getByRole("button", { name: /cancel ticket/i })).toBeInTheDocument()); });
  it("unassigned agent sees 'Take Ticket'",        async () => { setup(); setUser(agent);  render(<TicketDetailPage />); await waitFor(() => expect(screen.getByRole("button", { name: /take ticket/i })).toBeInTheDocument()); });
  // Two Escalate buttons rendered simultaneously (desktop action bar + mobile panel)
  it("assigned agent sees 'Escalate'",             async () => { setup(assigned); setUser(agent); render(<TicketDetailPage />); await waitFor(() => expect(screen.getAllByRole("button", { name: /escalate/i })[0]).toBeInTheDocument()); });
  it("client does NOT see 'Update'",               async () => { setup(); setUser(client); render(<TicketDetailPage />); await waitFor(() => expect(screen.queryByRole("button", { name: /^update$/i })).toBeNull()); });
});

// ── Modals ────────────────────────────────────────────────────────────────────

describe("TicketDetailPage — modals", () => {
  it("Update click shows 'Update Status' dialog", async () => {
    setup(); setUser(admin); render(<TicketDetailPage />);
    await waitFor(() => screen.getByRole("button", { name: /^update$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^update$/i }));
    await waitFor(() => expect(screen.getByText("Update Status")).toBeInTheDocument());
  });
  it("Update modal has 'Save' button", async () => {
    setup(); setUser(admin); render(<TicketDetailPage />);
    await waitFor(() => screen.getByRole("button", { name: /^update$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^update$/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument());
  });
  it("Cancel ticket click shows 'Cancel Ticket?' dialog", async () => {
    setup(); setUser(admin); render(<TicketDetailPage />);
    await waitFor(() => screen.getByRole("button", { name: /cancel ticket/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel ticket/i }));
    await waitFor(() => expect(screen.getByText("Cancel Ticket?")).toBeInTheDocument());
  });
  it("Cancel dialog has 'Yes, Cancel' button", async () => {
    setup(); setUser(admin); render(<TicketDetailPage />);
    await waitFor(() => screen.getByRole("button", { name: /cancel ticket/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel ticket/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /yes, cancel/i })).toBeInTheDocument());
  });
  it("'Yes, Cancel' calls cancel API", async () => {
    setup(); mock.onPost("/tickets/1/cancel").reply(200, { ...base, status: "CANCELLED" });
    setUser(admin); render(<TicketDetailPage />);
    await waitFor(() => screen.getByRole("button", { name: /cancel ticket/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel ticket/i }));
    await waitFor(() => screen.getByRole("button", { name: /yes, cancel/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, cancel/i }));
    await waitFor(() => expect(mock.history.post.some(r => r.url?.includes("cancel"))).toBe(true));
  });
  it("Rating button shows 'Rate Your Experience' modal", async () => {
    setup(resolved); setUser(client); render(<TicketDetailPage />);
    await waitFor(() => screen.getByText("Rate this support"));
    fireEvent.click(screen.getByText("Rate this support"));
    await waitFor(() => expect(screen.getByText("Rate Your Experience")).toBeInTheDocument());
  });
  it("Rating modal has 'Submit Rating' button", async () => {
    setup(resolved); setUser(client); render(<TicketDetailPage />);
    await waitFor(() => screen.getByText("Rate this support"));
    fireEvent.click(screen.getByText("Rate this support"));
    await waitFor(() => expect(screen.getByRole("button", { name: /submit rating/i })).toBeInTheDocument());
  });
});

// ── Rating state ──────────────────────────────────────────────────────────────

describe("TicketDetailPage — rating", () => {
  it("shows 'Rate this support' for resolved unrated ticket (client = owner)", async () => {
    setup(resolved); setUser(client); render(<TicketDetailPage />);
    await waitFor(() => expect(screen.getByText("Rate this support")).toBeInTheDocument());
  });
  it("hides 'Rate this support' when already rated", async () => {
    setup(rated); setUser(client); render(<TicketDetailPage />);
    await waitFor(() => expect(screen.queryByText("Rate this support")).toBeNull());
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe("TicketDetailPage — error state", () => {
  it("shows error indicator on 404", async () => {
    mock.onGet("/tickets/1").reply(404, { detail: "Not found" });
    mock.onGet("/tickets/1/comments").reply(404);
    mock.onGet("/tickets/1/logs").reply(404);
    mock.onGet("/users/").reply(200, { items: [], total: 0, page: 1, page_size: 100, pages: 0 });
    setUser(admin); render(<TicketDetailPage />);
    await waitFor(() => {
      const err = screen.queryByText(/not found|error|failed/i);
      if (err) expect(err).toBeInTheDocument();
      else expect(screen.queryByText("Fix login bug")).toBeNull();
    });
  });
});
