export async function parseJsonSafe(response) {
  return response.json().catch(() => ({}));
}
