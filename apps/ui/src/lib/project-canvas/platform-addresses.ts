/** biome-ignore lint/performance/noBarrelFile: Compatibility facade for app-local Platform Address imports. */
export {
  generatePlatformAddressId,
  isPlatformAddressId,
  normalizePlatformAddressId,
  PLATFORM_ADDRESS_ID_PATTERN,
  PLATFORM_ADDRESS_ID_RE,
  platformAddressEndpoint,
  platformAddressHost,
  platformAddressIdFromValue,
  platformAddressIdsFromRows,
} from "@workspace/crossplane/lib/platform-address";
