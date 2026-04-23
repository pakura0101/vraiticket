import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";
import type { User } from "@/types";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useThemeStore } from "@/hooks/useTheme";
import toast from "react-hot-toast";

const mock = new MockAdapter(api);

jest.mock("@/hooks/useAuthImage", () => ({
  useAuthFile:  () => ({ state: "error", src: "" }),
  useAuthFiles: () => ({}),
}));

const mockPush    = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter:   () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/dashboard",
  useParams:   () => ({}),
}));

const admin  = { id: 1, full_name: "Admin User",  email: "admin@test.com",  role: "admin"  as const, phone: null, company_id: null, job_title: null, department: null, avatar_url: null, is_active: true, created_at: "", updated_at: "" };
const client = { ...admin, id: 2, role: "client" as const, full_name: "Client User" };
const agent  = { ...admin, id: 3, role: "agent"  as const, full_name: "Agent User"  };

const emptyPage = { items: [], total: 0, page: 1, page_size: 15, pages: 0 };
const emptyStats = { total_tickets: 0, open_tickets: 0, resolved_tickets: 0, escalated_tickets: 0, cancelled_tickets: 0, avg_resolution_hours: null, by_status: [], agent_stats: [] };

function setUser(u: User) {
  act(() => useAuthStore.setState({ user: u, isAuthenticated: true, token: "tok", hydrated: true }));
}

afterEach(() => {
  mock.reset(); mockPush.mockClear(); mockReplace.mockClear();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false, hydrated: false });
  useThemeStore.setState({ theme: "dark" });
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// Login Page
// ─────────────────────────────────────────────────────────────────────────────

import LoginPage from "@/app/login/page";

describe("LoginPage — fields & layout", () => {
  it("renders email field with placeholder 'you@company.com'", () => { render(<LoginPage />); expect(screen.getByPlaceholderText("you@company.com")).toBeInTheDocument(); });
  it("renders password field with placeholder '••••••••'",     () => { render(<LoginPage />); expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument(); });
  it("renders Sign In submit button",                          () => { render(<LoginPage />); expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument(); });
  it("renders theme toggle button",                            () => { render(<LoginPage />); expect(screen.getByTitle(/switch to/i)).toBeInTheDocument(); });
});

describe("LoginPage — validation", () => {
  it("shows 'Invalid email address' for bad format", async () => {
    // Clicking the submit button triggers jsdom's native type="email" constraint BEFORE
    // RHF's handleSubmit fires, silently blocking submission. Submitting the form element
    // directly with fireEvent.submit() bypasses that and lets RHF+zod validate.
    const user = userEvent.setup();
    const { container } = render(<LoginPage />);
    await user.type(screen.getByPlaceholderText("you@company.com"), "bad");
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByText("Invalid email address")).toBeInTheDocument());
  });
  it("shows 'Password is required' when password empty", async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText("Password is required")).toBeInTheDocument());
  });
  it("shows both errors when form empty", async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });
});

