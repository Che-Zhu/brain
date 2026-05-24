import assert from "node:assert/strict";
import { test } from "node:test";

import { platformAddressHost } from "./platform-address";

test("Platform Address host is deterministic from namespace, AP name, ID, and routing domain", () => {
  const host = platformAddressHost({
    appName: "api",
    namespace: "default",
    platformAddressId: "pa_abc123",
    routingDomain: "apps.example.com",
  });

  assert.equal(host, "api-7c6ad52581.apps.example.com");
  assert.equal(
    host,
    platformAddressHost({
      appName: " api ",
      namespace: "default",
      platformAddressId: "pa_abc123",
      routingDomain: "apps.example.com",
    })
  );
});

test("Platform Address host excludes AP UID and target App Listening Port", () => {
  const first = platformAddressHost({
    appName: "api",
    namespace: "default",
    platformAddressId: "pa_abc123",
    routingDomain: "apps.example.com",
  });
  const afterPortChange = platformAddressHost({
    appName: "api",
    namespace: "default",
    platformAddressId: "pa_abc123",
    routingDomain: "apps.example.com",
  });

  assert.equal(first, "api-7c6ad52581.apps.example.com");
  assert.equal(afterPortChange, first);
});

test("Platform Address host stays pending when required inputs are missing", () => {
  assert.equal(
    platformAddressHost({
      appName: "api",
      namespace: "default",
      platformAddressId: "pa_abc123",
      routingDomain: "",
    }),
    undefined
  );
  assert.equal(
    platformAddressHost({
      appName: "api",
      namespace: "default",
      platformAddressId: "legacy",
      routingDomain: "apps.example.com",
    }),
    undefined
  );
});
