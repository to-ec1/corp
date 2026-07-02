export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.ADMIN_SECRET || key !== env.ADMIN_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const list = await env.CONTACT_KV.list();
  const items = [];
  for (const k of list.keys) {
    const v = await env.CONTACT_KV.get(k.name);
    if (v) items.push(JSON.parse(v));
  }
  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return new Response(JSON.stringify(items, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
