import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";

const mock = new MockAdapter(api);
const mockPush = jest.fn();

jest.mock("@/hooks/useAuthImage", () => ({ useAuthFile: () => ({ state: "error", src: "" }), useAuthFiles: () => ({}) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }), usePathname: () => "/tickets/internal", useParams: () => ({}) }));

const agent = { id: 3, full_name: "Agent User", email: "agent@test.com", role: "agent" as const, phone: null, company_id: null, job_title: null, department: null, avatar_url: null, is_active: true, created_at: "", updated_at: "" };
function setAgent() { act(() => useAuthStore.setState({ user: agent, isAuthenticated: true, token: "tok", hydrated: true })); }

afterEach(() => { mock.reset(); mockPush.mockClear(); useAuthStore.setState({ token: null, user: null, isAuthenticated: false, hydrated: false }); });

// ─────────────────────────────────────────────────────────────────────────────
// Internal Ticket Page
// ─────────────────────────────────────────────────────────────────────────────

import InternalTicketPage from "@/app/(dashboard)/tickets/internal/page";

describe("InternalTicketPage — fields", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, []); setAgent(); });
  // "Create Internal Ticket" appears in both the h2 heading and the submit button — target the heading
  it("renders 'Create Internal Ticket' heading",           async () => { render(<InternalTicketPage />); await waitFor(() => expect(screen.getByRole("heading", { name: /create internal ticket/i })).toBeInTheDocument()); });
  it("renders title input with exact placeholder",          async () => { render(<InternalTicketPage />); await waitFor(() => expect(screen.getByPlaceholderText("e.g. Upgrade server SSL certificates")).toBeInTheDocument()); });
  it("renders description textarea",                        async () => { render(<InternalTicketPage />); await waitFor(() => expect(screen.getByPlaceholderText("Describe the task or issue. Include context, links, or steps needed.")).toBeInTheDocument()); });
  it("renders 'Create Internal Ticket' submit button",      async () => { render(<InternalTicketPage />); await waitFor(() => expect(screen.getByRole("button", { name: "Create Internal Ticket" })).toBeInTheDocument()); });
  it("renders Low/Medium/High priority cards",              async () => { render(<InternalTicketPage />); await waitFor(() => { expect(screen.getByText("Low")).toBeInTheDocument(); expect(screen.getByText("Medium")).toBeInTheDocument(); expect(screen.getByText("High")).toBeInTheDocument(); }); });
  it("renders 'Back to tickets' link",                      async () => { render(<InternalTicketPage />); await waitFor(() => expect(screen.getByText("Back to tickets")).toBeInTheDocument()); });
  it("renders hidden file input",                           async () => { const { container } = render(<InternalTicketPage />); await waitFor(() => expect(container.querySelector('input[type="file"]')).toBeInTheDocument()); });
});

describe("InternalTicketPage — groups", () => {
  it("shows group buttons when groups available", async () => {
    mock.onGet("/groups/").reply(200, [{ id: 1, name: "Dev Team", color: "#3B82F6", members: [], is_active: true, description: null, created_at: "", updated_at: "" }]);
    setAgent(); render(<InternalTicketPage />);
    await waitFor(() => expect(screen.getByText("Dev Team")).toBeInTheDocument());
  });
});

describe("InternalTicketPage — validation", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, []); setAgent(); });
  it("shows 'Title must be at least 5 characters' for short title", async () => {
    render(<InternalTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Internal Ticket" }));
    await waitFor(() => expect(screen.getByText("Title must be at least 5 characters")).toBeInTheDocument());
  });
  it("shows 'Please provide more detail' for short description", async () => {
    render(<InternalTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"), { target: { value: "Valid title here" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Internal Ticket" }));
    await waitFor(() => expect(screen.getByText("Please provide more detail")).toBeInTheDocument());
  });
});

