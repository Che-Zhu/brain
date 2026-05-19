import "server-only";

import { and, eq } from "drizzle-orm";

import { getProjectDb } from "@/lib/project-persistence/db";
import {
  type ProjectCanvasLayoutRow,
  projectCanvasLayouts,
} from "@/lib/project-persistence/schema";

import { applyCanvasLayoutPatch, CanvasLayoutValidationError } from "./patch";
import type {
  CanvasLayoutDocument,
  CanvasLayoutPatch,
  CanvasLayoutResourceRef,
} from "./types";

export interface ProjectCanvasLayoutKey {
  namespace: string;
  projectUid: string;
}

function emptyLayoutDocument(
  key: ProjectCanvasLayoutKey
): CanvasLayoutDocument {
  return {
    namespace: key.namespace,
    nodes: [],
    projectUid: key.projectUid,
    version: 0,
  };
}

function rowToDocument(row: ProjectCanvasLayoutRow): CanvasLayoutDocument {
  return {
    namespace: row.namespace,
    nodes: row.nodes,
    ...(row.projectNameSnapshot == null
      ? {}
      : { projectNameSnapshot: row.projectNameSnapshot }),
    projectUid: row.projectUid,
    version: row.version,
  };
}

function whereLayoutKey(key: ProjectCanvasLayoutKey) {
  return and(
    eq(projectCanvasLayouts.namespace, key.namespace),
    eq(projectCanvasLayouts.projectUid, key.projectUid)
  );
}

function normalizePatchForProject(
  key: ProjectCanvasLayoutKey,
  patch: CanvasLayoutPatch
): CanvasLayoutPatch {
  return {
    ...patch,
    nodes: patch.nodes.map((node) => ({
      ...node,
      ref: (() => {
        const ref = {
          ...node.ref,
          namespace: node.ref.namespace.trim(),
        } satisfies CanvasLayoutResourceRef;
        if (ref.namespace !== key.namespace) {
          throw new CanvasLayoutValidationError(
            "node namespace must match layout namespace."
          );
        }
        return ref;
      })(),
    })),
  };
}

export async function loadProjectCanvasLayout(
  key: ProjectCanvasLayoutKey
): Promise<CanvasLayoutDocument> {
  const [row] = await getProjectDb()
    .select()
    .from(projectCanvasLayouts)
    .where(whereLayoutKey(key))
    .limit(1);
  return row === undefined ? emptyLayoutDocument(key) : rowToDocument(row);
}

export function patchProjectCanvasLayout(
  key: ProjectCanvasLayoutKey,
  patch: CanvasLayoutPatch
): Promise<CanvasLayoutDocument> {
  return getProjectDb().transaction(async (tx) => {
    const now = new Date();
    await tx
      .insert(projectCanvasLayouts)
      .values({
        namespace: key.namespace,
        nodes: [],
        projectNameSnapshot: patch.projectNameSnapshot,
        projectUid: key.projectUid,
        updatedAt: now,
        createdAt: now,
        version: 0,
      })
      .onConflictDoNothing({
        target: [
          projectCanvasLayouts.namespace,
          projectCanvasLayouts.projectUid,
        ],
      });

    const [row] = await tx
      .select()
      .from(projectCanvasLayouts)
      .where(whereLayoutKey(key))
      .limit(1)
      .for("update");

    const existing =
      row === undefined ? emptyLayoutDocument(key) : rowToDocument(row);
    const next = applyCanvasLayoutPatch(
      existing,
      normalizePatchForProject(key, patch)
    );

    const [updated] = await tx
      .update(projectCanvasLayouts)
      .set({
        nodes: next.nodes,
        projectNameSnapshot: next.projectNameSnapshot,
        updatedAt: now,
        version: next.version,
      })
      .where(whereLayoutKey(key))
      .returning();

    return updated === undefined ? next : rowToDocument(updated);
  });
}
