import "server-only";

import { createHash } from "node:crypto";
import type { Sandbox as VercelSandbox } from "@vercel/sandbox";
import {
  APIError,
  Sandbox as SandboxRuntime,
  StreamError,
} from "@vercel/sandbox";
import { type Tool, tool } from "ai";
import {
  type BashToolkit,
  type Sandbox as BashToolSandbox,
  type CommandResult,
  type CreateBashToolOptions,
  createBashTool,
} from "bash-tool";
import { z } from "zod";

import {
  createVercelSandboxFromEnv,
  getVercelSandbox,
  type VercelSandboxCreateParams,
  vercelPatCredentialsOrEmpty,
  writeSandboxFiles,
  writeSandboxTextFile,
} from "../vercel-sandbox";
import {
  chatToolIntentionField,
  logChatToolIntention,
} from "./chat-tool-intention";

const KUBECONFIG_PATH = "/tmp/kubeconfig";
const KUBECTL_PATH = "/tmp/kubectl";
const SANDBOX_PATH =
  "/tmp:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

/**
 * Directory `bash-tool` uses for `cd` before every command and for relative `read`/`write` paths.
 *
 * - Default bash-tool paths (`/workspace` or `/vercel/sandbox/workspace`) are not guaranteed to exist
 *   on a fresh MicroVM; only `/vercel/sandbox` is documented as writable, not `.../workspace`.
 * - `/tmp` always exists, matches {@link KUBECONFIG_PATH} / {@link KUBECTL_PATH}, and avoids an extra `mkdir`.
 */
const CHAT_BASH_WORKING_DIRECTORY = "/tmp";

/**
 * Static bash-tool prompt so `createBashTool` skips `discoverAvailableTools`, which
 * runs `ls` on the sandbox and would force a lazy Vercel Sandbox to start on every chat request.
 */
const LAZY_VERCEL_BASH_TOOL_PROMPT = [
  "Environment: typical Linux userland (grep, sed, awk, find, curl, common coreutils).",
  `kubectl is installed to ${KUBECTL_PATH} on first use; KUBECONFIG is set for the connected cluster.`,
].join("\n");

const TOOL_ERROR_JSON_MAX = 4000;

function jsonSnippet(value: unknown, max = TOOL_ERROR_JSON_MAX): string {
  try {
    const s = JSON.stringify(value);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return "[unserializable]";
  }
}

function apiErrorBody(error: APIError<unknown>): string {
  if (error.json !== undefined) {
    return jsonSnippet(error.json);
  }
  if (error.text !== undefined && error.text !== "") {
    return error.text;
  }
  return "";
}

function describeApiError(toolLabel: string, error: APIError<unknown>): string {
  const status = error.response.status;
  const statusText = error.response.statusText ?? "";
  const body = apiErrorBody(error);
  const msg = error.message.trim();
  const bits: string[] = [
    `${toolLabel}: Vercel Sandbox API ${String(status)} ${statusText}`.trim(),
  ];
  if (msg !== "") {
    bits.push(`message=${msg}`);
  }
  if (body !== "") {
    bits.push(`body=${body}`);
  }
  if (error.sandboxName !== undefined) {
    bits.push(`sandboxName=${error.sandboxName}`);
  }
  if (error.sessionId !== undefined) {
    bits.push(`sessionId=${error.sessionId}`);
  }
  return bits.join(" | ");
}

/**
 * Human-readable tool failure for logs and `useChat` tool `errorText`
 * (AI SDK surfaces `Error.message` on `output-error`).
 */
function describeChatToolError(
  toolLabel: string,
  error: unknown,
  depth = 0
): string {
  if (depth > 4) {
    return `${toolLabel}: [cause chain truncated]`;
  }
  if (error instanceof APIError) {
    return describeApiError(toolLabel, error);
  }
  if (error instanceof StreamError) {
    return `${toolLabel}: StreamError code=${String(error.code)} ${error.message} sessionId=${error.sessionId}`.trim();
  }
  if (error instanceof Error) {
    if (error.cause === undefined) {
      return `${toolLabel}: ${error.name}: ${error.message}`;
    }
    const cause = describeChatToolError("cause", error.cause, depth + 1);
    return `${toolLabel}: ${error.name}: ${error.message} | cause: ${cause}`;
  }
  return `${toolLabel}: ${jsonSnippet(error)}`;
}

function wrapChatBashTool<T>(toolDef: T, toolLabel: string): T {
  if (toolDef === null || typeof toolDef !== "object") {
    return toolDef;
  }
  const originalExecute = Reflect.get(toolDef as object, "execute");
  if (typeof originalExecute !== "function") {
    return toolDef;
  }
  return {
    ...(toolDef as object),
    execute: async (...args: unknown[]) => {
      try {
        return await Reflect.apply(
          originalExecute as (...inner: unknown[]) => Promise<unknown>,
          toolDef,
          args
        );
      } catch (error) {
        const detail = describeChatToolError(toolLabel, error);
        console.error(`[createChatBashTool:${toolLabel}]`, detail, error);
        throw new Error(detail);
      }
    },
  } as T;
}

