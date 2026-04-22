import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useThemeStore } from "@/hooks/useTheme";

const mock = new MockAdapter(api);

jest.mock("@/hooks/useAuthImage", () => ({
  useAuthFile:  () => ({ state: "error", src: "" }),
  useAuthFiles: () => ({}),
}));

const mockPush    = jest.fn();
const mockReplace = jest.fn();
let   mockPath    = "/dashboard";

jest.mock("next/navigation", () => ({
  useRouter:   () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPath,
  useParams:   () => ({}),
}));

const admin  = { id: 1, full_name: "Admin User",  email: "admin@test.com",  role: "admin"  as const, phone: null, company_id: null, job_title: null, department: null, avatar_url: null, is_active: true, created_at: "", updated_at: "" };
const client = { ...admin, id: 2, role: "client" as const, full_name: "Client User" };
const agent  = { ...admin, id: 3, role: "agent"  as const, full_name: "Agent User"  };

function setUser(u: typeof admin) {
  act(() => useAuthStore.setState({ user: u, isAuthenticated: true, token: "tok", hydrated: true }));
}

afterEach(() => {
  mock.reset(); mockPush.mockClear(); mockReplace.mockClear();
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false, hydrated: false });
  useThemeStore.setState({ theme: "dark" });
  mockPath = "/dashboard";
});

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

import { Sidebar } from "@/components/layout/Sidebar";

describe("Sidebar — branding", () => {
  beforeEach(() => setUser(admin));
  // Sidebar renders sidebarContent twice (desktop + mobile drawer), so use getAllByText
  it("renders 'Vrai' brand text",       () => { render(<Sidebar />); expect(screen.getAllByText("Vrai")[0]).toBeInTheDocument(); });
  it("renders 'Ticket' accent text",    () => { render(<Sidebar />); expect(screen.getAllByText("Ticket")[0]).toBeInTheDocument(); });
  it("renders 'Support Suite' tagline", () => { render(<Sidebar />); expect(screen.getAllByText("Support Suite")[0]).toBeInTheDocument(); });
});

describe("Sidebar — navigation (admin)", () => {
  beforeEach(() => setUser(admin));
  it("shows Dashboard",        () => { render(<Sidebar />); expect(screen.getAllByText("Dashboard")[0]).toBeInTheDocument(); });
  it("shows My Tickets",       () => { render(<Sidebar />); expect(screen.getAllByText("My Tickets")[0]).toBeInTheDocument(); });
  it("shows New Ticket",       () => { render(<Sidebar />); expect(screen.getAllByText("New Ticket")[0]).toBeInTheDocument(); });
  it("shows Internal Ticket",  () => { render(<Sidebar />); expect(screen.getAllByText("Internal Ticket")[0]).toBeInTheDocument(); });
  it("shows Stats",            () => { render(<Sidebar />); expect(screen.getAllByText("Stats")[0]).toBeInTheDocument(); });
  it("shows Performance",      () => { render(<Sidebar />); expect(screen.getAllByText("Performance")[0]).toBeInTheDocument(); });
  it("shows Groups",           () => { render(<Sidebar />); expect(screen.getAllByText("Groups")[0]).toBeInTheDocument(); });
  it("shows Companies",        () => { render(<Sidebar />); expect(screen.getAllByText("Companies")[0]).toBeInTheDocument(); });
  it("shows Users",            () => { render(<Sidebar />); expect(screen.getAllByText("Users")[0]).toBeInTheDocument(); });
});

describe("Sidebar — role-based filtering", () => {
  it("client does not see Stats",         () => { setUser(client); render(<Sidebar />); expect(screen.queryByText("Stats")).toBeNull(); });
  it("client does not see Users",         () => { setUser(client); render(<Sidebar />); expect(screen.queryByText("Users")).toBeNull(); });
  it("client does see New Ticket",        () => { setUser(client); render(<Sidebar />); expect(screen.getAllByText("New Ticket")[0]).toBeInTheDocument(); });
  it("agent does not see New Ticket",     () => { setUser(agent);  render(<Sidebar />); expect(screen.queryByText("New Ticket")).toBeNull(); });
  it("agent does not see Stats",          () => { setUser(agent);  render(<Sidebar />); expect(screen.queryByText("Stats")).toBeNull(); });
  it("agent sees Internal Ticket",        () => { setUser(agent);  render(<Sidebar />); expect(screen.getAllByText("Internal Ticket")[0]).toBeInTheDocument(); });
});

describe("Sidebar — user footer", () => {
  beforeEach(() => setUser(admin));
  it("shows user full name",             () => { render(<Sidebar />); expect(screen.getAllByText("Admin User")[0]).toBeInTheDocument(); });
  it("shows role text",                  () => { render(<Sidebar />); expect(screen.getAllByText("admin")[0]).toBeInTheDocument(); });
  it("has 'Sign out' button",            () => { render(<Sidebar />); expect(screen.getAllByTitle("Sign out")[0]).toBeInTheDocument(); });
  it("logout clears auth",               () => { render(<Sidebar />); fireEvent.click(screen.getAllByTitle("Sign out")[0]); expect(useAuthStore.getState().isAuthenticated).toBe(false); });
  it("logout navigates to /login",       () => { render(<Sidebar />); fireEvent.click(screen.getAllByTitle("Sign out")[0]); expect(mockPush).toHaveBeenCalledWith("/login"); });
});

