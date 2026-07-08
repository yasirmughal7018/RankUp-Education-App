import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GuestRoute,
  ProtectedRoute,
} from "@/features/authentication/presentation/components/RouteGuards";

const useAuthMock = vi.fn();

vi.mock(
  "@/features/authentication/presentation/context/AuthProvider",
  () => ({
    useAuth: () => useAuthMock(),
  }),
);

function renderProtected(initialPath = "/secure") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/secure" element={<div>Secure content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderGuest(initialPath = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<div>Login page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RouteGuards", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("ProtectedRoute shows a loading state while bootstrapping", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: true,
    });

    renderProtected();

    expect(screen.getByText("Checking your session...")).toBeTruthy();
  });

  it("ProtectedRoute redirects unauthenticated users to login", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
    });

    renderProtected();

    expect(screen.getByText("Login page")).toBeTruthy();
    expect(screen.queryByText("Secure content")).toBeNull();
  });

  it("ProtectedRoute renders outlet content when authenticated", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
    });

    renderProtected();

    expect(screen.getByText("Secure content")).toBeTruthy();
  });

  it("GuestRoute redirects authenticated users to the dashboard", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
    });

    renderGuest();

    expect(screen.getByText("Dashboard page")).toBeTruthy();
    expect(screen.queryByText("Login page")).toBeNull();
  });

  it("GuestRoute renders outlet content for guests", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
    });

    renderGuest();

    expect(screen.getByText("Login page")).toBeTruthy();
  });
});
