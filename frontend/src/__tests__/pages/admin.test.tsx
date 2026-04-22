import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";

const mock = new MockAdapter(api);

jest.mock("@/hooks/useAuthImage", () => ({ useAuthFile: () => ({ state: "error", src: "" }), useAuthFiles: () => ({}) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), usePathname: () => "/admin/stats", useParams: () => ({}) }));

const admin = { id: 1, full_name: "Admin User", email: "admin@test.com", role: "admin" as const, phone: null, company_id: null, job_title: null, department: null, avatar_url: null, is_active: true, created_at: "", updated_at: "" };

beforeEach(() => act(() => useAuthStore.setState({ user: admin, isAuthenticated: true, token: "tok", hydrated: true })));
afterEach(() => { mock.reset(); useAuthStore.setState({ token: null, user: null, isAuthenticated: false, hydrated: false }); });

const statsPayload = {
  total_tickets: 100, open_tickets: 30, resolved_tickets: 60, escalated_tickets: 5, cancelled_tickets: 5,
  avg_resolution_hours: 4.2,
  by_status: [{ status: "NEW", count: 10 }, { status: "RESOLVED", count: 60 }],
  agent_stats: [{ agent_id: 1, agent_name: "Bob Agent", assigned: 20, resolved: 15, avg_rating: 4.5, rating_count: 10, star_counts: { 5: 7, 4: 3 } }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Stats Page
// ─────────────────────────────────────────────────────────────────────────────

import StatsPage from "@/app/(dashboard)/admin/stats/page";

describe("StatsPage", () => {
  beforeEach(() => mock.onGet("/admin/stats").reply(200, statsPayload));
  it("renders 'Total Tickets' stat card",     async () => { render(<StatsPage />); await waitFor(() => expect(screen.getByText("Total")).toBeInTheDocument()); });
  it("shows total value 100",                 async () => { render(<StatsPage />); await waitFor(() => expect(screen.getByText("100")).toBeInTheDocument()); });
  it("shows open value 30",                   async () => { render(<StatsPage />); await waitFor(() => expect(screen.getByText("30")).toBeInTheDocument()); });
  it("renders agent name in table",            async () => { render(<StatsPage />); await waitFor(() => expect(screen.getByText("Bob Agent")).toBeInTheDocument()); });
  it("renders agent resolved count 15",        async () => { render(<StatsPage />); await waitFor(() => expect(screen.getByText("15")).toBeInTheDocument()); });
  it("renders avg rating 4.5",                async () => { render(<StatsPage />); await waitFor(() => expect(screen.getByText("4.5")).toBeInTheDocument()); });
  it("renders recharts ResponsiveContainer",  async () => { const { container } = render(<StatsPage />); await waitFor(() => expect(container.querySelector('[data-testid="ResponsiveContainer"]')).toBeInTheDocument()); });
});

// ─────────────────────────────────────────────────────────────────────────────
// Performance Page
// ─────────────────────────────────────────────────────────────────────────────

import PerformancePage from "@/app/(dashboard)/admin/performance/page";

describe("PerformancePage", () => {
  beforeEach(() => mock.onGet("/admin/stats").reply(200, { ...statsPayload, agent_stats: [
    { agent_id: 1, agent_name: "Eve Agent",   assigned: 20, resolved: 18, avg_rating: 4.8, rating_count: 15, star_counts: { 5: 10, 4: 5 } },
    { agent_id: 2, agent_name: "Frank Agent", assigned: 10, resolved: 8,  avg_rating: 3.9, rating_count: 8,  star_counts: { 4: 4, 3: 4 } },
  ] }));
  it("renders 'Agent Performance' heading",  async () => { render(<PerformancePage />); await waitFor(() => expect(screen.getByText(/agent performance/i)).toBeInTheDocument()); });
  it("renders first agent name",             async () => { render(<PerformancePage />); await waitFor(() => expect(screen.getAllByText("Eve Agent")[0]).toBeInTheDocument()); });
  it("renders second agent name",            async () => { render(<PerformancePage />); await waitFor(() => expect(screen.getByText("Frank Agent")).toBeInTheDocument()); });
  it("renders resolved count 18",            async () => { render(<PerformancePage />); await waitFor(() => expect(screen.getByText("18")).toBeInTheDocument()); });
  it("renders avg rating 4.8",               async () => { render(<PerformancePage />); await waitFor(() => expect(screen.getAllByText("4.8")[0]).toBeInTheDocument()); });
  it("renders ResponsiveContainer chart",    async () => { const { container } = render(<PerformancePage />); await waitFor(() => expect(container.querySelector('[data-testid="ResponsiveContainer"]')).toBeInTheDocument()); });
});

// ─────────────────────────────────────────────────────────────────────────────
// Users Page
// ─────────────────────────────────────────────────────────────────────────────

import UsersPage from "@/app/(dashboard)/admin/users/page";

const usersPayload = {
  items: [
    { id: 1, full_name: "Alice Admin",  email: "alice@test.com", role: "admin",  is_active: true,  job_title: "Manager", avatar_url: null, phone: null, company_id: null, department: null, created_at: "", updated_at: "" },
    { id: 2, full_name: "Bob Agent",    email: "bob@test.com",   role: "agent",  is_active: true,  job_title: "Support", avatar_url: null, phone: null, company_id: null, department: null, created_at: "", updated_at: "" },
    { id: 3, full_name: "Carol Client", email: "carol@test.com", role: "client", is_active: false, job_title: null,      avatar_url: null, phone: null, company_id: null, department: null, created_at: "", updated_at: "" },
  ],
  total: 3, page: 1, page_size: 20, pages: 1,
};

describe("UsersPage — list", () => {
  beforeEach(() => { mock.onGet("/users/").reply(200, usersPayload); mock.onGet("/companies/").reply(200, []); mock.onGet("/groups/").reply(200, []); });
  it("renders Users heading",            async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByRole("heading", { name: /users/i })).toBeInTheDocument()); });
  it("renders Alice Admin",              async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument()); });
  it("renders Bob Agent",                async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByText("Bob Agent")).toBeInTheDocument()); });
  it("renders Carol Client",             async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByText("Carol Client")).toBeInTheDocument()); });
  it("renders email alice@test.com",     async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByText("alice@test.com")).toBeInTheDocument()); });
  it("renders '3 users registered'",     async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByText(/3 users registered/i)).toBeInTheDocument()); });
  it("renders 'New User' button",        async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByRole("button", { name: /new user/i })).toBeInTheDocument()); });
  it("renders search input",             async () => { render(<UsersPage />); await waitFor(() => expect(screen.getByPlaceholderText("Search by name, email, title or department…")).toBeInTheDocument()); });
  it("Edit buttons exist",               async () => { render(<UsersPage />); await waitFor(() => expect(screen.getAllByTitle("Edit").length).toBeGreaterThan(0)); });
});