type BashInnerExecuteFn = (args: { command: string }) => Promise<unknown>;
type ReadFileInnerExecuteFn = (args: { path: string }) => Promise<unknown>;
type WriteFileInnerExecuteFn = (args: {
  path: string;
  content: string;
}) => Promise<unknown>;

/** Extends upstream `bash` tool input so the model declares why it is running shell. */
const bashWithIntentionInputSchema = z.object({
  command: z.string().describe("The bash command to execute."),
  intention: chatToolIntentionField,
});

const readFileWithIntentionInputSchema = z.object({
  intention: chatToolIntentionField,
  path: z.string().describe("The path to the file to read"),
});

const writeFileWithIntentionInputSchema = z.object({
  intention: chatToolIntentionField,
  path: z.string().describe("The path where the file should be written"),
  content: z.string().describe("The content to write to the file"),
});

export type BashToolWithIntentionInput = z.infer<
  typeof bashWithIntentionInputSchema
>;

export type ChatBashReadFileInput = z.infer<typeof readFileWithIntentionInputSchema>;

export type ChatBashWriteFileInput = z.infer<
  typeof writeFileWithIntentionInputSchema
>;

export type ChatBashBashTool = Tool<BashToolWithIntentionInput, CommandResult>;
export type ChatBashReadFileTool = Tool<ChatBashReadFileInput, { content: string }>;

export type ChatBashWriteFileTool = Tool<
  ChatBashWriteFileInput,
  { success: true }
>;

export type ChatBashToolkit = Omit<BashToolkit, "bash" | "tools"> & {
  bash: ChatBashBashTool;
  tools: Omit<BashToolkit["tools"], "bash" | "readFile" | "writeFile"> & {
    bash: ChatBashBashTool;
    readFile: ChatBashReadFileTool;
    writeFile: ChatBashWriteFileTool;
  };
};

/**
 * Layers `intention` on `bash-tool`'s `bash` primitive; execution still ignores it beyond logging.
 *
 * Keeps `{ command }` contract for upstream `bash-tool`; never mutate their schema in node_modules.
 */
function augmentBashToolWithIntention(innerUnknown: unknown) {
  const inner = innerUnknown as { description?: string };
  const origExecuteUnknown = Reflect.get(innerUnknown as object, "execute");

  const baseDesc =
    typeof inner.description === "string" ? inner.description : "";
  const enrichedDescription = `${baseDesc}

INTENTION:
Always set \`intention\`—one or two clauses on what cluster/sandbox work this command advances (e.g. verify rollout in namespace X). Execution uses \`command\` only; \`intention\` is for auditability/transcripts and is echoed to server logs.`.trimStart();

  return tool<BashToolWithIntentionInput, CommandResult>({
    description: enrichedDescription,
    inputSchema: bashWithIntentionInputSchema,
    execute: async (input) => {
      logChatToolIntention("bash", input.intention);
      const out = await Reflect.apply(
        origExecuteUnknown as BashInnerExecuteFn,
        innerUnknown,
        [{ command: input.command }]
      );
      return out as CommandResult;
    },
  });
}

/** Same pattern as bash: forwards `path` only; logs `intention`. */
function augmentReadFileToolWithIntention(innerUnknown: unknown) {
  const inner = innerUnknown as { description?: string };
  const origExecuteUnknown = Reflect.get(innerUnknown as object, "execute");
  const baseDesc =
    typeof inner.description === "string" ? inner.description : "";

  const enrichedDescription = `${baseDesc}

INTENTION:
Always set \`intention\`; execution uses only \`path\`.`;

  return tool<ChatBashReadFileInput, { content: string }>({
    description: enrichedDescription,
    inputSchema: readFileWithIntentionInputSchema,
    execute: async (input) => {
      logChatToolIntention("readFile", input.intention);
      const out = await Reflect.apply(
        origExecuteUnknown as ReadFileInnerExecuteFn,
        innerUnknown,
        [{ path: input.path }]
      );
      return out as { content: string };
    },
  });
}

function augmentWriteFileToolWithIntention(innerUnknown: unknown) {
  const inner = innerUnknown as { description?: string };
  const origExecuteUnknown = Reflect.get(innerUnknown as object, "execute");
  const baseDesc =
    typeof inner.description === "string" ? inner.description : "";

  const enrichedDescription = `${baseDesc}

INTENTION:
Always set \`intention\`; execution uses only \`path\` + \`content\`.`;

  return tool<ChatBashWriteFileInput, { success: true }>({
    description: enrichedDescription,
    inputSchema: writeFileWithIntentionInputSchema,
    execute: async (input) => {
      logChatToolIntention("writeFile", input.intention);
      const out = await Reflect.apply(
        origExecuteUnknown as WriteFileInnerExecuteFn,
        innerUnknown,
        [{ content: input.content, path: input.path }]
      );
      return out as { success: true };
    },
  });
}

