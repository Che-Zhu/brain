import { type DataBrowserMessageKey, dataBrowserMessages } from "./messages";

type MessageParams = Record<string, string | number>;

function interpolate(message: string, params: MessageParams | undefined) {
  if (params === undefined) {
    return message;
  }

  return Object.entries(params).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    message
  );
}

export function useI18n() {
  return {
    t(key: DataBrowserMessageKey | string, params?: MessageParams) {
      const message = dataBrowserMessages[key as DataBrowserMessageKey] ?? key;

      return interpolate(message, params);
    },
  };
}
