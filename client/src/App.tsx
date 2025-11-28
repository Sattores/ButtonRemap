import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import State1NoMapping from "@/pages/state1_no_mapping";
import State2Configured from "@/pages/state2_configured";

function Router() {
  return (
    <Switch>
      <Route path="/" component={State2Configured} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/state1" component={State1NoMapping} />
      <Route path="/state2" component={State2Configured} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
