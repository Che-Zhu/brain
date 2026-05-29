"use client";

import { Button } from "@workspace/ui/components/button";
import { SidePane } from "@workspace/ui/components/side-pane";
import { cn } from "@workspace/ui/lib/utils";
import { Copy, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { toast } from "sonner";

const INSTALL_COMMAND = "npx skills add labring/seakills";

const WORKFLOW_STEPS = [
  {
    description:
      "Run the installation command to prepare the Sealos Skills runtime environment.",
    title: "Install Skills and Docker Locally",
  },
  {
    description:
      "Trigger the automated deployment workflow directly inside the current project.",
    title: 'Run the "Deploy on Sealos" Skills Command',
  },
  {
    description:
      "Follow the instructions to bind and authenticate your local machine with your Sealos account.",
    title: "Complete Device Authentication",
  },
  {
    description:
      "Automatically detect the tech stack, entry command, and dependencies, then generate a buildable Dockerfile.",
    title: "Automatically Analyze the Project and Generate a Dockerfile",
  },
  {
    description:
      "Build the container image based on the generated configuration and prepare it for release.",
    title: "Automatically Build the Docker Image",
  },
  {
    description:
      "Publish the image and apply the generated Sealos runtime manifests to the target project.",
    title: "Push the Docker Image and Apply Runtime Manifests",
  },
  {
    description:
      "After deployment is complete, an accessible domain will be returned automatically.",
    title: "Automatically Deploy and Generate an Accessible Domain",
  },
];

async function copyInstallCommand() {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    toast.error("Could not copy install command.");
    return;
  }

  try {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    toast.success("Install command copied.");
  } catch {
    toast.error("Could not copy install command.");
  }
}

function WorkflowSection({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <h3 className="font-medium text-resource-pane-foreground text-sm leading-5">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function SkillLibraryPane({ onClose }: { onClose: () => void }) {
  const copyCommand = useCallback(() => {
    copyInstallCommand().catch(() => undefined);
  }, []);

  return (
    <SidePane
      closeAriaLabel="Close skill library pane"
      icon={<Wrench aria-hidden className="size-4 text-theme-blue" />}
      label="Skill library pane"
      onClose={onClose}
      subtitle="From local installation to automatic deployment, the entire process consists of 7 steps."
      title="Sealos Skills Workflow"
    >
      <div className="flex min-w-0 flex-col gap-5" data-slot="skill-library">
        <WorkflowSection title="INSTALL">
          <p className="text-resource-pane-muted text-sm leading-5">
            Install Sealos Skills locally first.
          </p>
          <div
            className="flex min-w-0 items-center gap-3 rounded-md bg-resource-pane-input px-3 py-2.5"
            data-slot="skill-install-command"
          >
            <code className="min-w-0 flex-1 truncate font-mono text-resource-pane-muted text-sm leading-5">
              {INSTALL_COMMAND}
            </code>
            <Button
              aria-label="Copy install command"
              className="hoverable size-7 shrink-0 text-resource-pane-muted hover:text-resource-pane-foreground"
              onClick={copyCommand}
              size="icon"
              title="Copy install command"
              type="button"
              variant="ghost"
            >
              <Copy aria-hidden className="size-4" />
            </Button>
          </div>
        </WorkflowSection>

        <WorkflowSection title="Flow">
          <p className="text-resource-pane-muted text-sm leading-5">
            The entire deployment process will be completed automatically in the
            following order.
          </p>
          <ol className="mt-2 flex min-w-0 flex-col gap-5">
            {WORKFLOW_STEPS.map((step, index) => (
              <li className="flex min-w-0 flex-col gap-1.5" key={step.title}>
                <h4 className="font-medium text-resource-pane-foreground text-sm leading-5">
                  {index + 1}. {step.title}
                </h4>
                <p className="text-resource-pane-muted text-sm leading-5">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </WorkflowSection>
      </div>
    </SidePane>
  );
}
