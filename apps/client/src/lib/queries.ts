import { queryOptions } from "@tanstack/react-query";
import { commands } from "./ipc";

// Static for the lifetime of the process.
const forever = { staleTime: Infinity, gcTime: Infinity } as const;

export const appInfoQuery = queryOptions({
  queryKey: ["app-info"],
  queryFn: commands.appInfo,
  ...forever,
});

export const appPathsQuery = queryOptions({
  queryKey: ["app-paths"],
  queryFn: commands.appPaths,
  ...forever,
});

export const systemInfoQuery = queryOptions({
  queryKey: ["system-info"],
  queryFn: commands.systemInfo,
  ...forever,
});