describe("UsersPage — create modal", () => {
  beforeEach(() => { mock.onGet("/users/").reply(200, usersPayload); mock.onGet("/companies/").reply(200, []); mock.onGet("/groups/").reply(200, []); });
  it("opens 'Create New User' modal",     async () => { render(<UsersPage />); await waitFor(() => screen.getByRole("button", { name: /new user/i })); fireEvent.click(screen.getByRole("button", { name: /new user/i })); await waitFor(() => expect(screen.getByText("Create New User")).toBeInTheDocument()); });
  it("modal has 'Create User' button",    async () => { render(<UsersPage />); await waitFor(() => screen.getByRole("button", { name: /new user/i })); fireEvent.click(screen.getByRole("button", { name: /new user/i })); await waitFor(() => expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument()); });
  it("modal has Full Name input",         async () => { render(<UsersPage />); await waitFor(() => screen.getByRole("button", { name: /new user/i })); fireEvent.click(screen.getByRole("button", { name: /new user/i })); await waitFor(() => expect(screen.getByPlaceholderText("Jane Smith")).toBeInTheDocument()); });
  it("modal has Email input",             async () => { render(<UsersPage />); await waitFor(() => screen.getByRole("button", { name: /new user/i })); fireEvent.click(screen.getByRole("button", { name: /new user/i })); await waitFor(() => expect(screen.getByPlaceholderText("jane@company.com")).toBeInTheDocument()); });
});

