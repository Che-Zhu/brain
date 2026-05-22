import assert from "node:assert/strict";
import { test } from "node:test";

import { hasPublicApEndpoint } from "./project-services-refresh";

test("public AP endpoint detection includes Network public addresses", () => {
  assert.equal(
    hasPublicApEndpoint({
      items: [
        {
          metadata: { name: "api", namespace: "default" },
          spec: {
            input: {
              network: {
                privatePort: 8080,
                publicAddresses: [{ host: "api.example.com", port: 8080 }],
              },
            },
          },
          status: {
            network: {
              publicAddresses: [
                {
                  host: "api.example.com",
                  port: 8080,
                  url: "https://api.example.com/",
                },
              ],
            },
          },
        },
      ],
    }),
    true
  );
});
