/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/__mocks__/styleMock.js",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          // Override bundler resolution — ts-jest needs node16 for proper module resolution
          moduleResolution: "node",
          // Use react-jsx so tests don't need "preserve" (which requires the Next.js compiler)
          jsx: "react-jsx",
          esModuleInterop: true,
          // Relax some strict settings that cause noise in test files
          skipLibCheck: true,
        },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};

module.exports = config;
