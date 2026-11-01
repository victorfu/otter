import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { systemInfoQuery } from "@/lib/queries";
import { Card, ErrorText, InfoList, Skeleton } from "./ui";

export function SystemCard() {
  const { data, error, isPending } = useQuery(systemInfoQuery);

  return (
    <Card title="System" description="Reported by a Rust command" icon={<Cpu className="size-4" />}>
      {isPending && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      )}
      {error && <ErrorText>{error.message}</ErrorText>}
      {data && (
        <InfoList
          items={[
            ["Operating system", data.osName],
            ["Version", data.osVersion],
            ["Architecture", data.arch],
            ["Platform", `${data.os} (${data.family})`],
            ["CPU cores", String(data.cpuCount)],
          ]}
        />
      )}
    </Card>
  );
}