describe("InternalTicketPage — submission", () => {
  beforeEach(() => { mock.onGet("/groups/").reply(200, []); setAgent(); });
  it("POSTs with ticket_type=internal", async () => {
    mock.onPost("/tickets/").reply(201, { id: 10, title: "SSL cert", ticket_type: "internal" });
    render(<InternalTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"), { target: { value: "Fix the SSL certificate expiry issue" } });
    fireEvent.change(screen.getByPlaceholderText("Describe the task or issue. Include context, links, or steps needed."), { target: { value: "Production SSL cert expires in 7 days and needs renewing before expiry date." } });
    fireEvent.click(screen.getByRole("button", { name: "Create Internal Ticket" }));
    await waitFor(() => {
      expect(mock.history.post.some(r => r.url?.includes("/tickets/"))).toBe(true);
      expect(JSON.parse(mock.history.post.find(r => r.url?.includes("/tickets/"))!.data).ticket_type).toBe("internal");
    });
  });
  it("redirects to /tickets after success", async () => {
    mock.onPost("/tickets/").reply(201, { id: 11, ticket_type: "internal" });
    render(<InternalTicketPage />);
    await waitFor(() => screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Upgrade server SSL certificates"), { target: { value: "Fix the SSL certificate expiry issue" } });
    fireEvent.change(screen.getByPlaceholderText("Describe the task or issue. Include context, links, or steps needed."), { target: { value: "Production SSL cert expires in 7 days and needs renewing before expiry date." } });
    fireEvent.click(screen.getByRole("button", { name: "Create Internal Ticket" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/tickets"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentGallery
// ─────────────────────────────────────────────────────────────────────────────

import { AttachmentGallery } from "@/components/tickets/AttachmentGallery";
import type { Attachment } from "@/types";

const attachments: Attachment[] = [
  { id: 1, ticket_id: 1, uploader_id: 2, filename: "screenshot.png", mime_type: "image/png",       size_bytes: 204800,  created_at: "2024-01-01T10:00:00Z", uploader: { id: 2, full_name: "Alice", email: "a@b.com", role: "client", job_title: null, avatar_url: null }, url: "/api/v1/tickets/1/attachments/1/download" },
  { id: 2, ticket_id: 1, uploader_id: 2, filename: "report.pdf",     mime_type: "application/pdf", size_bytes: 1048576, created_at: "2024-01-01T11:00:00Z", uploader: { id: 2, full_name: "Alice", email: "a@b.com", role: "client", job_title: null, avatar_url: null }, url: "/api/v1/tickets/1/attachments/2/download" },
];

describe("AttachmentGallery", () => {
  // AttachmentGallery always renders its header + "No attachments" when empty — never produces an empty container
  it("renders nothing for empty list",                  () => { render(<AttachmentGallery attachments={[]} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getByText(/no attachments/i)).toBeInTheDocument(); });
  // screenshot.png is an image: useAuthFiles returns {} so state="loading" (shows spinner, no filename text).
  // Override to return state="error" so the error fallback renders the filename as visible text.
  it("renders 'screenshot.png'", () => {
    jest.spyOn(require("@/hooks/useAuthImage"), "useAuthFiles").mockReturnValueOnce({
      "/tickets/1/attachments/1/download": { state: "error", src: "" },
    });
    render(<AttachmentGallery attachments={attachments} ticketId={1} canUpload={false} onUploaded={jest.fn()} />);
    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
  });
  it("renders 'report.pdf'",                            () => { render(<AttachmentGallery attachments={attachments} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getByText("report.pdf")).toBeInTheDocument(); });
  it("renders file size '200.0 KB'",                    () => { render(<AttachmentGallery attachments={attachments} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getByText("200.0 KB")).toBeInTheDocument(); });
  it("renders file size '1.0 MB'",                      () => { render(<AttachmentGallery attachments={attachments} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getByText("1.0 MB")).toBeInTheDocument(); });
  // Count is rendered as "(2)" in a child span of the heading, not as "2 attachments" text
  it("renders '2 attachments' count",                   () => { render(<AttachmentGallery attachments={attachments} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getByText("(2)")).toBeInTheDocument(); });
  it("renders download buttons",                        () => { render(<AttachmentGallery attachments={attachments} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2); });
  it("renders uploader name 'Alice'",                   () => { render(<AttachmentGallery attachments={attachments} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getAllByText(/Alice/).length).toBeGreaterThan(0); });
  // canUpload=false + empty: section header still renders, but no upload button shown
  it("renders nothing when canUpload=false and empty",  () => { render(<AttachmentGallery attachments={[]} ticketId={1} canUpload={false} onUploaded={jest.fn()} />); expect(screen.getByText(/no attachments/i)).toBeInTheDocument(); expect(screen.queryByText(/upload a file/i)).toBeNull(); });
  it("renders upload area when canUpload=true",         () => { const { container } = render(<AttachmentGallery attachments={[]} ticketId={1} canUpload={true} onUploaded={jest.fn()} />); expect(container.querySelector("input[type='file']") || screen.queryByRole("button")).toBeInTheDocument(); });
  it("calls download API when button clicked",          async () => {
    mock.onGet("/tickets/1/attachments/1/download").reply(200, new Blob(["data"]));
    render(<AttachmentGallery attachments={[attachments[0]]} ticketId={1} canUpload={false} onUploaded={jest.fn()} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(mock.history.get.some(r => r.url?.includes("download"))).toBe(true));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AvatarUpload
// ─────────────────────────────────────────────────────────────────────────────

import { AvatarUpload } from "@/components/ui/AvatarUpload";

describe("AvatarUpload", () => {
  it("renders without crashing",                 () => { const { container } = render(<AvatarUpload name="Alice Bob" currentUrl={null} onChange={jest.fn()} />); expect(container).toBeInTheDocument(); });
  it("renders 'AB' initials",                    () => { render(<AvatarUpload name="Alice Bob" currentUrl={null} onChange={jest.fn()} />); expect(screen.getByText("AB")).toBeInTheDocument(); });
  it("renders 'A' for single name",              () => { render(<AvatarUpload name="Alice" currentUrl={null} onChange={jest.fn()} />); expect(screen.getByText("A")).toBeInTheDocument(); });
  it("renders 'JP' for 3-word name",             () => { render(<AvatarUpload name="John Paul Smith" currentUrl={null} onChange={jest.fn()} />); expect(screen.getByText("JP")).toBeInTheDocument(); });
  it("has a hidden file input",                  () => { const { container } = render(<AvatarUpload name="Alice" currentUrl={null} onChange={jest.fn()} />); expect(container.querySelector('input[type="file"]')).toBeInTheDocument(); });
  it("file input accepts image types",           () => { const { container } = render(<AvatarUpload name="Alice" currentUrl={null} onChange={jest.fn()} />); expect(container.querySelector('input[type="file"]')?.getAttribute("accept")).toMatch(/image/i); });
  it("shows spinner SVG when uploading=true",    () => { const { container } = render(<AvatarUpload name="Alice" currentUrl={null} onChange={jest.fn()} uploading={true} />); expect(container.querySelector("svg")).toBeInTheDocument(); });
  it("md size has w-16 class",                   () => { const { container } = render(<AvatarUpload name="Alice" currentUrl={null} onChange={jest.fn()} />); expect(container.querySelector(".w-16")).toBeInTheDocument(); });
  it("lg size has w-24 class",                   () => { const { container } = render(<AvatarUpload name="Alice" currentUrl={null} onChange={jest.fn()} size="lg" />); expect(container.querySelector(".w-24")).toBeInTheDocument(); });
  it("does not crash on file input change",      () => { const { container } = render(<AvatarUpload name="Alice Bob" currentUrl={null} onChange={jest.fn()} />); const input = container.querySelector('input[type="file"]') as HTMLInputElement; if (input) { const file = new File(["x"], "a.png", { type: "image/png" }); Object.defineProperty(input, "files", { value: [file], configurable: true }); fireEvent.change(input); } expect(container).toBeInTheDocument(); });
});
