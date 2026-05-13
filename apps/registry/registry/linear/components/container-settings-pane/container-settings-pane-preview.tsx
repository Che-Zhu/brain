"use client";

import { ContainerSettingsPane } from "@workspace/ui/components/container-settings-pane/container-settings-pane";
import { Preview, PreviewWrapper } from "@workspace/ui/components/preview";
import { useState } from "react";

const DEMO_IMAGE =
  "ghcr.io/org/workloads/api-gateway:1.24.3@sha256:6b25d1b591f6cabc7ccf21c76623c";

const DEMO_ENV = [
  { name: "NODE_ENV", value: "production" },
  { name: "LOG_LEVEL", value: "info" },
  { name: "DATABASE_URL", value: "postgresql://db.internal:5432/app" },
  { name: "REDIS_HOST", value: "redis-master.cache.svc" },
];

const DEMO_PORTS = [
  { port: 8080, protocol: "tcp" },
  { port: 8443, protocol: "tcp" },
];

export default function ContainerSettingsPanePreview() {
  const [cpuCores, setCpuCores] = useState(2);
  const [memoryMib, setMemoryMib] = useState(2048);
  const [replicas, setReplicas] = useState(3);
  const [image, setImage] = useState(DEMO_IMAGE);
  const [env, setEnv] = useState(DEMO_ENV);
  const [ports, setPorts] = useState(DEMO_PORTS);

  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <Preview containerClassName="max-w-xl" title="Container settings pane">
        <ContainerSettingsPane
          cpuQuota={{
            max: 8,
            min: 0.25,
            onValueChange: setCpuCores,
            step: 0.25,
            value: cpuCores,
          }}
          env={env}
          image={image}
          memoryQuota={{
            max: 4096,
            min: 512,
            onValueChange: setMemoryMib,
            step: 128,
            value: memoryMib,
          }}
          onEnvChange={setEnv}
          onImageChange={setImage}
          onPortsChange={setPorts}
          ports={ports}
          replicasQuota={{
            max: 20,
            min: 1,
            onValueChange: setReplicas,
            step: 1,
            value: replicas,
          }}
        />
      </Preview>
    </PreviewWrapper>
  );
}
