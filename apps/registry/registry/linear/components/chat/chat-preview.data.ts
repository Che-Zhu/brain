import type { GithubDeployerRepo } from "@workspace/ui/components/github-deployer/github-deployer.types";
import type { UIMessage } from "ai";

export const chatPreviewThreadAId = "thread-a";
export const chatPreviewThreadBId = "thread-b";

export const chatPreviewDemoRepos: readonly GithubDeployerRepo[] = [
  { fullName: "acme/sealai-ui", id: "repo-ui", name: "sealai-ui" },
  { fullName: "acme/platform-api", id: "repo-api", name: "platform-api" },
  { fullName: "acme/observability", id: "repo-obs", name: "observability" },
] as const;

/** Stub assistant text appended after `onSend` in the preview. */
export const chatPreviewStubAssistantReply =
  "Stub reply — wire `onSend` to your model.";

export const chatPreviewMessageSeed: Record<string, UIMessage[]> = {
  [chatPreviewThreadAId]: [
    {
      id: "mock-1",
      role: "user",
      parts: [{ type: "text", text: "Example prompt — no backend wired yet." }],
    },
    {
      id: "mock-2",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Placeholder reply. Wire `onSend` to your chat API when ready.",
        },
      ],
    },
  ],
  [chatPreviewThreadBId]: [
    {
      id: "quick-1",
      role: "user",
      parts: [
        {
          type: "text",
          text: "Second thread — switch via the title dropdown.",
        },
      ],
    },
    {
      id: "quick-2",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Same **Chat.ThreadSelect** as production when `threadHistory` is passed.",
        },
      ],
    },
    {
      id: "quick-3",
      role: "user",
      parts: [
        {
          type: "text",
          text: "Can you summarize the API error codes we saw yesterday?",
        },
      ],
    },
    {
      id: "quick-4",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Stub: 502 was upstream timeout, 429 rate limit on `/v1/batch`, 400 invalid `namespace` in the body.",
        },
      ],
    },
    {
      id: "quick-5",
      role: "user",
      parts: [
        {
          type: "text",
          text: "What should I check first for the 502?",
        },
      ],
    },
    {
      id: "quick-6",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Stub: health of the ingress → service endpoints, then recent deploys and replica readiness.",
        },
      ],
    },
    {
      id: "quick-7",
      role: "user",
      parts: [
        {
          type: "text",
          text: "Paste a one-liner curl to hit the health route.",
        },
      ],
    },
    {
      id: "quick-8",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Stub: `curl -sS -o /dev/null -w \"%{http_code}\" https://api.example/healthz`",
        },
      ],
    },
    {
      id: "quick-9",
      role: "user",
      parts: [
        {
          type: "text",
          text: "Thanks — I’ll run that and ping you with the code.",
        },
      ],
    },
    {
      id: "quick-10",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Sounds good. Longer threads like this still scroll inside **Chat.Transcript**.",
        },
      ],
    },
  ],
};