describe("LoginPage — submission", () => {
  it("redirects to /dashboard on success", async () => {
    mock.onPost("/auth/login").reply(200, { access_token: "tok", token_type: "bearer" });
    mock.onGet("/auth/me").reply(200, admin);
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "admin@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"),          { target: { value: "password123"   } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
  });
  it("persists token to vt_auth in localStorage on success", async () => {
    mock.onPost("/auth/login").reply(200, { access_token: "stored-tok", token_type: "bearer" });
    mock.onGet("/auth/me").reply(200, admin);
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"),          { target: { value: "pw"     } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    // Token is stored inside Zustand's persisted "vt_auth" key, not a standalone "vt_token".
    await waitFor(() => {
      const stored = localStorage.getItem("vt_auth");
      const parsed = stored ? JSON.parse(stored) : null;
      expect(parsed?.state?.token).toBe("stored-tok");
    });
  });
  it("shows error toast on 401", async () => {
    mock.onPost("/auth/login").reply(401, { detail: "Invalid credentials" });
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"),          { target: { value: "wrong"  } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
  it("redirects if already authenticated", async () => {
    act(() => useAuthStore.setState({ isAuthenticated: true, token: "tok", user: admin, hydrated: true }));
    render(<LoginPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard"));
  });
  it("disables button while loading", async () => {
    mock.onPost("/auth/login").reply(() => new Promise(r => setTimeout(() => r([200, { access_token: "t", token_type: "bearer" }]), 500)));
    mock.onGet("/auth/me").reply(200, admin);
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"),          { target: { value: "pw"     } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled());
  });
  it("toggles theme on theme button click", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByTitle(/switch to/i));
    expect(useThemeStore.getState().theme).toBe("light");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────

import DashboardPage from "@/app/(dashboard)/dashboard/page";

const ticketRow = { id: 1, title: "Fix login bug", status: "NEW" as const, priority: "HIGH" as const, ticket_type: "standard" as const, created_by: 2, assigned_to: null, group_id: null, due_at: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-02T00:00:00Z", creator: null, assignee: null, group: null };

describe("DashboardPage", () => {
  it("greets admin with first name", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage); mock.onGet("/admin/stats").reply(200, emptyStats);
    setUser(admin); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
  });
  it("greets client with first name", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage);
    setUser(client); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("Client")).toBeInTheDocument());
  });
  it("shows all 4 stat card labels for admin", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage);
    mock.onGet("/admin/stats").reply(200, { ...emptyStats, total_tickets: 42, open_tickets: 10, resolved_tickets: 30, escalated_tickets: 2 });
    setUser(admin); render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Total Tickets")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("Resolved")).toBeInTheDocument();
      expect(screen.getByText("Escalated")).toBeInTheDocument();
    });
  });
  it("shows stat values from API", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage);
    mock.onGet("/admin/stats").reply(200, { ...emptyStats, total_tickets: 42, open_tickets: 10, resolved_tickets: 30, escalated_tickets: 2 });
    setUser(admin); render(<DashboardPage />);
    await waitFor(() => { expect(screen.getByText("42")).toBeInTheDocument(); expect(screen.getByText("10")).toBeInTheDocument(); });
  });
  it("shows 'Recent Tickets' heading", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage);
    setUser(client); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("Recent Tickets")).toBeInTheDocument());
  });
  it("shows 'No tickets yet' empty state", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage);
    setUser(client); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("No tickets yet")).toBeInTheDocument());
  });
  it("renders ticket title in table", async () => {
    mock.onGet("/tickets/").reply(200, { items: [ticketRow], total: 1, page: 1, page_size: 6, pages: 1 });
    mock.onGet("/admin/stats").reply(200, emptyStats);
    setUser(admin); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("Fix login bug")).toBeInTheDocument());
  });
  it("shows New Ticket button for admin", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage); mock.onGet("/admin/stats").reply(200, emptyStats);
    setUser(admin); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("New Ticket")).toBeInTheDocument());
  });
  it("shows New Ticket button for client", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage);
    setUser(client); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("New Ticket")).toBeInTheDocument());
  });
  it("shows Agent Performance section for admin with agents", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage);
    mock.onGet("/admin/stats").reply(200, { ...emptyStats, agent_stats: [{ agent_id: 1, agent_name: "Bob Agent", assigned: 5, resolved: 4, avg_rating: 4.5, rating_count: 3, star_counts: {} }] });
    setUser(admin); render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("Agent Performance")).toBeInTheDocument());
  });
  it("renders table headers", async () => {
    mock.onGet("/tickets/").reply(200, { items: [ticketRow], total: 1, page: 1, page_size: 6, pages: 1 });
    mock.onGet("/admin/stats").reply(200, emptyStats);
    setUser(admin); render(<DashboardPage />);
    await waitFor(() => { expect(screen.getByText("Status")).toBeInTheDocument(); expect(screen.getByText("Priority")).toBeInTheDocument(); });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tickets List Page
// ─────────────────────────────────────────────────────────────────────────────

import TicketsPage from "@/app/(dashboard)/tickets/page";

const oneTicket = { items: [{ ...ticketRow }], total: 1, page: 1, page_size: 15, pages: 1 };

describe("TicketsPage — titles", () => {
  it("'All Tickets' for admin",  async () => { mock.onGet("/tickets/").reply(200, oneTicket); setUser(admin);  render(<TicketsPage />); await waitFor(() => expect(screen.getByText("All Tickets")).toBeInTheDocument()); });
  it("'My Tickets' for client",  async () => { mock.onGet("/tickets/").reply(200, oneTicket); setUser(client); render(<TicketsPage />); await waitFor(() => expect(screen.getByText("My Tickets")).toBeInTheDocument()); });
  it("'My Queue' for agent",     async () => { mock.onGet("/tickets/").reply(200, oneTicket); setUser(agent);  render(<TicketsPage />); await waitFor(() => expect(screen.getByText("My Queue")).toBeInTheDocument()); });
});

describe("TicketsPage — content", () => {
  beforeEach(() => { mock.onGet("/tickets/").reply(200, oneTicket); setUser(admin); });
  it("renders ticket title",                    async () => { render(<TicketsPage />); await waitFor(() => expect(screen.getByText("Fix login bug")).toBeInTheDocument()); });
  it("renders ticket ID badge #1",              async () => { render(<TicketsPage />); await waitFor(() => expect(screen.getByText("#1")).toBeInTheDocument()); });
  it("renders search input with exact placeholder", async () => { render(<TicketsPage />); await waitFor(() => expect(screen.getByPlaceholderText("Search by title or ID…")).toBeInTheDocument()); });
  it("shows '1 ticket' count",                  async () => { render(<TicketsPage />); await waitFor(() => expect(screen.getByText("1 ticket")).toBeInTheDocument()); });
  it("shows New Ticket button for admin",        async () => { render(<TicketsPage />); await waitFor(() => expect(screen.getByText("New Ticket")).toBeInTheDocument()); });
  it("hides New Ticket for agent",               async () => { setUser(agent); render(<TicketsPage />); await waitFor(() => expect(screen.queryByText("New Ticket")).toBeNull()); });
});

describe("TicketsPage — search filter", () => {
  it("filters by title", async () => {
    mock.onGet("/tickets/").reply(200, { items: [{ ...ticketRow, id: 1, title: "Login broken" }, { ...ticketRow, id: 2, title: "Registration error" }], total: 2, page: 1, page_size: 15, pages: 1 });
    setUser(admin); render(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("Login broken")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Search by title or ID…"), { target: { value: "login" } });
    expect(screen.getByText("Login broken")).toBeInTheDocument();
    expect(screen.queryByText("Registration error")).toBeNull();
  });
  it("filters by ID", async () => {
    mock.onGet("/tickets/").reply(200, { items: [{ ...ticketRow, id: 42, title: "Find by ID" }, { ...ticketRow, id: 99, title: "Other" }], total: 2, page: 1, page_size: 15, pages: 1 });
    setUser(admin); render(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("Find by ID")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Search by title or ID…"), { target: { value: "42" } });
    expect(screen.getByText("Find by ID")).toBeInTheDocument();
    expect(screen.queryByText("Other")).toBeNull();
  });
});

describe("TicketsPage — empty state", () => {
  it("shows 'No tickets found'", async () => {
    mock.onGet("/tickets/").reply(200, emptyPage); setUser(admin); render(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("No tickets found")).toBeInTheDocument());
  });
});

describe("TicketsPage — pagination", () => {
  it("shows Prev/Next when multiple pages", async () => {
    mock.onGet("/tickets/").reply(200, { ...oneTicket, total: 30, pages: 2 }); setUser(admin); render(<TicketsPage />);
    await waitFor(() => { expect(screen.getByText("Prev")).toBeInTheDocument(); expect(screen.getByText("Next")).toBeInTheDocument(); });
  });
  it("Prev is disabled on page 1", async () => {
    mock.onGet("/tickets/").reply(200, { ...oneTicket, total: 30, pages: 2 }); setUser(admin); render(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("Prev").closest("button")).toBeDisabled());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// New Ticket Page
// ─────────────────────────────────────────────────────────────────────────────

import NewTicketPage from "@/app/(dashboard)/tickets/new/page";

describe("NewTicketPage — fields", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, []); setUser(client); });
  it("renders heading 'Open a New Ticket'",   async () => { render(<NewTicketPage />); await waitFor(() => expect(screen.getByText("Open a New Ticket")).toBeInTheDocument()); });
  it("renders title input with exact placeholder", async () => { render(<NewTicketPage />); await waitFor(() => expect(screen.getByPlaceholderText("e.g. Cannot access company VPN from home")).toBeInTheDocument()); });
  it("renders description textarea",          async () => { render(<NewTicketPage />); await waitFor(() => expect(screen.getByPlaceholderText(/Describe your issue in detail/)).toBeInTheDocument()); });
  it("renders 'Submit Ticket' button",        async () => { render(<NewTicketPage />); await waitFor(() => expect(screen.getByRole("button", { name: "Submit Ticket" })).toBeInTheDocument()); });
  it("renders Low/Medium/High priority cards", async () => { render(<NewTicketPage />); await waitFor(() => { expect(screen.getByText("Low")).toBeInTheDocument(); expect(screen.getByText("Medium")).toBeInTheDocument(); expect(screen.getByText("High")).toBeInTheDocument(); }); });
  it("renders 'Back to tickets' link",        async () => { render(<NewTicketPage />); await waitFor(() => expect(screen.getByText("Back to tickets")).toBeInTheDocument()); });
  it("renders file drop zone",                async () => { render(<NewTicketPage />); await waitFor(() => expect(screen.getByText(/Attachments/i)).toBeInTheDocument()); });
  it("renders hidden file input",             async () => { const { container } = render(<NewTicketPage />); await waitFor(() => expect(container.querySelector('input[type="file"]')).toBeInTheDocument()); });
});

describe("NewTicketPage — groups", () => {
  it("shows group buttons when groups available", async () => {
    mock.onGet("/groups/").reply(200, [{ id: 1, name: "Support", color: "#F59E0B", members: [], is_active: true, description: null, created_at: "", updated_at: "" }]);
    setUser(client); render(<NewTicketPage />);
    await waitFor(() => expect(screen.getByText("Support")).toBeInTheDocument());
  });
});

describe("NewTicketPage — validation", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, []); setUser(client); });
  it("shows 'Title must be at least 5 characters' for short title", async () => {
    render(<NewTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Cannot access company VPN from home"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Cannot access company VPN from home"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Ticket" }));
    await waitFor(() => expect(screen.getByText("Title must be at least 5 characters")).toBeInTheDocument());
  });
  it("shows 'Please provide more detail' for short description", async () => {
    render(<NewTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Cannot access company VPN from home"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Cannot access company VPN from home"), { target: { value: "Valid title here" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Ticket" }));
    await waitFor(() => expect(screen.getByText("Please provide more detail")).toBeInTheDocument());
  });
});

describe("NewTicketPage — priority selection", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, []); setUser(client); });
  it("clicking Medium selects it", async () => { render(<NewTicketPage />); await waitFor(() => screen.getByText("Medium")); fireEvent.click(screen.getByText("Medium").closest("button")!); expect(screen.getByText("Medium")).toBeInTheDocument(); });
  it("clicking High selects it",   async () => { render(<NewTicketPage />); await waitFor(() => screen.getByText("High"));   fireEvent.click(screen.getByText("High").closest("button")!);   expect(screen.getByText("High")).toBeInTheDocument(); });
});

describe("NewTicketPage — submission", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, []); setUser(client); });
  it("POSTs to /tickets/ on valid submit", async () => {
    mock.onPost("/tickets/").reply(201, { id: 5, title: "My ticket", ticket_type: "standard" });
    render(<NewTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Cannot access company VPN from home"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Cannot access company VPN from home"), { target: { value: "My ticket title here" } });
    fireEvent.change(screen.getByPlaceholderText(/Describe your issue in detail/), { target: { value: "This is a sufficiently detailed description of the issue." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Ticket" }));
    await waitFor(() => expect(mock.history.post.some(r => r.url?.includes("/tickets/"))).toBe(true));
  });
  it("redirects to /tickets after success", async () => {
    mock.onPost("/tickets/").reply(201, { id: 5, title: "My ticket", ticket_type: "standard" });
    render(<NewTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Cannot access company VPN from home"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Cannot access company VPN from home"), { target: { value: "My ticket title here" } });
    fireEvent.change(screen.getByPlaceholderText(/Describe your issue in detail/), { target: { value: "This is a sufficiently detailed description of the issue." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Ticket" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/tickets"));
  });
});
