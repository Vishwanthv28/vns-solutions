const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "Method not allowed." });
  }

  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > 20000) {
    return response.status(413).json({ message: "Request is too large." });
  }

  const origin = request.headers.origin;
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (origin && host && new URL(origin).host !== host) {
    return response.status(403).json({ message: "Request origin is not allowed." });
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : (request.body || {});

  // Bots commonly fill hidden fields that people never see.
  if (body.website) {
    return response.status(200).json({ ok: true });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 160);
  const phone = clean(body.phone, 40);
  const business = clean(body.business, 120);
  const message = clean(body.message, 3000);

  if (name.length < 2 || !EMAIL_PATTERN.test(email) || phone.length < 7 || business.length < 2 || message.length < 20) {
    return response.status(400).json({ message: "Please complete every field with valid information." });
  }

  if (!process.env.RESEND_API_KEY) {
    return response.status(503).json({ message: "Enquiries are temporarily unavailable. Please email us directly." });
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
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "VNS Solutions Website <onboarding@resend.dev>",
        to: ["vnsolutions28@gmail.com"],
        reply_to: email,
        subject: `New website enquiry from ${name}`,
        text: emailBody,
      }),
    });

    if (!resendResponse.ok) {
      console.error("Resend rejected contact email", resendResponse.status);
      return response.status(502).json({ message: "We could not send your enquiry. Please email us directly." });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Contact email failed", error);
    return response.status(500).json({ message: "We could not send your enquiry. Please email us directly." });
  }
}
