export async function sendPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  if (!token?.startsWith("ExponentPushToken[")) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify({ to: token, sound: "default", title, body, data }),
    });
  } catch {
    // Non-critical — never crash the main request
  }
}

export async function sendPushMany(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  const valid = tokens.filter((t) => t?.startsWith("ExponentPushToken["));
  if (valid.length === 0) return;

  const messages = valid.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch {}
}
