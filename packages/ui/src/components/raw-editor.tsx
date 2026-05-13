"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  envToText,
  type ParsedEnvPair,
  parseEnvText,
} from "@workspace/ui/lib/parse-env-text";
import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { createContext, use, useEffect, useRef } from "react";

/** Minimal slice of TanStack `Field` render props we rely on (exact form generics vary). */
interface RawEditorEnvTextFieldApi {
  handleBlur: () => void;
  handleChange: (value: string) => void;
  name: string | number;
  state: {
    value: string;
    meta: {
      errors?: Array<{ message?: string } | undefined> | undefined;
      isTouched: boolean;
      isValid?: boolean;
    };
  };
}

interface RawEditorFieldRenderProps {
  children: (field: RawEditorEnvTextFieldApi) => ReactNode;
  name: "envText";
}

/** One row sourced from YAML / API (optional until filled). */
export interface EnvEntry {
  name?: string;
  value?: string;
}

interface RawEditorState {
  isSubmitting: boolean;
}

interface RawEditorActions {
  submit: () => void;
}

interface RawEditorContextValue {
  actions: RawEditorActions;
  form: {
    Field: (props: RawEditorFieldRenderProps) => ReactNode;
  };
  state: RawEditorState;
}

const RawEditorContext = createContext<RawEditorContextValue | null>(null);

function useRawEditorContext() {
  const ctx = use(RawEditorContext);
  if (ctx == null) {
    throw new Error(
      "RawEditor compound components must be used within RawEditor.Provider"
    );
  }
  return ctx;
}

function RawEditorProvider({
  initialEnv = [],
  onSubmit,
  children,
}: {
  initialEnv?: EnvEntry[];
  onSubmit: (env: ParsedEnvPair[]) => Promise<void>;
  children: ReactNode;
}) {
  const initialEnvText = envToText(initialEnv);
  const form = useForm({
    defaultValues: { envText: initialEnvText },
    onSubmit: async ({ value }) => {
      await onSubmit(parseEnvText(value.envText));
    },
  });

  const formRef = useRef(form);
  formRef.current = form;

  // Sync from props only when serialized env *content* changes. Depending on `initialEnv`
  // (array reference) re-runs every parent render and wipes the textarea while typing.
  useEffect(() => {
    formRef.current.setFieldValue("envText", initialEnvText);
  }, [initialEnvText]);

  const value: RawEditorContextValue = {
    state: { isSubmitting: form.state.isSubmitting },
    actions: {
      submit: () => {
        form.handleSubmit();
      },
    },
    form: {
      Field: form.Field as RawEditorContextValue["form"]["Field"],
    },
  };

  return (
    <RawEditorContext.Provider value={value}>
      {children}
    </RawEditorContext.Provider>
  );
}

function RawEditorRoot({
  className,
  children,
  ...props
}: ComponentProps<"form">) {
  const { actions } = useRawEditorContext();
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        actions.submit();
      }}
      {...props}
    >
      {children}
    </form>
  );
}

function RawEditorInput({
  className,
  placeholder,
  textareaClassName,
  ...props
}: ComponentProps<"div"> & {
  placeholder?: string;
  /** Merged into the inner `Textarea` (e.g. fixed height + `overflow-y-auto`). */
  textareaClassName?: string;
}) {
  const { form } = useRawEditorContext();
  return (
    <form.Field name="envText">
      {(field) => {
        const isInvalid =
          field.state.meta.isTouched && !(field.state.meta.isValid ?? true);
        return (
          <Field
            className={className}
            data-invalid={isInvalid ? true : undefined}
            data-slot="raw-editor-input"
            {...props}
          >
            <FieldLabel className="sr-only" htmlFor={String(field.name)}>
              Raw content
            </FieldLabel>
            <Textarea
              aria-invalid={isInvalid}
              className={cn(
                "min-h-[200px] font-mono text-sm focus-visible:ring-0 aria-invalid:ring-0",
                textareaClassName
              )}
              id={String(field.name)}
              name={String(field.name)}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={placeholder}
              value={field.state.value}
            />
            {isInvalid && (
              <FieldError
                errors={
                  field.state.meta.errors as
                    | Array<{ message?: string } | undefined>
                    | undefined
                }
              />
            )}
          </Field>
        );
      }}
    </form.Field>
  );
}

function RawEditorFooter({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={className} data-slot="raw-editor-footer" {...props}>
      {children}
    </div>
  );
}

function RawEditorSubmit({
  className,
  children,
  variant = "outline",
  ...props
}: ComponentProps<typeof Button>) {
  const {
    state: { isSubmitting },
    actions: { submit },
  } = useRawEditorContext();
  return (
    <Button
      className={cn("", className)}
      disabled={isSubmitting}
      onClick={(e) => {
        e.preventDefault();
        submit();
      }}
      type="button"
      {...props}
      variant={variant}
    >
      {children ?? (isSubmitting ? "Saving..." : "Save")}
    </Button>
  );
}

function RawEditorVariant0({
  initialEnv = [],
  onSubmit,
  className,
  textareaClassName,
}: {
  initialEnv?: EnvEntry[];
  onSubmit: (env: ParsedEnvPair[]) => Promise<void>;
  className?: string;
  /** Passed to the inner {@link RawEditorInput}. */
  textareaClassName?: string;
}) {
  return (
    <RawEditorProvider initialEnv={initialEnv} onSubmit={onSubmit}>
      <RawEditorRoot className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <RawEditorInput
          className="min-h-0 flex-1"
          textareaClassName={textareaClassName}
        />
        <RawEditorFooter className="flex justify-end">
          <RawEditor.Submit />
        </RawEditorFooter>
      </RawEditorRoot>
    </RawEditorProvider>
  );
}

export const RawEditor = {
  Provider: RawEditorProvider,
  Root: RawEditorRoot,
  Input: RawEditorInput,
  Footer: RawEditorFooter,
  Submit: RawEditorSubmit,
  Variant0: RawEditorVariant0,
};
