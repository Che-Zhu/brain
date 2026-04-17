"use client";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@shadcn/ui/avatar";
import { Button } from "@shadcn/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@shadcn/ui/empty";
import { Preview, PreviewWrapper } from "@shadcn/ui/preview";
import { Check, Plus } from "lucide-react";

export default function AvatarExample() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <AvatarSizes />
      <AvatarWithBadge />
      <AvatarWithBadgeIcon />
      <AvatarGroupExample />
      <AvatarGroupWithCount />
      <AvatarGroupWithIconCount />
      <AvatarInEmpty />
    </PreviewWrapper>
  );
}

function AvatarSizes() {
  return (
    <Preview title="Sizes">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Avatar size="sm">
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </Preview>
  );
}

function AvatarWithBadge() {
  return (
    <Preview title="Badge">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Avatar size="sm">
            <AvatarImage
              alt="@jorgezreik"
              src="https://github.com/jorgezreik.png"
            />
            <AvatarFallback>JZ</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@jorgezreik"
              src="https://github.com/jorgezreik.png"
            />
            <AvatarFallback>JZ</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@jorgezreik"
              src="https://github.com/jorgezreik.png"
            />
            <AvatarFallback>JZ</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>JZ</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar>
            <AvatarFallback>JZ</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>JZ</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        </div>
      </div>
    </Preview>
  );
}

function AvatarWithBadgeIcon() {
  return (
    <Preview title="Badge with icon">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Avatar size="sm">
            <AvatarImage
              alt="@pranathip"
              src="https://github.com/pranathip.png"
            />
            <AvatarFallback>PP</AvatarFallback>
            <AvatarBadge>
              <Plus className="size-3" />
            </AvatarBadge>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@pranathip"
              src="https://github.com/pranathip.png"
            />
            <AvatarFallback>PP</AvatarFallback>
            <AvatarBadge>
              <Plus className="size-3" />
            </AvatarBadge>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@pranathip"
              src="https://github.com/pranathip.png"
            />
            <AvatarFallback>PP</AvatarFallback>
            <AvatarBadge>
              <Plus className="size-3" />
            </AvatarBadge>
          </Avatar>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>PP</AvatarFallback>
            <AvatarBadge>
              <Check className="size-3" />
            </AvatarBadge>
          </Avatar>
          <Avatar>
            <AvatarFallback>PP</AvatarFallback>
            <AvatarBadge>
              <Check className="size-3" />
            </AvatarBadge>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>PP</AvatarFallback>
            <AvatarBadge>
              <Check className="size-3" />
            </AvatarBadge>
          </Avatar>
        </div>
      </div>
    </Preview>
  );
}

function AvatarGroupExample() {
  return (
    <Preview title="Group">
      <div className="flex flex-col gap-4">
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </AvatarGroup>
        <AvatarGroup>
          <Avatar>
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </AvatarGroup>
        <AvatarGroup>
          <Avatar size="lg">
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </div>
    </Preview>
  );
}

function AvatarGroupWithCount() {
  return (
    <Preview title="Group with count">
      <div className="flex flex-col gap-4">
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
        <AvatarGroup>
          <Avatar>
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
        <AvatarGroup>
          <Avatar size="lg">
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
      </div>
    </Preview>
  );
}

function AvatarGroupWithIconCount() {
  return (
    <Preview title="Group with icon count">
      <div className="flex flex-col gap-4">
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>
            <Plus className="size-4" />
          </AvatarGroupCount>
        </AvatarGroup>
        <AvatarGroup>
          <Avatar>
            <AvatarImage alt="@shadcn" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@maxleiter"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage
              alt="@evilrabbit"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>
            <Plus className="size-4" />
          </AvatarGroupCount>
        </AvatarGroup>
        <AvatarGroup>
          <Avatar size="lg">
            <AvatarImage
              alt="@shadcn"
              className="grayscale"
              src="https://github.com/shadcn.png"
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@maxleiter"
              className="grayscale"
              src="https://github.com/maxleiter.png"
            />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage
              alt="@evilrabbit"
              className="grayscale"
              src="https://github.com/evilrabbit.png"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>
            <Plus className="size-4" />
          </AvatarGroupCount>
        </AvatarGroup>
      </div>
    </Preview>
  );
}

function AvatarInEmpty() {
  return (
    <Preview title="In empty">
      <Empty className="w-full max-w-md flex-none border">
        <EmptyHeader>
          <EmptyMedia>
            <AvatarGroup>
              <Avatar size="lg">
                <AvatarImage
                  alt="@shadcn"
                  className="grayscale"
                  src="https://github.com/shadcn.png"
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar size="lg">
                <AvatarImage
                  alt="@maxleiter"
                  className="grayscale"
                  src="https://github.com/maxleiter.png"
                />
                <AvatarFallback>LR</AvatarFallback>
              </Avatar>
              <Avatar size="lg">
                <AvatarImage
                  alt="@evilrabbit"
                  className="grayscale"
                  src="https://github.com/evilrabbit.png"
                />
                <AvatarFallback>ER</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>
                <Plus className="size-4" />
              </AvatarGroupCount>
            </AvatarGroup>
          </EmptyMedia>
          <EmptyTitle>No team members</EmptyTitle>
          <EmptyDescription>
            Invite your team to collaborate on this project.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>
            <Plus className="size-4" />
            Invite members
          </Button>
        </EmptyContent>
      </Empty>
    </Preview>
  );
}
