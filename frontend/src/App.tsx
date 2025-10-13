import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import CameraCalibration from "./pages/CameraCalibration";
import Results from "./pages/Results";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const ThemeIcon = () => {
    return theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />;
  };

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="icon"
      className="fixed top-4 right-4 z-50 rounded-full bg-white/90 dark:bg-stone-800/90 shadow-md hover:shadow-lg transition-all border border-stone-200 dark:border-stone-700"
    >
      <ThemeIcon />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="calibrator-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full overflow-hidden bg-[#292524]">
              <AppSidebar />
              <main className="flex-1 overflow-auto">
                <ThemeToggle />
                <Routes>
                  <Route path="/" element={<Navigate to="/calibration" replace />} />
                  <Route path="/calibration" element={<CameraCalibration />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
