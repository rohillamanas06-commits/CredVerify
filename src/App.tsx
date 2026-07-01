import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./routes/index";
import Login from "./routes/login";
import Register from "./routes/register";
import AppIndex from "./routes/app.index";
import Credentials from "./routes/app.credentials";
import Issue from "./routes/app.issue";
import Share from "./routes/app.share";
import Verify from "./routes/app.verify";
import VerifyToken from "./routes/verify.$token";
import AppLayout from "./routes/app";

import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify/:token" element={<VerifyToken />} />
          
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<AppIndex />} />
            <Route path="credentials" element={<Credentials />} />
            <Route path="issue" element={<Issue />} />
            <Route path="share" element={<Share />} />
            <Route path="verify" element={<Verify />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
