import React from "react";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/admin/StatCard";
import { AuthAvatar } from "@/components/ui/AuthAvatar";
import { Ticket, AlertTriangle } from "lucide-react";

jest.mock("@/hooks/useAuthImage", () => ({
  useAuthFile: jest.fn(),
}));
import { useAuthFile } from "@/hooks/useAuthImage";
const mockUseAuthFile = useAuthFile as jest.MockedFunction<typeof useAuthFile>;

// ── StatCard ──────────────────────────────────────────────────────────────────

describe("StatCard", () => {
  it("renders label",            () => { render(<StatCard label="Total Tickets" value={42}  icon={Ticket} />); expect(screen.getByText("Total Tickets")).toBeInTheDocument(); });
  it("renders numeric value",    () => { render(<StatCard label="X"             value={17}  icon={Ticket} />); expect(screen.getByText("17")).toBeInTheDocument(); });
  it("renders string value",     () => { render(<StatCard label="X"             value="99%" icon={Ticket} />); expect(screen.getByText("99%")).toBeInTheDocument(); });
  it("renders zero",             () => { render(<StatCard label="X"             value={0}   icon={Ticket} />); expect(screen.getByText("0")).toBeInTheDocument(); });
  it("renders icon SVG",         () => { const { container } = render(<StatCard label="X" value={0} icon={Ticket} />); expect(container.querySelector("svg")).toBeInTheDocument(); });
  it("renders trend text",       () => { render(<StatCard label="X" value={5} icon={Ticket} trend="+10% this week" />); expect(screen.getByText("+10% this week")).toBeInTheDocument(); });
  it("omits trend when absent",  () => { render(<StatCard label="X" value={5} icon={Ticket} />); expect(screen.queryByText(/this week/)).toBeNull(); });
  it("amber accent applies amber class", () => { const { container } = render(<StatCard label="X" value={0} icon={Ticket} accent="amber" />); expect(container.innerHTML).toMatch(/amber/); });
  it("rose accent applies rose class",   () => { const { container } = render(<StatCard label="X" value={0} icon={AlertTriangle} accent="rose" />); expect(container.innerHTML).toMatch(/rose/); });
  it("teal accent applies teal class",   () => { const { container } = render(<StatCard label="X" value={0} icon={Ticket} accent="teal" />); expect(container.innerHTML).toMatch(/teal/); });
});

// ── AuthAvatar ────────────────────────────────────────────────────────────────

describe("AuthAvatar", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders 'AB' initials when path is null", () => {
    mockUseAuthFile.mockReturnValue({ state: "error", src: "" });
    render(<AuthAvatar name="Alice Bob" avatarPath={null} />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });
  it("renders initials on error state", () => {
    mockUseAuthFile.mockReturnValue({ state: "error", src: "" });
    render(<AuthAvatar name="John Doe" avatarPath="/users/1/avatar" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
  it("renders initials while loading", () => {
    mockUseAuthFile.mockReturnValue({ state: "loading", src: "" });
    render(<AuthAvatar name="Bob Smith" avatarPath="/users/2/avatar" />);
    expect(screen.getByText("BS")).toBeInTheDocument();
  });
  it("renders <img> when ready", () => {
    mockUseAuthFile.mockReturnValue({ state: "ready", src: "blob:mock-url" });
    render(<AuthAvatar name="Carol White" avatarPath="/users/3/avatar" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "blob:mock-url");
    expect(img).toHaveAttribute("alt", "Carol White");
  });
  it("strips /api/v1 prefix before calling hook", () => {
    mockUseAuthFile.mockReturnValue({ state: "error", src: "" });
    render(<AuthAvatar name="Dave" avatarPath="/api/v1/users/5/avatar" />);
    expect(mockUseAuthFile).toHaveBeenCalledWith("/users/5/avatar");
  });
  it("passes already-relative path directly to hook", () => {
    mockUseAuthFile.mockReturnValue({ state: "error", src: "" });
    render(<AuthAvatar name="Eve" avatarPath="/users/6/avatar" />);
    expect(mockUseAuthFile).toHaveBeenCalledWith("/users/6/avatar");
  });
  it("calls hook with null when avatarPath is null", () => {
    mockUseAuthFile.mockReturnValue({ state: "error", src: "" });
    render(<AuthAvatar name="Frank" avatarPath={null} />);
    expect(mockUseAuthFile).toHaveBeenCalledWith(null);
  });
  it("sm size class w-7", () => {
    mockUseAuthFile.mockReturnValue({ state: "error", src: "" });
    const { container } = render(<AuthAvatar name="A B" avatarPath={null} size="sm" />);
    expect(container.firstChild).toHaveClass("w-7");
  });
  it("lg size class w-12", () => {
    mockUseAuthFile.mockReturnValue({ state: "error", src: "" });
    const { container } = render(<AuthAvatar name="A B" avatarPath={null} size="lg" />);
    expect(container.firstChild).toHaveClass("w-12");
  });
});
