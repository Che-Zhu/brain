"use client";

import type { ComponentProps } from "react";

import { ProjectCreatorShell } from "./project-creator.layout";
import { ProjectCreatorStage } from "./project-creator.stage";
import { ProjectCreatorTrail } from "./project-creator.trail";

export function ProjectCreatorVariant1({
  className,
  ...props
}: ComponentProps<typeof ProjectCreatorShell>) {
  return (
    <ProjectCreatorShell className={className} {...props}>
      <ProjectCreatorTrail />
      <ProjectCreatorStage />
    </ProjectCreatorShell>
  );
}
