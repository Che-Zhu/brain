import { Database } from "lucide-react";
import type { ComponentType } from "react";
import {
  type DbIconProps,
  MongoDbIcon,
  MySqlIcon,
  PostgreSqlIcon,
  RedisIcon as RedisAssetIcon,
} from "../../assets/db-icons";

import type { DatabaseEngineKey } from "./database-node.types";

export type DatabaseEngineIcon = ComponentType<DbIconProps>;

export function DatabaseFallbackIcon({ size = 24, ...props }: DbIconProps) {
  return <Database size={size} {...props} />;
}

export const PostgreSQLIcon = PostgreSqlIcon;
export const MySQLIcon = MySqlIcon;
export const RedisIcon = RedisAssetIcon;
export const MongoDBIcon = MongoDbIcon;

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
