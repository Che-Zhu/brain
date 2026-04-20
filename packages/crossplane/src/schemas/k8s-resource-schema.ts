import { z } from "zod";

// Environment variable schema
export const EnvSchema = z
  .object({
    name: z.string(),
    value: z.string().optional(),
    valueFrom: z
      .object({
        secretKeyRef: z.object({
          name: z.string(),
          key: z.string(),
        }),
      })
      .optional(),
  })
  // `value` can be an empty string in Kubernetes; treat it as provided.
  .refine((data) => data.value !== undefined || data.valueFrom !== undefined, {
    message: "Either 'value' or 'valueFrom' must be provided",
  });

// Base Kubernetes resource schema
export const K8sResourceSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: z.object({
    name: z.string(),
    namespace: z.string().optional(),
    uid: z.string().optional(),
    resourceVersion: z.string().optional(),
    generation: z.number().optional(),
    creationTimestamp: z.string().optional(),
    deletionTimestamp: z.string().optional(),
    labels: z.record(z.string(), z.string()).optional(),
    annotations: z.record(z.string(), z.string()).optional(),
    ownerReferences: z
      .array(
        z.object({
          apiVersion: z.string(),
          kind: z.string(),
          name: z.string(),
          uid: z.string(),
          controller: z.boolean().optional(),
          blockOwnerDeletion: z.boolean().optional(),
        })
      )
      .optional(),
    finalizers: z.array(z.string()).optional(),
  }),
  spec: z.record(z.string(), z.unknown()).optional(),
  status: z.record(z.string(), z.unknown()).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  // Event-specific fields (optional for compatibility with K8sEventSchema)
  count: z.number().optional(),
  eventTime: z.string().nullable().optional(),
  firstTimestamp: z.string().optional(),
  involvedObject: z
    .object({
      apiVersion: z.string(),
      fieldPath: z.string().optional(),
      kind: z.string(),
      name: z.string(),
      namespace: z.string().optional(),
      resourceVersion: z.string().optional(),
      uid: z.string().optional(),
    })
    .optional(),
  lastTimestamp: z.string().optional(),
  message: z.string().optional(),
  reason: z.string().optional(),
  reportingComponent: z.string().optional(),
  reportingInstance: z.string().optional(),
  source: z
    .object({
      component: z.string(),
      host: z.string(),
    })
    .optional(),
  type: z.string().optional(),
});

// Event-specific schema
export const K8sEventSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: z.object({
    name: z.string(),
    namespace: z.string().optional(),
    uid: z.string().optional(),
    resourceVersion: z.string().optional(),
    generation: z.number().optional(),
    creationTimestamp: z.string().optional(),
    deletionTimestamp: z.string().optional(),
    labels: z.record(z.string(), z.string()).optional(),
    annotations: z.record(z.string(), z.string()).optional(),
    ownerReferences: z
      .array(
        z.object({
          apiVersion: z.string(),
          kind: z.string(),
          name: z.string(),
          uid: z.string(),
          controller: z.boolean().optional(),
          blockOwnerDeletion: z.boolean().optional(),
        })
      )
      .optional(),
    finalizers: z.array(z.string()).optional(),
  }),
  count: z.number().optional(),
  eventTime: z.string().nullable().optional(),
  firstTimestamp: z.string().optional(),
  involvedObject: z.object({
    apiVersion: z.string(),
    fieldPath: z.string().optional(),
    kind: z.string(),
    name: z.string(),
    namespace: z.string().optional(),
    resourceVersion: z.string().optional(),
    uid: z.string().optional(),
  }),
  lastTimestamp: z.string().optional(),
  message: z.string().optional(),
  reason: z.string().optional(),
  reportingComponent: z.string().optional(),
  reportingInstance: z.string().optional(),
  source: z
    .object({
      component: z.string(),
      host: z.string(),
    })
    .optional(),
  type: z.string().optional(),
});

// Status schema - unified status enum for all resource types
export const StatusSchema = z.enum([
  "running",
  "stopped",
  "pending",
  "deleting",
  "error",
  "shutdown",
  "creating",
  "unknown",
  "failed",
]);

// Name schema for Kubernetes resources (DNS compliant)
export const NameSchema = z
  .string()
  .min(1, "Name is required")
  .max(63, "Name must be 63 characters or less")
  .regex(
    /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
    "Name must be DNS compliant: lowercase, numbers, hyphens only"
  )
  .describe(
    `You are free to choose any unique name identifier you like. If the name you want is already taken or you want to guarantee uniqueness without checking, simply append a short random string (letters, numbers, or hyphens) to it.
    
    Examples of valid unique names:

    - my-project-adjk0
    - cool-app-9x7f2
    - report-2025-k8mzp
    - user-flow-x1p92
  
    Just make sure the final name is unique across the system — appending a random suffix is the recommended way to achieve that.`
  );

export const PodSchema = z.object({
  name: NameSchema,
  status: StatusSchema,
});

// Kubernetes resource list schema
export const K8sResourceListSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: z
    .object({
      resourceVersion: z.string().optional(),
      selfLink: z.string().optional(),
    })
    .optional(),
  items: z.array(K8sResourceSchema),
});

// K8s Item schema - mandates name and resourceType, allows other fields
export const K8sItemSchema = z
  .object({
    name: z.string(),
    uid: z.string(),
    resourceType: z.string(),
  })
  .loose();

// Type exports
export type Env = z.infer<typeof EnvSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type K8sResource = z.infer<typeof K8sResourceSchema>;
export type K8sEvent = z.infer<typeof K8sEventSchema>;
export type K8sResourceList = z.infer<typeof K8sResourceListSchema>;
export type K8sItem = z.infer<typeof K8sItemSchema>;
export type Name = z.infer<typeof NameSchema>;