export interface LazyVercelBashSandboxOptions {
  /** Decoded kubeconfig YAML to write into the sandbox before running commands. */
  kubeconfig: string;
  /** Extra `Sandbox.create` params. `tags` are managed from the kubeconfig hash. */
  sandboxParams?: Partial<VercelSandboxCreateParams>;
}

export type LazyVercelBashSandbox = BashToolSandbox & {
  /** Resolves the underlying Vercel Sandbox, creating it on first use. */
  getSandbox: () => Promise<VercelSandbox>;
  /** Stops the underlying Vercel Sandbox if it was created. */
  stop: () => Promise<void>;
};

export type CreateChatBashToolOptions = Omit<CreateBashToolOptions, "sandbox"> &
  LazyVercelBashSandboxOptions;

export function normalizeKubeconfig(kubeconfig: string): string {
  if (!kubeconfig.includes("apiVersion:")) {
    throw new Error("Kubeconfig does not look valid.");
  }
  return kubeconfig;
}

export function hashKubeconfigForSandboxTag(kubeconfig: string): string {
  return createHash("sha256").update(kubeconfig).digest("hex").slice(0, 32);
}

/**
 * When `SANDBOX_PROXY` is set (trimmed), adds HTTP(S) proxy env vars for sandbox commands.
 * Lowercase + uppercase variants so curl and Go (`kubectl`) both honor them consistently.
 */
function sandboxProxyEnv(): Partial<Record<string, string>> {
  const proxy =
    process.env.SANDBOX_PROXY === undefined
      ? ""
      : process.env.SANDBOX_PROXY.trim();
  if (proxy === "") {
    return {};
  }
  return {
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    http_proxy: proxy,
    https_proxy: proxy,
  };
}

function sandboxCommandEnv(): Record<string, string> {
  return {
    KUBECONFIG: KUBECONFIG_PATH,
    PATH: SANDBOX_PATH,
    ...sandboxProxyEnv(),
  };
}

async function findSandboxByTags(
  tags: Record<string, string>,
  sandboxParams?: Partial<VercelSandboxCreateParams>
): Promise<VercelSandbox | undefined> {
  const [firstTag] = Object.entries(tags);
  if (firstTag === undefined) {
    return;
  }

  const [key, value] = firstTag;
  const pat = vercelPatCredentialsOrEmpty(sandboxParams);
  const result = await SandboxRuntime.list({
    limit: 20,
    tags: { [key]: value },
    ...pat,
  });

  const match = result.sandboxes.find((sandbox) =>
    Object.entries(tags).every(([k, v]) => sandbox.tags?.[k] === v)
  );

  if (match === undefined) {
    return;
  }

  return getVercelSandbox({ name: match.name, ...pat });
}

async function prepareSandboxForKubectl(
  sandbox: VercelSandbox,
  kubeconfig: string
): Promise<void> {
  await writeSandboxTextFile(sandbox, KUBECONFIG_PATH, kubeconfig);
  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      [
        "set -euo pipefail",
        `if [ ! -x ${KUBECTL_PATH} ]; then`,
        "  KUBECTL_VERSION=$(curl -Ls https://dl.k8s.io/release/stable.txt)",
        "  ARCH=$(uname -m)",
        '  case "$ARCH" in',
        "    x86_64) KUBECTL_ARCH=amd64 ;;",
        "    aarch64) KUBECTL_ARCH=arm64 ;;",
        '    *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;',
        "  esac",
        `  curl -Lf "https://dl.k8s.io/release/$KUBECTL_VERSION/bin/linux/$KUBECTL_ARCH/kubectl" -o ${KUBECTL_PATH}`,
        `  chmod +x ${KUBECTL_PATH}`,
        "fi",
        "kubectl version --client=true >/dev/null",
      ].join("\n"),
    ],
    env: sandboxCommandEnv(),
  });
}

/**
 * Create a `bash-tool` sandbox adapter that does not start a Vercel Sandbox until
 * the model actually calls `bash`, `readFile`, or `writeFile`.
 */