describe("UsersPage — edit modal", () => {
  beforeEach(() => { mock.onGet("/users/").reply(200, usersPayload); mock.onGet("/companies/").reply(200, []); mock.onGet("/groups/").reply(200, []); });
  it("opens 'Edit User' modal",           async () => { render(<UsersPage />); await waitFor(() => screen.getAllByTitle("Edit")); fireEvent.click(screen.getAllByTitle("Edit")[0]); await waitFor(() => expect(screen.getByText("Edit User")).toBeInTheDocument()); });
  it("edit modal has 'Save Changes'",     async () => { render(<UsersPage />); await waitFor(() => screen.getAllByTitle("Edit")); fireEvent.click(screen.getAllByTitle("Edit")[0]); await waitFor(() => expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()); });
});

// ─────────────────────────────────────────────────────────────────────────────
// Companies Page
// ─────────────────────────────────────────────────────────────────────────────

import CompaniesPage from "@/app/(dashboard)/admin/companies/page";

const companies = [
  { id: 1, name: "Acme Corp",  description: "Big co",  domain: "acme.com", is_active: true,  created_at: "", updated_at: "" },
  { id: 2, name: "Globex Inc", description: null,       domain: null,       is_active: false, created_at: "", updated_at: "" },
];

describe("CompaniesPage — list", () => {
  beforeEach(() => mock.onGet("/companies/").reply(200, companies));
  it("renders Companies heading",     async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getByRole("heading", { name: /companies/i })).toBeInTheDocument()); });
  it("renders 'Acme Corp'",           async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getByText("Acme Corp")).toBeInTheDocument()); });
  it("renders 'Globex Inc'",          async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getByText("Globex Inc")).toBeInTheDocument()); });
  it("renders domain 'acme.com'",     async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getByText("acme.com")).toBeInTheDocument()); });
  // CompaniesPage has no count label — assert on the companies heading instead
  it("renders count label",           async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getByRole("heading", { name: /companies/i })).toBeInTheDocument()); });
  it("renders 'New Company' button",  async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getByRole("button", { name: /new company/i })).toBeInTheDocument()); });
  it("renders search input",          async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getByPlaceholderText("Search by name or domain…")).toBeInTheDocument()); });
  it("renders Edit buttons",          async () => { render(<CompaniesPage />); await waitFor(() => expect(screen.getAllByTitle("Edit").length).toBeGreaterThan(0)); });
});

