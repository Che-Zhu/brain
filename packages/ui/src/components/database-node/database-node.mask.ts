const CONNECTION_PROTOCOL_REGEX = /^([a-z][a-z0-9+.-]*:\/\/)(.*)$/i;

function maskSecretPart(value: string, preserveLeading: boolean) {
  if (!value) {
    return "";
  }

  if (!preserveLeading) {
    return "*******";
  }

  return `${value.slice(0, 1)}*******`;
}

function maskAuthorityCredentials(authority: string) {
  const atIndex = authority.lastIndexOf("@");

  if (atIndex <= 0) {
    return authority;
  }

  const credentials = authority.slice(0, atIndex);
  const destination = authority.slice(atIndex + 1);
  const colonIndex = credentials.indexOf(":");

  if (colonIndex === -1) {
    return `${maskSecretPart(credentials, true)}@${destination}`;
  }

  const username = credentials.slice(0, colonIndex);
  const password = credentials.slice(colonIndex + 1);

  return `${maskSecretPart(username, true)}:${maskSecretPart(
    password,
    false
  )}@${destination}`;
}

export function maskDatabaseConnectionString(value: string) {
  if (!value) {
    return value;
  }

  const protocolMatch = value.match(CONNECTION_PROTOCOL_REGEX);

  if (!protocolMatch) {
    return maskAuthorityCredentials(value);
  }

  const protocol = protocolMatch[1] ?? "";
  const authority = protocolMatch[2] ?? "";

  return `${protocol}${maskAuthorityCredentials(authority)}`;
}
