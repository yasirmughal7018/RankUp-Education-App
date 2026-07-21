import { AppQueryProvider } from "@/app/AppQueryProvider";
import { AuthProvider } from "@/features/authentication/presentation/context/AuthProvider";
import { AppRouter } from "@/app/router";

/** Root app shell: React Query + auth + router. */
export function App() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </AppQueryProvider>
  );
}
