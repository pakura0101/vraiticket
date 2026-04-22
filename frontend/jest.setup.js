require("@testing-library/jest-dom");

// ── next/navigation ───────────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useRouter:   () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/dashboard",
  useParams:   () => ({ id: "1" }),
}));

// ── next/link ─────────────────────────────────────────────────────────────────
jest.mock("next/link", () => {
  const React = require("react");
  return function Link({ children, href, ...props }) {
    return React.createElement("a", { href, ...props }, children);
  };
});

// ── react-hot-toast ───────────────────────────────────────────────────────────
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  toast:   { success: jest.fn(), error: jest.fn() },
}));

// ── recharts ──────────────────────────────────────────────────────────────────
jest.mock("recharts", () => {
  const React = require("react");
  const mock = (name) => function MockChart({ children }) {
    return React.createElement("div", { "data-testid": name }, children);
  };
  return {
    BarChart:            mock("BarChart"),
    Bar:                 mock("Bar"),
    XAxis:               mock("XAxis"),
    YAxis:               mock("YAxis"),
    Tooltip:             mock("Tooltip"),
    Legend:              mock("Legend"),
    CartesianGrid:       mock("CartesianGrid"),
    Cell:                mock("Cell"),
    PieChart:            mock("PieChart"),
    Pie:                 mock("Pie"),
    LineChart:           mock("LineChart"),
    Line:                mock("Line"),
    RadarChart:          mock("RadarChart"),
    Radar:               mock("Radar"),
    PolarGrid:           mock("PolarGrid"),
    PolarAngleAxis:      mock("PolarAngleAxis"),
    ResponsiveContainer: function ResponsiveContainer({ children, width, height }) {
      return React.createElement("div", { "data-testid": "ResponsiveContainer" }, children);
    },
  };
});

// ── @radix-ui/react-dialog ────────────────────────────────────────────────────
// Always renders children regardless of open state so DOM queries work
jest.mock("@radix-ui/react-dialog", () => {
  const React = require("react");
  return {
    Root:        function Root({ children, open, onOpenChange }) {
      // Always render so our tests can find dialog content
      return React.createElement("div", { "data-dialog-root": String(!!open) }, children);
    },
    Portal:      function Portal({ children }) {
      return React.createElement("div", null, children);
    },
    Overlay:     function Overlay({ className }) {
      return React.createElement("div", { className, "data-dialog-overlay": true });
    },
    Content:     function Content({ children, className }) {
      return React.createElement("div", { role: "dialog", className }, children);
    },
    Title:       function Title({ children, className }) {
      return React.createElement("h2", { className }, children);
    },
    Description: function Description({ children, className }) {
      return React.createElement("p", { className }, children);
    },
    Close:       function Close({ children, ...props }) {
      return React.createElement("button", { "data-dialog-close": true, ...props }, children);
    },
    Trigger:     function Trigger({ children, asChild }) {
      return React.createElement(React.Fragment, null, children);
    },
  };
});

// ── @radix-ui/react-select ────────────────────────────────────────────────────
jest.mock("@radix-ui/react-select", () => {
  const React = require("react");
  return {
    Root: function Root({ children, value, onValueChange, disabled }) {
      return React.createElement("div", { "data-select-root": true }, children);
    },
    Trigger: function Trigger({ children, className }) {
      return React.createElement("button", { role: "combobox", className }, children);
    },
    Value: function Value({ placeholder }) {
      return React.createElement("span", null, placeholder || "");
    },
    Portal: function Portal({ children }) {
      return React.createElement(React.Fragment, null, children);
    },
    Content: function Content({ children }) {
      return React.createElement("div", { role: "listbox" }, children);
    },
    Viewport: function Viewport({ children }) {
      return React.createElement("div", null, children);
    },
    Item: function Item({ children, value }) {
      return React.createElement("div", { role: "option", "data-value": value }, children);
    },
    ItemText: function ItemText({ children }) {
      return React.createElement("span", null, children);
    },
    ItemIndicator: function ItemIndicator({ children }) {
      return React.createElement("span", null, children);
    },
    ScrollUpButton:   function ScrollUpButton() { return null; },
    ScrollDownButton: function ScrollDownButton() { return null; },
  };
});

// ── @radix-ui/react-tooltip ───────────────────────────────────────────────────
jest.mock("@radix-ui/react-tooltip", () => {
  const React = require("react");
  return {
    Provider:  function Provider({ children }) { return React.createElement(React.Fragment, null, children); },
    Root:      function Root({ children })     { return React.createElement(React.Fragment, null, children); },
    Trigger:   function Trigger({ children })  { return React.createElement(React.Fragment, null, children); },
    Portal:    function Portal({ children })   { return React.createElement(React.Fragment, null, children); },
    Content:   function Content({ children })  { return React.createElement("div", { role: "tooltip" }, children); },
    Arrow:     function Arrow() { return null; },
  };
});

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key)        => store[key] ?? null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ── URL mocks ─────────────────────────────────────────────────────────────────
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// ── Suppress noisy console output ─────────────────────────────────────────────
global.console.warn = jest.fn();

const _origError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("act(") || msg.includes("not wrapped in act") || msg.includes("Warning:")) return;
    _origError(...args);
  };
});
afterAll(() => { console.error = _origError; });
