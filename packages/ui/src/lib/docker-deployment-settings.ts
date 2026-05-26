import { isKubernetesEnvName } from "./container-env-rows";

export const DEFAULT_DOCKER_APP_LISTENING_PORT = 80;

export interface DockerDeploymentEnvVar {
  name: string;
  value: string;
}

export interface DockerDeploymentSettings {
  appListeningPort: number;
  env: DockerDeploymentEnvVar[];
  image: string;
}

export type DockerDeploymentValidationField =
  | "appListeningPort"
  | "env"
  | "image";

export type DockerDeploymentValidationErrorType =
  | "duplicate-env-name"
  | "empty-image"
  | "invalid-env-name"
  | "invalid-image"
  | "invalid-port"
  | "missing-env-name";

export interface DockerDeploymentValidationError {
  field: DockerDeploymentValidationField;
  index?: number;
  message: string;
  type: DockerDeploymentValidationErrorType;
}

export interface DockerDeploymentValidationResult {
  errors: DockerDeploymentValidationError[];
  valid: boolean;
}

const IMAGE_WHITESPACE_RE = /\s/;

function validateImage(image: string): DockerDeploymentValidationError | null {
  const trimmed = image.trim();
  if (trimmed === "") {
    return {
      field: "image",
      message: "Docker image is required.",
      type: "empty-image",
    };
  }
  if (IMAGE_WHITESPACE_RE.test(trimmed)) {
    return {
      field: "image",
      message: "Docker image must not contain spaces.",
      type: "invalid-image",
    };
  }
  return null;
}

function validateAppListeningPort(
  appListeningPort: number
): DockerDeploymentValidationError | null {
  if (
    !Number.isInteger(appListeningPort) ||
    appListeningPort < 1 ||
    appListeningPort > 65_535
  ) {
    return {
      field: "appListeningPort",
      message: "App Listening Port must be a TCP port from 1 to 65535.",
      type: "invalid-port",
    };
  }
  return null;
}

function validateEnv(
  rows: readonly DockerDeploymentEnvVar[]
): DockerDeploymentValidationError[] {
  const errors: DockerDeploymentValidationError[] = [];
  const firstIndexByName = new Map<string, number>();

  rows.forEach((row, index) => {
    const name = row.name.trim();
    if (name === "") {
      errors.push({
        field: "env",
        index,
        message: "Environment variable name is required.",
        type: "missing-env-name",
      });
      return;
    }
    if (!isKubernetesEnvName(name)) {
      errors.push({
        field: "env",
        index,
        message:
          "Use letters, digits, underscores, dots, or hyphens; do not start with a digit.",
        type: "invalid-env-name",
      });
      return;
    }
    if (firstIndexByName.has(name)) {
      errors.push({
        field: "env",
        index,
        message: "Environment variable names must be unique.",
        type: "duplicate-env-name",
      });
      return;
    }
    firstIndexByName.set(name, index);
  });

  return errors;
}

export function validateDockerDeploymentSettings(
  settings: DockerDeploymentSettings
): DockerDeploymentValidationResult {
  const errors = [
    validateImage(settings.image),
    validateAppListeningPort(settings.appListeningPort),
    ...validateEnv(settings.env),
  ].filter((error): error is DockerDeploymentValidationError => error != null);

  return { errors, valid: errors.length === 0 };
}

export function normalizeDockerDeploymentSettings(
  settings: DockerDeploymentSettings
): DockerDeploymentSettings {
  return {
    appListeningPort: settings.appListeningPort,
    env: settings.env.map((row) => ({
      name: row.name.trim(),
      value: row.value,
    })),
    image: settings.image.trim(),
  };
}
