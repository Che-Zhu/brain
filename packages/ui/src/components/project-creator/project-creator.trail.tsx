"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { cn } from "@workspace/ui/lib/utils";

import { useProjectCreator } from "./project-creator.context";
import { PROJECT_CREATOR_SOURCE_LABEL } from "./project-creator.types";

export function ProjectCreatorTrail({ className }: { className?: string }) {
  const {
    actions: { reset },
    states: { step },
  } = useProjectCreator("ProjectCreator.Trail");

  return (
    <Breadcrumb className={cn("shrink-0", className)}>
      <BreadcrumbList data-slot="project-creator-trail">
        <BreadcrumbItem>
          {step === null ? (
            <BreadcrumbPage>New</BreadcrumbPage>
          ) : (
            <BreadcrumbLink onClick={reset} render={<button type="button" />}>
              New
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {step === null ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {PROJECT_CREATOR_SOURCE_LABEL[step]}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