describe("Sidebar — mobile drawer", () => {
  beforeEach(() => setUser(admin));
  it("backdrop has opacity-100 when mobileOpen=true",  () => { const { container } = render(<Sidebar mobileOpen={true}  onClose={jest.fn()} />); expect(container.querySelector("[aria-hidden='true']")?.className).toMatch(/opacity-100/); });
  it("backdrop has opacity-0 when mobileOpen=false",   () => { const { container } = render(<Sidebar mobileOpen={false} onClose={jest.fn()} />); expect(container.querySelector("[aria-hidden='true']")?.className).toMatch(/opacity-0/); });
  it("calls onClose when nav link clicked",            () => { const onClose = jest.fn(); render(<Sidebar mobileOpen={true} onClose={onClose} />); fireEvent.click(screen.getAllByText("Dashboard")[0]); expect(onClose).toHaveBeenCalled(); });
  it("calls onClose when backdrop clicked",            () => { const onClose = jest.fn(); const { container } = render(<Sidebar mobileOpen={true} onClose={onClose} />); fireEvent.click(container.querySelector("[aria-hidden='true']")!); expect(onClose).toHaveBeenCalled(); });
});

// ─────────────────────────────────────────────────────────────────────────────
// TopNav
// ─────────────────────────────────────────────────────────────────────────────

import { TopNav } from "@/components/layout/TopNav";

describe("TopNav — page titles", () => {
  beforeEach(() => {
    mock.onGet("/tickets/").reply(200, { items: [], total: 0, page: 1, page_size: 10, pages: 0 });
    setUser(admin);
  });
  const routes: [string, string][] = [
    ["/dashboard",         "Dashboard"],
    ["/tickets",           "Tickets"],
    ["/tickets/new",       "New Ticket"],
    ["/tickets/internal",  "Internal Ticket"],
    ["/admin/stats",       "Statistics"],
    ["/admin/performance", "Agent Performance"],
    ["/admin/groups",      "Groups"],
    ["/admin/companies",   "Companies"],
    ["/admin/users",       "Users"],
  ];
  routes.forEach(([path, title]) => {
    it(`${path} → "${title}"`, () => {
      mockPath = path;
      render(<TopNav />);
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });
  it("/tickets/5 → 'Ticket Detail'", () => {
    mockPath = "/tickets/5";
    render(<TopNav />);
    expect(screen.getByText("Ticket Detail")).toBeInTheDocument();
  });
  it("unknown path → 'VraiTicket'", () => {
    mockPath = "/unknown";
    render(<TopNav />);
    expect(screen.getByText("VraiTicket")).toBeInTheDocument();
  });
});

describe("TopNav — controls", () => {
  beforeEach(() => {
    mock.onGet("/tickets/").reply(200, { items: [], total: 0, page: 1, page_size: 10, pages: 0 });
    setUser(admin);
  });
  it("renders theme toggle with title",               () => { render(<TopNav />); expect(screen.getByTitle(/switch to light theme/i)).toBeInTheDocument(); });
  it("clicking theme toggle switches to light",       () => { render(<TopNav />); fireEvent.click(screen.getByTitle(/switch to light theme/i)); expect(useThemeStore.getState().theme).toBe("light"); });
  it("renders hamburger with aria-label 'Open menu'", () => { render(<TopNav onMenuClick={jest.fn()} />); expect(screen.getByLabelText("Open menu")).toBeInTheDocument(); });
  it("hamburger calls onMenuClick",                   () => { const fn = jest.fn(); render(<TopNav onMenuClick={fn} />); fireEvent.click(screen.getByLabelText("Open menu")); expect(fn).toHaveBeenCalledTimes(1); });
  it("renders Admin role badge",                      () => { render(<TopNav />); expect(screen.getByText("Admin")).toBeInTheDocument(); });
  it("renders Agent role badge for agent",            () => { setUser(agent); render(<TopNav />); expect(screen.getByText("Agent")).toBeInTheDocument(); });
});

// ─────────────────────────────────────────────────────────────────────────────
// DashboardShell
// ─────────────────────────────────────────────────────────────────────────────

import { DashboardShell } from "@/components/layout/DashboardShell";

describe("DashboardShell", () => {
  beforeEach(() => {
    mock.onGet("/tickets/").reply(200, { items: [], total: 0, page: 1, page_size: 10, pages: 0 });
  });
  it("renders children after ready", async () => {
    setUser(admin);
    render(<DashboardShell><div data-testid="child">Hello</div></DashboardShell>);
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
  it("redirects to /login when unauthenticated", async () => {
    act(() => useAuthStore.setState({ user: null, isAuthenticated: false, token: null, hydrated: false }));
    render(<DashboardShell><div>Protected</div></DashboardShell>);
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
  it("renders Sidebar once authenticated", async () => {
    setUser(admin);
    render(<DashboardShell><div>x</div></DashboardShell>);
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    // Sidebar renders sidebarContent for both desktop and mobile — getAllByText handles that
    expect(screen.getAllByText("Support Suite")[0]).toBeInTheDocument();
  });
  it("renders TopNav once authenticated", async () => {
    setUser(admin);
    render(<DashboardShell><div>x</div></DashboardShell>);
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });
  it("content area has lg:ml-[220px] class", async () => {
    setUser(admin);
    const { container } = render(<DashboardShell><div>x</div></DashboardShell>);
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    const content = container.querySelector(".lg\\:ml-\\[220px\\]");
    expect(content).toBeInTheDocument();
  });
});
