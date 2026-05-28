import { type DataBrowserMessageKey, dataBrowserMessages } from "./messages";

type MessageParams = Record<string, string | number>;
type DataBrowserI18n = {
  t: (key: DataBrowserMessageKey | string, params?: MessageParams) => string;
};

function interpolate(message: string, params: MessageParams | undefined) {
  if (params === undefined) {
    return message;
  }

  return Object.entries(params).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    message
  );
}

const dataBrowserI18n: DataBrowserI18n = {
  t(key, params) {
    const message = dataBrowserMessages[key as DataBrowserMessageKey] ?? key;

    return interpolate(message, params);
  },
};

export function useI18n() {
  return dataBrowserI18n;
}
