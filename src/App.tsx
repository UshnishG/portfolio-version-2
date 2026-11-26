import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Universe from "./pages/Universe";

const Infer = lazy(() => import("./pages/Infer"));
const Dmind = lazy(() => import("./pages/Dmind"));
const Cuda = lazy(() => import("./pages/Cuda"));
const Marine = lazy(() => import("./pages/Marine"));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Universe />} />
          <Route
            path="/explore/infer"
            element={
              <Suspense fallback={<div className="min-h-screen bg-[#02030a]" />}>
                <Infer />
              </Suspense>
            }
          />
          <Route
            path="/explore/d-mind"
            element={
              <Suspense fallback={<div className="min-h-screen bg-[#02030a]" />}>
                <Dmind />
              </Suspense>
            }
          />
          <Route
            path="/explore/cuda-n-body"
            element={
              <Suspense fallback={<div className="min-h-screen bg-[#010206]" />}>
                <Cuda />
              </Suspense>
            }
          />
          <Route
            path="/explore/marine-ai"
            element={
              <Suspense fallback={<div className="min-h-screen bg-[#02030a]" />}>
                <Marine />
              </Suspense>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
