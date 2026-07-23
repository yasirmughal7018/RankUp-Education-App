import { AppQueryProvider } from "@/app/AppQueryProvider";
import { AuthProvider } from "@/features/authentication/presentation/context/AuthProvider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppErrorBoundary } from "@/components/providers/app-error-boundary";
import { AppRouter } from "@/app/router";

/** Root app shell: theme + React Query + auth + router. */
export function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AppQueryProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </AppQueryProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
