export default function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      message: "Method not allowed.",
    });
  }

  return response.status(200).json({
    ok: true,
    service: "VNS backend",
  });
}