import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badges";
import { Avatar, Button, Spinner, EmptyState, PageLoader, Input, Textarea } from "@/components/ui";

// ── StatusBadge ───────────────────────────────────────────────────────────────

describe("StatusBadge", () => {
  const cases = [
    ["NEW","New"],["ASSIGNED","Assigned"],["IN_PROGRESS","In Progress"],
    ["ON_HOLD","On Hold"],["RESOLVED","Resolved"],["CLOSED","Closed"],
    ["ESCALATED","Escalated"],["CANCELLED","Cancelled"],
  ] as const;
  cases.forEach(([status, label]) => {
    it(`renders "${label}" for ${status}`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
  it("renders a coloured dot span", () => {
    const { container } = render(<StatusBadge status="NEW" />);
    expect(container.querySelectorAll("span").length).toBeGreaterThanOrEqual(2);
  });
});

// ── PriorityBadge ─────────────────────────────────────────────────────────────

describe("PriorityBadge", () => {
  it("renders 'Low' with ▼ icon",    () => { render(<PriorityBadge priority="LOW" />);    expect(screen.getByText("Low")).toBeInTheDocument();    expect(document.body.textContent).toContain("▼"); });
  it("renders 'Medium' with ● icon", () => { render(<PriorityBadge priority="MEDIUM" />); expect(screen.getByText("Medium")).toBeInTheDocument(); expect(document.body.textContent).toContain("●"); });
  it("renders 'High' with ▲ icon",   () => { render(<PriorityBadge priority="HIGH" />);   expect(screen.getByText("High")).toBeInTheDocument();   expect(document.body.textContent).toContain("▲"); });
});

// ── Avatar ────────────────────────────────────────────────────────────────────

describe("Avatar", () => {
  it("shows 'AB' initials for 'Alice Bob'",             () => { render(<Avatar name="Alice Bob" />);                       expect(screen.getByText("AB")).toBeInTheDocument(); });
  it("shows 'A' for single name",                       () => { render(<Avatar name="Alice" />);                          expect(screen.getByText("A")).toBeInTheDocument();  });
  it("caps initials at 2 chars for 3-word name",        () => { render(<Avatar name="Alice Bob Charlie" />);              expect(screen.getByText("AB")).toBeInTheDocument(); });
  it("renders <img> with correct src when avatarUrl set",() => { render(<Avatar name="Alice" avatarUrl="https://example.com/img.png" />); const img = screen.getByRole("img"); expect(img).toHaveAttribute("src","https://example.com/img.png"); });
  it("renders <img> with alt=name",                     () => { render(<Avatar name="Alice Bob" avatarUrl="https://x.com/a.jpg" />); expect(screen.getByRole("img")).toHaveAttribute("alt","Alice Bob"); });
  it("falls back to initials when avatarUrl is null",   () => { render(<Avatar name="Dave" avatarUrl={null} />);          expect(screen.getByText("D")).toBeInTheDocument(); expect(screen.queryByRole("img")).toBeNull(); });
  it("applies sm size class w-7",                       () => { const { container } = render(<Avatar name="A B" size="sm" />); expect(container.firstChild).toHaveClass("w-7"); });
  it("applies lg size class w-12",                      () => { const { container } = render(<Avatar name="A B" size="lg" />); expect(container.firstChild).toHaveClass("w-12"); });
  it("applies md size class w-9 by default",            () => { const { container } = render(<Avatar name="A B" />);     expect(container.firstChild).toHaveClass("w-9"); });
});

// ── Button ────────────────────────────────────────────────────────────────────

describe("Button", () => {
  it("renders children",                () => { render(<Button>Click me</Button>); expect(screen.getByText("Click me")).toBeInTheDocument(); });
  it("fires onClick when clicked",      () => { const fn = jest.fn(); render(<Button onClick={fn}>Go</Button>); fireEvent.click(screen.getByText("Go")); expect(fn).toHaveBeenCalledTimes(1); });
  it("is disabled when disabled=true",  () => { render(<Button disabled>Off</Button>); expect(screen.getByRole("button")).toBeDisabled(); });
  it("is disabled when loading=true",   () => { render(<Button loading>Wait</Button>); expect(screen.getByRole("button")).toBeDisabled(); });
  it("shows SVG spinner when loading",  () => { const { container } = render(<Button loading>Save</Button>); expect(container.querySelector("svg")).toBeInTheDocument(); });
  it("sm size has px-3 class",          () => { render(<Button size="sm">S</Button>); expect(screen.getByRole("button")).toHaveClass("px-3"); });
  it("lg size has px-6 class",          () => { render(<Button size="lg">L</Button>); expect(screen.getByRole("button")).toHaveClass("px-6"); });
  it("danger variant has bg-rose-600",  () => { render(<Button variant="danger">Del</Button>); expect(screen.getByRole("button")).toHaveClass("bg-rose-600"); });
  it("secondary variant renders",       () => { render(<Button variant="secondary">Sec</Button>); expect(screen.getByRole("button")).toBeInTheDocument(); });
  it("ghost variant renders",           () => { render(<Button variant="ghost">Ghost</Button>); expect(screen.getByRole("button")).toBeInTheDocument(); });
});

// ── Spinner ───────────────────────────────────────────────────────────────────

describe("Spinner", () => {
  it("renders an SVG",           () => { const { container } = render(<Spinner />); expect(container.querySelector("svg")).toBeInTheDocument(); });
  it("has animate-spin class",   () => { const { container } = render(<Spinner />); expect(container.querySelector("svg")).toHaveClass("animate-spin"); });
  it("accepts custom className", () => { const { container } = render(<Spinner className="w-8 text-amber-500" />); expect(container.querySelector("svg")).toHaveClass("text-amber-500"); });
});

// ── EmptyState ────────────────────────────────────────────────────────────────

describe("EmptyState", () => {
  it("renders title",                            () => { render(<EmptyState title="Nothing here" />); expect(screen.getByText("Nothing here")).toBeInTheDocument(); });
  it("renders description when provided",        () => { render(<EmptyState title="X" description="Try again." />); expect(screen.getByText("Try again.")).toBeInTheDocument(); });
  it("renders action element when provided",     () => { render(<EmptyState title="X" action={<button>Create</button>} />); expect(screen.getByText("Create")).toBeInTheDocument(); });
  it("renders icon when provided",               () => { render(<EmptyState title="X" icon={<span data-testid="ico">★</span>} />); expect(screen.getByTestId("ico")).toBeInTheDocument(); });
  it("does not render description when omitted", () => { const { container } = render(<EmptyState title="X" />); expect(container.querySelectorAll("p").length).toBeLessThanOrEqual(1); });
});

// ── PageLoader ────────────────────────────────────────────────────────────────

describe("PageLoader", () => {
  it("renders full-screen fixed container", () => { const { container } = render(<PageLoader />); expect(container.firstChild).toHaveClass("fixed","inset-0"); });
  it("renders a spinning ring",             () => { const { container } = render(<PageLoader />); expect(container.querySelector(".animate-spin")).toBeInTheDocument(); });
});

// ── Input ─────────────────────────────────────────────────────────────────────

describe("Input", () => {
  it("renders label text",                 () => { render(<Input label="Email" />); expect(screen.getByText("Email")).toBeInTheDocument(); });
  it("renders error message",              () => { render(<Input error="Required" />); expect(screen.getByText("Required")).toBeInTheDocument(); });
  it("adds border-rose-500 on error",      () => { render(<Input error="Oops" />); expect(screen.getByRole("textbox")).toHaveClass("border-rose-500"); });
  it("accepts typed value",                () => { render(<Input placeholder="Type" />); const el = screen.getByPlaceholderText("Type"); fireEvent.change(el, { target: { value: "hello" } }); expect((el as HTMLInputElement).value).toBe("hello"); });
  it("renders without label or error",     () => { const { container } = render(<Input placeholder="x" />); expect(container.querySelector("input")).toBeInTheDocument(); });
});

// ── Textarea ──────────────────────────────────────────────────────────────────

describe("Textarea", () => {
  it("renders label",                 () => { render(<Textarea label="Notes" />); expect(screen.getByText("Notes")).toBeInTheDocument(); });
  it("renders error message",         () => { render(<Textarea error="Too short" />); expect(screen.getByText("Too short")).toBeInTheDocument(); });
  it("accepts typed value",           () => { render(<Textarea placeholder="Describe" />); const el = screen.getByPlaceholderText("Describe"); fireEvent.change(el, { target: { value: "abc" } }); expect((el as HTMLTextAreaElement).value).toBe("abc"); });
  it("has resize-none class",         () => { const { container } = render(<Textarea />); expect(container.querySelector("textarea")).toHaveClass("resize-none"); });
});
