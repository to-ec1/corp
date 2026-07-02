export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();
    const { name, company, email, message } = data;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "必須項目が不足しています" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const timestamp = new Date().toISOString();
    const id = `contact:${Date.now()}:${crypto.randomUUID()}`;
    const record = { name, company: company || "-", email, message, timestamp };

    // ① KV保存（必須・ここが失敗したらユーザーにエラーを返す）
    console.log("Step1: KVへ保存開始", id);
    await env.CONTACT_KV.put(id, JSON.stringify(record));
    console.log("Step1: KV保存 完了");

    // ② メール送信（ベストエフォート・失敗しても無視してok:trueを返す）
    // ⚠️ Cloudflare Email Service (Beta) のBinding方法は執筆時点で未検証です。
    //    Cloudflareダッシュボード → Email → Email Service の最新手順に沿って
    //    env.SEND_EMAIL のBinding名・メソッド名を確認・調整してください。
    let emailSent = false;
    try {
      if (env.SEND_EMAIL) {
        console.log("Step2: メール送信試行");
        await env.SEND_EMAIL.send({
          to: "YOUR_RECEIVE_EMAIL@example.com", // ← 受信したいメールアドレスに変更
          from: "noreply@YOUR_DOMAIN.com",       // ← Cloudflareで管理しているドメイン
          subject: `【お問い合わせ】${name}様より`,
          text: `名前: ${name}\n会社: ${company || "-"}\nメール: ${email}\n\n${message}`,
        });
        emailSent = true;
        console.log("Step2: メール送信 成功");
      } else {
        console.log("Step2: SEND_EMAIL未設定のためスキップ（KVには保存済み）");
      }
    } catch (mailErr) {
      console.error("Step2: メール送信 失敗（データはKVに保存済みなので安全）", mailErr);
    }

    return new Response(JSON.stringify({ ok: true, emailSent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
