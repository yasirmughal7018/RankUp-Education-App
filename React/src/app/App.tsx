import { AppQueryProvider } from "@/app/AppQueryProvider";
import { AuthProvider } from "@/features/authentication/presentation/context/AuthProvider";
import { AppRouter } from "@/app/router";

export function App() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </AppQueryProvider>
  );
}