export function createLazyVercelBashSandbox(
  options: LazyVercelBashSandboxOptions
): LazyVercelBashSandbox {
  let sandboxPromise: Promise<VercelSandbox> | undefined;
  let preparePromise: Promise<void> | undefined;
  const kubeconfig = normalizeKubeconfig(options.kubeconfig);
  const kubeconfigHash = hashKubeconfigForSandboxTag(kubeconfig);

  const getSandbox = (): Promise<VercelSandbox> => {
    sandboxPromise ??= (async () => {
      const { tags: _ignoredTags, ...sandboxParams } =
        options.sandboxParams ?? {};
      const tags = {
        kubeconfig: kubeconfigHash,
      };
      const existing = await findSandboxByTags(tags, sandboxParams);
      const sandbox =
        existing ??
        (await createVercelSandboxFromEnv({
          ...sandboxParams,
          tags,
        }));
      preparePromise ??= prepareSandboxForKubectl(sandbox, kubeconfig);
      await preparePromise;
      return sandbox;
    })();
    return sandboxPromise;
  };

  return {
    getSandbox,
    async executeCommand(command) {
      const sandbox = await getSandbox();
      const result = await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", command],
        env: sandboxCommandEnv(),
      });
      return {
        stdout: await result.stdout(),
        stderr: await result.stderr(),
        exitCode: result.exitCode,
      };
    },
    async readFile(path) {
      const sandbox = await getSandbox();
      const buf = await sandbox.readFileToBuffer({ path });
      if (buf === null) {
        throw new Error(`Sandbox file not found: ${path}`);
      }
      return buf.toString("utf8");
    },
    async writeFiles(files) {
      const sandbox = await getSandbox();
      await writeSandboxFiles(sandbox, files);
    },
    async stop() {
      if (sandboxPromise === undefined) {
        return;
      }
      const sandbox = await sandboxPromise;
      // Deduped @vercel/sandbox (e.g. Docker after `rm bun.lock`) can be 1.x typings — only `{ signal }` exists there.
      await sandbox.stop();
      sandboxPromise = undefined;
      preparePromise = undefined;
    },
  };
}

/**
 * Create a Vercel Sandbox and install kubectl for this kubeconfig, or do nothing
 * when a sandbox with the same kubeconfig tag already exists (no create, no
 * prepare).
 *
 * Throws if kubeconfig fails {@link normalizeKubeconfig} validation.
 */
export async function bootstrapChatSandboxIfNeeded(
  kubeconfigYaml: string,
  sandboxParams?: Partial<VercelSandboxCreateParams>
): Promise<{
  sandboxName: string;
  skippedExisting: boolean;
}> {
  const kubeconfig = normalizeKubeconfig(kubeconfigYaml);
  const tags = {
    kubeconfig: hashKubeconfigForSandboxTag(kubeconfig),
  };
  const existing = await findSandboxByTags(tags, sandboxParams);
  if (existing !== undefined) {
    return {
      sandboxName: existing.name,
      skippedExisting: true,
    };
  }
  const sandbox = await createVercelSandboxFromEnv({
    ...sandboxParams,
    tags,
  });
  await prepareSandboxForKubectl(sandbox, kubeconfig);
  return {
    sandboxName: sandbox.name,
    skippedExisting: false,
  };
}

/**
 * Chat-facing bash tools backed by a lazy Vercel Sandbox.
 *
 * Avoid `files` / `uploadDirectory` if you need sandbox startup to be deferred
 * until the first tool call, because those options may write before the model
 * uses the bash tool.
 */
export async function createChatBashTool(
  options: CreateChatBashToolOptions
): Promise<ChatBashToolkit & { lazySandbox: LazyVercelBashSandbox }> {
  const { kubeconfig, sandboxParams, promptOptions, ...bashToolOptions } =
    options;
  const lazySandbox = createLazyVercelBashSandbox({
    kubeconfig,
    sandboxParams,
  });
  const toolkit = await createBashTool({
    ...bashToolOptions,
    destination: bashToolOptions.destination ?? CHAT_BASH_WORKING_DIRECTORY,
    sandbox: lazySandbox,
    promptOptions: {
      ...promptOptions,
      toolPrompt: promptOptions?.toolPrompt ?? LAZY_VERCEL_BASH_TOOL_PROMPT,
    },
  });

  const bashWithIntention = augmentBashToolWithIntention(toolkit.tools.bash);
  const wrappedBash = wrapChatBashTool(bashWithIntention, "bash");
  const readWithIntention = augmentReadFileToolWithIntention(
    toolkit.tools.readFile
  );
  const wrappedReadFile = wrapChatBashTool(readWithIntention, "readFile");
  const writeWithIntention = augmentWriteFileToolWithIntention(
    toolkit.tools.writeFile
  );
  const wrappedWriteFile = wrapChatBashTool(writeWithIntention, "writeFile");

  return {
    ...toolkit,
    bash: wrappedBash,
    tools: {
      bash: wrappedBash,
      readFile: wrappedReadFile,
      writeFile: wrappedWriteFile,
    },
    lazySandbox,
  };
}
