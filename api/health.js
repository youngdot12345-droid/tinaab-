export default function handler(_req, res) {
  res.status(200).json({ ok: true, service: "tinaab-api", status: "healthy" });
}
