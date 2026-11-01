import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { AboutPage } from "@/routes/AboutPage";
import { HomePage } from "@/routes/HomePage";

const rootRoute = createRootRoute({ component: Layout });

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});

const routeTree = rootRoute.addChildren([homeRoute, aboutRoute]);

export function makeRouter() {
  return createRouter({
    routeTree,
    // Hash history works with any asset protocol and survives reloads.
    history: createHashHistory(),
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}
