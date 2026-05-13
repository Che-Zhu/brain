"use client";

import type { GithubDeployerRepo } from "@workspace/ui/components/github-deployer/github-deployer.types";
// import {
//   buildGithubDeployerDeployedAguiExecuteInput,
//   githubDeployerDeployedAguiSpec,
// } from "@workspace/ui/lib/agui/github-deployer-spec";
import type { UIMessage } from "ai";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useCallback } from "react";
import { toast } from "sonner";

import { useGithubAuth } from "@/hooks/use-github-auth";

/** URL query flag for the project chat transcript GitHub deployer panel (`?githubDeployer=true`). */
export const GITHUB_TRANSCRIPT_DEPLOYER_QUERY_KEY = "githubDeployer" as const;

export type UseGithubDeployerSetMessages = (
  messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])
) => void;

export interface UseGithubDeployerOptions {
  setMessages: UseGithubDeployerSetMessages;
}

export interface UseGithubDeployerResult {
  authLoading: boolean;
  /** Clears the transcript deployer query flag without clearing chat messages. */
  clearTranscriptUi: () => void;
  closeTranscriptDeployer: () => void;
  commitDeployToMessages: (repo: GithubDeployerRepo) => void;
  githubToken: string | undefined;
  initiateGithubAuth: () => void;
  isAuthorized: boolean;
  resetChatThread: () => void;
  toggleTranscriptDeployer: () => void;
  transcriptDeployerOpen: boolean;
}

export function useGithubDeployer({
  setMessages,
}: UseGithubDeployerOptions): UseGithubDeployerResult {
  const [transcriptDeployerOpen, setTranscriptDeployerOpen] = useQueryState(
    GITHUB_TRANSCRIPT_DEPLOYER_QUERY_KEY,
    parseAsBoolean.withDefault(false)
  );
  const {
    githubToken,
    initiateGithubAuth,
    isAuthorized,
    isLoading: authLoading,
  } = useGithubAuth();

  const toggleTranscriptDeployer = useCallback(() => {
    Promise.resolve(setTranscriptDeployerOpen((prev) => !prev)).catch(
      () => undefined
    );
  }, [setTranscriptDeployerOpen]);

  const closeTranscriptDeployer = useCallback(() => {
    Promise.resolve(setTranscriptDeployerOpen(false)).catch(() => undefined);
  }, [setTranscriptDeployerOpen]);

  const clearTranscriptUi = useCallback(() => {
    Promise.resolve(setTranscriptDeployerOpen(false)).catch(() => undefined);
  }, [setTranscriptDeployerOpen]);

  const commitDeployToMessages = useCallback(
    (_repo: GithubDeployerRepo) => {
      toast.info("GitHub deploy isn’t ready yet — this feature is incomplete.");
      Promise.resolve(setTranscriptDeployerOpen(false)).catch(() => undefined);

      // const spec = githubDeployerDeployedAguiSpec(repo);
      // const executeInput = buildGithubDeployerDeployedAguiExecuteInput(repo);
      // const toolPart = {
      //   type: "tool-emitGenUISpec" as const,
      //   toolCallId: `deploy-${Date.now()}`,
      //   state: "output-available" as const,
      //   input: executeInput,
      //   output: { ok: true as const, spec },
      // } satisfies UIMessage["parts"][number];
      // setMessages((prev) => [
      //   ...prev,
      //   {
      //     id: `assistant-deploy-${Date.now()}`,
      //     role: "assistant" as const,
      //     parts: [toolPart],
      //   },
      // ]);
      // Promise.resolve(setTranscriptDeployerOpen(false)).catch(() => undefined);
    },
    [setTranscriptDeployerOpen]
  );

  const resetChatThread = useCallback(() => {
    Promise.resolve(setTranscriptDeployerOpen(false)).catch(() => undefined);
    setMessages([]);
  }, [setMessages, setTranscriptDeployerOpen]);

  return {
    authLoading,
    clearTranscriptUi,
    closeTranscriptDeployer,
    commitDeployToMessages,
    githubToken,
    initiateGithubAuth,
    isAuthorized,
    resetChatThread,
    toggleTranscriptDeployer,
    transcriptDeployerOpen,
  };
}
