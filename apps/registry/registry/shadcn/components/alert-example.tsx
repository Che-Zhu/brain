"use client";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@shadcn/ui/alert";
import { Badge } from "@shadcn/ui/badge";
import { Button } from "@shadcn/ui/button";
import { Preview, PreviewWrapper } from "@shadcn/ui/preview";
import { AlertCircle } from "lucide-react";

export default function AlertExample() {
  return (
    <PreviewWrapper className="lg:grid-cols-1">
      <AlertExample1 />
      <AlertExample2 />
      <AlertExample3 />
      <AlertExample4 />
    </PreviewWrapper>
  );
}

function AlertExample1() {
  return (
    <Preview title="Basic">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Alert>
          <AlertTitle>Success! Your changes have been saved.</AlertTitle>
        </Alert>
        <Alert>
          <AlertTitle>Success! Your changes have been saved.</AlertTitle>
          <AlertDescription>
            This is an alert with title and description.
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertDescription>
            This one has a description only. No title. No icon.
          </AlertDescription>
        </Alert>
      </div>
    </Preview>
  );
}

function AlertExample2() {
  return (
    <Preview title="With icons">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>
            Let&apos;s try one with icon, title and a{" "}
            <a href="https://example.com">link</a>.
          </AlertTitle>
        </Alert>
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            This one has an icon and a description only. No title.{" "}
            <a href="https://example.com">But it has a link</a> and a{" "}
            <a href="https://example.com">second link</a>.
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Success! Your changes have been saved</AlertTitle>
          <AlertDescription>
            This is an alert with icon, title and description.
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>
            This is a very long alert title that demonstrates how the component
            handles extended text content and potentially wraps across multiple
            lines
          </AlertTitle>
        </Alert>
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            This is a very long alert description that demonstrates how the
            component handles extended text content and potentially wraps across
            multiple lines
          </AlertDescription>
        </Alert>
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>
            This is an extremely long alert title that spans multiple lines to
            demonstrate how the component handles very lengthy headings while
            maintaining readability and proper text wrapping behavior
          </AlertTitle>
          <AlertDescription>
            This is an equally long description that contains detailed
            information about the alert. It shows how the component can
            accommodate extensive content while preserving proper spacing,
            alignment, and readability across different screen sizes and
            viewport widths. This helps ensure the user experience remains
            consistent regardless of the content length.
          </AlertDescription>
        </Alert>
      </div>
    </Preview>
  );
}

function AlertExample3() {
  return (
    <Preview title="Destructive">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Something went wrong!</AlertTitle>
          <AlertDescription>
            Your session has expired. Please log in again.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to process your payment.</AlertTitle>
          <AlertDescription>
            <p>
              Please verify your{" "}
              <a href="https://example.com">billing information</a> and try
              again.
            </p>
            <ul className="list-inside list-disc">
              <li>Check your card details</li>
              <li>Ensure sufficient funds</li>
              <li>Verify billing address</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </Preview>
  );
}

function AlertExample4() {
  return (
    <Preview title="With actions">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>The selected emails have been marked as spam.</AlertTitle>
          <AlertAction>
            <Button size="xs">Undo</Button>
          </AlertAction>
        </Alert>
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>The selected emails have been marked as spam.</AlertTitle>
          <AlertDescription>
            This is a very long alert title that demonstrates how the component
            handles extended text content.
          </AlertDescription>
          <AlertAction>
            <Badge variant="secondary">Badge</Badge>
          </AlertAction>
        </Alert>
      </div>
    </Preview>
  );
}
