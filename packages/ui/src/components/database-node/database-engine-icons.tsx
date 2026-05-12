import { Database } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import type { DatabaseEngineKey } from "./database-node.types";

export type DatabaseEngineIcon = ComponentType<SVGProps<SVGSVGElement>>;

export function DatabaseFallbackIcon(props: SVGProps<SVGSVGElement>) {
  return <Database {...props} />;
}

export const PostgreSQLIcon = DatabaseFallbackIcon;
export const MySQLIcon = DatabaseFallbackIcon;
export const RedisIcon = DatabaseFallbackIcon;
export const MongoDBIcon = DatabaseFallbackIcon;

const DATABASE_ENGINE_ICONS = {
  mongodb: MongoDBIcon,
  mysql: MySQLIcon,
  postgresql: PostgreSQLIcon,
  redis: RedisIcon,
} as const satisfies Record<string, DatabaseEngineIcon>;

export function normalizeDatabaseEngineKey(engineKey: DatabaseEngineKey) {
  return engineKey.trim().toLowerCase();
}

export function getDatabaseEngineIcon(
  engineKey: DatabaseEngineKey | undefined
) {
  if (!engineKey) {
    return DatabaseFallbackIcon;
  }

  return (
    DATABASE_ENGINE_ICONS[
      normalizeDatabaseEngineKey(
        engineKey
      ) as keyof typeof DATABASE_ENGINE_ICONS
    ] ?? DatabaseFallbackIcon
  );
}