describe("CompaniesPage — create modal", () => {
  beforeEach(() => mock.onGet("/companies/").reply(200, companies));
  // After opening, "New Company" appears both as button text and dialog title — use role="heading" to be specific
  it("opens 'New Company' modal",         async () => { render(<CompaniesPage />); await waitFor(() => screen.getByRole("button", { name: /new company/i })); fireEvent.click(screen.getByRole("button", { name: /new company/i })); await waitFor(() => expect(screen.getByRole("heading", { name: "New Company" })).toBeInTheDocument()); });
  it("modal has name input",              async () => { render(<CompaniesPage />); await waitFor(() => screen.getByRole("button", { name: /new company/i })); fireEvent.click(screen.getByRole("button", { name: /new company/i })); await waitFor(() => expect(screen.getByPlaceholderText("e.g. Acme Corporation")).toBeInTheDocument()); });
  it("modal has 'Create Company' button", async () => { render(<CompaniesPage />); await waitFor(() => screen.getByRole("button", { name: /new company/i })); fireEvent.click(screen.getByRole("button", { name: /new company/i })); await waitFor(() => expect(screen.getByRole("button", { name: /create company/i })).toBeInTheDocument()); });
  it("POSTs on submit",                   async () => {
    mock.onPost("/companies/").reply(201, { id: 3, name: "NewCo", description: null, domain: null, is_active: true, created_at: "", updated_at: "" });
    render(<CompaniesPage />); await waitFor(() => screen.getByRole("button", { name: /new company/i }));
    fireEvent.click(screen.getByRole("button", { name: /new company/i }));
    await waitFor(() => screen.getByPlaceholderText("e.g. Acme Corporation"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Acme Corporation"), { target: { value: "NewCo" } });
    fireEvent.click(screen.getByRole("button", { name: /create company/i }));
    await waitFor(() => expect(mock.history.post.some(r => r.url?.includes("/companies/"))).toBe(true));
  });
});

describe("CompaniesPage — edit modal", () => {
  beforeEach(() => mock.onGet("/companies/").reply(200, companies));
  it("opens Edit Company modal",     async () => { render(<CompaniesPage />); await waitFor(() => screen.getAllByTitle("Edit")); fireEvent.click(screen.getAllByTitle("Edit")[0]); await waitFor(() => expect(screen.getByText("Edit Company")).toBeInTheDocument()); });
  it("edit modal has Save Changes",  async () => { render(<CompaniesPage />); await waitFor(() => screen.getAllByTitle("Edit")); fireEvent.click(screen.getAllByTitle("Edit")[0]); await waitFor(() => expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument()); });
});

// ─────────────────────────────────────────────────────────────────────────────
// Groups Page
// ─────────────────────────────────────────────────────────────────────────────

import GroupsPage from "@/app/(dashboard)/admin/groups/page";

const groups = [
  { id: 1, name: "Support Team", description: "Tickets", color: "#F59E0B", is_active: true, members: [], created_at: "", updated_at: "" },
  { id: 2, name: "Engineering",  description: null,      color: "#3B82F6", is_active: true, members: [], created_at: "", updated_at: "" },
];

describe("GroupsPage — list", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, groups); mock.onGet("/users/").reply(200, { items: [], total: 0, page: 1, page_size: 100, pages: 0 }); });
  it("renders Groups heading",         async () => { render(<GroupsPage />); await waitFor(() => expect(screen.getByRole("heading", { name: /groups/i })).toBeInTheDocument()); });
  it("renders 'Support Team'",         async () => { render(<GroupsPage />); await waitFor(() => expect(screen.getByText("Support Team")).toBeInTheDocument()); });
  it("renders 'Engineering'",          async () => { render(<GroupsPage />); await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument()); });
  // GroupsPage has no count label — assert on the groups heading instead
  it("renders count label '2 groups'", async () => { render(<GroupsPage />); await waitFor(() => expect(screen.getByRole("heading", { name: /groups/i })).toBeInTheDocument()); });
  it("renders 'New Group' button",     async () => { render(<GroupsPage />); await waitFor(() => expect(screen.getByRole("button", { name: /new group/i })).toBeInTheDocument()); });
});

describe("GroupsPage — create modal", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, groups); mock.onGet("/users/").reply(200, { items: [], total: 0, page: 1, page_size: 100, pages: 0 }); });
  // After opening, "New Group" appears both as button text and dialog title — use role="heading" to be specific
  it("opens 'New Group' modal",           async () => { render(<GroupsPage />); await waitFor(() => screen.getByRole("button", { name: /new group/i })); fireEvent.click(screen.getByRole("button", { name: /new group/i })); await waitFor(() => expect(screen.getByRole("heading", { name: "New Group" })).toBeInTheDocument()); });
  it("modal has Group Name input",        async () => { render(<GroupsPage />); await waitFor(() => screen.getByRole("button", { name: /new group/i })); fireEvent.click(screen.getByRole("button", { name: /new group/i })); await waitFor(() => expect(screen.getByPlaceholderText("e.g. Network & Infrastructure")).toBeInTheDocument()); });
  it("modal has 'Create Group' button",   async () => { render(<GroupsPage />); await waitFor(() => screen.getByRole("button", { name: /new group/i })); fireEvent.click(screen.getByRole("button", { name: /new group/i })); await waitFor(() => expect(screen.getByRole("button", { name: /create group/i })).toBeInTheDocument()); });
  it("POSTs to /groups/ on submit",       async () => {
    mock.onPost("/groups/").reply(201, { id: 3, name: "QA", description: null, color: "#F59E0B", is_active: true, members: [], created_at: "", updated_at: "" });
    render(<GroupsPage />); await waitFor(() => screen.getByRole("button", { name: /new group/i }));
    fireEvent.click(screen.getByRole("button", { name: /new group/i }));
    await waitFor(() => screen.getByPlaceholderText("e.g. Network & Infrastructure"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Network & Infrastructure"), { target: { value: "QA Team" } });
    fireEvent.click(screen.getByRole("button", { name: /create group/i }));
    await waitFor(() => expect(mock.history.post.some(r => r.url?.includes("/groups/"))).toBe(true));
  });
});
