const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 20000;

function clean(value, maxLength) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : "";
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      message: "Method not allowed.",
    });
  }

  const contentLength = Number(
    request.headers["content-length"] || 0
  );

  if (contentLength > MAX_BODY_BYTES) {
    return response.status(413).json({
      message: "Request is too large.",
    });
  }

  // Reject invalid origins without throwing an unhandled error.
  const origin = request.headers.origin;
  const host =
    request.headers["x-forwarded-host"] || request.headers.host;

  if (origin) {
    try {
      const originUrl = new URL(origin);

      if (
        !host ||
        !["http:", "https:"].includes(originUrl.protocol) ||
        originUrl.host !== host
      ) {
        return response.status(403).json({
          message: "Request origin is not allowed.",
        });
      }
    } catch {
      return response.status(403).json({
        message: "Request origin is not allowed.",
      });
    }
  }

  let body;

  try {
    const bodyText =
      typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body ?? null);

    if (Buffer.byteLength(bodyText, "utf8") > MAX_BODY_BYTES) {
      return response.status(413).json({
        message: "Request is too large.",
      });
    }

    body = JSON.parse(bodyText);
  } catch {
    return response.status(400).json({
      message: "Invalid JSON.",
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response.status(400).json({
      message: "Request body must be a JSON object.",
    });
  }

  // Bots commonly fill hidden fields that people never see.
  if (body.website) {
    return response.status(200).json({ ok: true });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);
  const business = clean(body.business, 120);
  const message = clean(body.message, 3000);

  const phoneDigits = phone.replace(/\D/g, "");
  const validPhone =
    /^[+\d\s().-]+$/.test(phone) &&
    phoneDigits.length >= 7 &&
    phoneDigits.length <= 15;

  if (
    name.length < 2 ||
    !EMAIL_PATTERN.test(email) ||
    !validPhone ||
    business.length < 2 ||
    message.length < 20 ||
    /[\r\n]/.test(name)
  ) {
    return response.status(400).json({
      message: "Please complete every field with valid information.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return response.status(503).json({
      message:
        "Enquiries are temporarily unavailable. Please email us directly.",
    });
  }

  const emailBody = [
    "New VNS Solutions website enquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Mobile / WhatsApp: ${phone}`,
    `Business / project type: ${business}`,
    "",
    "Project goal:",
    message,
  ].join("\n");

  try {
    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "VNS Solutions Website <onboarding@resend.dev>",
          to: ["vnsolutions28@gmail.com"],
          reply_to: email,
          subject: `New website enquiry from ${name}`,
          text: emailBody,
        }),
      }
    );

    if (!resendResponse.ok) {
      console.error(
        "Resend rejected contact email",
        resendResponse.status
      );

      return response.status(502).json({
        message:
          "We could not send your enquiry. Please email us directly.",
      });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    const timedOut =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError";

    console.error(
      "Contact email failed",
      timedOut ? "timeout" : "network or request error"
    );

    return response.status(timedOut ? 504 : 502).json({
      message:
        "We could not send your enquiry. Please email us directly.",
    });
  }
}