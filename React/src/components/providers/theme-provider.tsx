import { type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-border bg-card text-card-foreground",
        },
      }}
    />
  );
}

/** Light/dark theme + toast host. next-themes owns persistence. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="rankup-theme"
      disableTransitionOnChange
    >
      {children}
      <ThemedToaster />
    </NextThemesProvider>
  );
}
