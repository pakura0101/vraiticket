import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useThemeStore, applyTheme } from "@/hooks/useTheme";
import { useAuthFile, useAuthFiles } from "@/hooks/useAuthImage";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/lib/api";

const mock = new MockAdapter(api);

const mockUser = {
  id: 1, full_name: "Alice Admin", email: "alice@test.com",
  role: "admin" as const, phone: null, company_id: null,
  job_title: null, department: null, avatar_url: null,
  is_active: true, created_at: "", updated_at: "",
};

afterEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false, hydrated: false });
  useThemeStore.setState({ theme: "dark" });
  localStorage.clear();
  mock.reset();
});

// ── useAuthStore ──────────────────────────────────────────────────────────────

describe("useAuthStore — initial state", () => {
  it("is unauthenticated by default",  () => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  it("token is null by default",       () => expect(useAuthStore.getState().token).toBeNull());
  it("user is null by default",        () => expect(useAuthStore.getState().user).toBeNull());
});

describe("useAuthStore — setAuth", () => {
  it("sets isAuthenticated to true", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("tok", mockUser));
    expect(result.current.isAuthenticated).toBe(true);
  });
  it("stores the token", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("my-tok", mockUser));
    expect(result.current.token).toBe("my-tok");
  });
  it("stores the user object", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("tok", mockUser));
    expect(result.current.user?.full_name).toBe("Alice Admin");
  });
  it("persists token to localStorage", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("stored-tok", mockUser));
    expect(localStorage.getItem("vt_token")).toBe("stored-tok");
  });
  it("works for client role", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("tok", { ...mockUser, role: "client" }));
    expect(result.current.user?.role).toBe("client");
  });
  it("works for agent role", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("tok", { ...mockUser, role: "agent" }));
    expect(result.current.user?.role).toBe("agent");
  });
});

describe("useAuthStore — clearAuth", () => {
  it("sets isAuthenticated to false", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("tok", mockUser));
    act(() => result.current.clearAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });
  it("nulls out token and user", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("tok", mockUser));
    act(() => result.current.clearAuth());
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
  it("removes vt_token from localStorage", () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => result.current.setAuth("tok", mockUser));
    act(() => result.current.clearAuth());
    expect(localStorage.getItem("vt_token")).toBeNull();
  });
});

// ── useThemeStore ─────────────────────────────────────────────────────────────

describe("useThemeStore — initial state", () => {
  it("defaults to dark", () => expect(useThemeStore.getState().theme).toBe("dark"));
});

describe("useThemeStore — setTheme", () => {
  it("changes to light", () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => result.current.setTheme("light"));
    expect(result.current.theme).toBe("light");
  });
  it("updates data-theme attribute on <html>", () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => result.current.setTheme("light"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
  it("changes back to dark", () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => result.current.setTheme("light"));
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
  });
});

describe("useThemeStore — toggle", () => {
  it("dark → light", () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe("light");
  });
  it("light → dark", () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => result.current.setTheme("light"));
    act(() => result.current.toggle());
    expect(result.current.theme).toBe("dark");
  });
  it("updates data-theme on toggle", () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => result.current.toggle());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets data-theme='dark'",  () => { applyTheme("dark");  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");  });
  it("sets data-theme='light'", () => { applyTheme("light"); expect(document.documentElement.getAttribute("data-theme")).toBe("light"); });
});

// ── useAuthFile ───────────────────────────────────────────────────────────────

describe("useAuthFile", () => {
  it("returns error state immediately for null path", () => {
    const { result } = renderHook(() => useAuthFile(null));
    expect(result.current.state).toBe("error");
    expect(result.current.src).toBe("");
  });
  it("returns error state immediately for undefined path", () => {
    const { result } = renderHook(() => useAuthFile(undefined));
    expect(result.current.state).toBe("error");
  });
  it("starts loading when path is provided", () => {
    mock.onGet("/users/1/avatar").reply(() => new Promise(() => {}));
    const { result } = renderHook(() => useAuthFile("/users/1/avatar"));
    expect(result.current.state).toBe("loading");
  });
  it("transitions to ready after successful fetch", async () => {
    mock.onGet("/users/1/avatar").reply(200, new Blob(["img"]), { "content-type": "image/png" });
    const { result } = renderHook(() => useAuthFile("/users/1/avatar"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.state).toBe("ready");
    expect(result.current.src).toBe("blob:mock-url");
  });
  it("transitions to error on 404", async () => {
    mock.onGet("/users/99/avatar").reply(404);
    const { result } = renderHook(() => useAuthFile("/users/99/avatar"));
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.state).toBe("error");
  });
});

describe("useAuthFiles", () => {
  it("returns empty object for empty array", () => {
    const { result } = renderHook(() => useAuthFiles([]));
    expect(result.current).toEqual({});
  });
  it("initialises loading entries for given paths", () => {
    mock.onGet("/users/1/avatar").reply(() => new Promise(() => {}));
    const { result } = renderHook(() => useAuthFiles(["/users/1/avatar"]));
    const states = Object.values(result.current).map(e => e.state);
    states.forEach(s => expect(["loading","ready","error"]).toContain(s));
  });
});
