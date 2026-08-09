import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Body inválido" }, 400);

    const {
      items,
      buyer,
      billing,
      shipping,
      shipToDifferentAddress,
      orderNotes,
      paymentMethod,
      coupon,
    } = body;

    const method =
      paymentMethod === "mercadopago"
        ? "mercadopago"
        : (paymentMethod || "transferencia");

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: "El carrito está vacío" }, 400);
    }
    if (!buyer?.name || !buyer?.email || !buyer?.phone) {
      return json({ error: "Faltan datos del comprador" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Faltan variables de entorno de Supabase" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Compra solo para usuarios registrados ---
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }
    if (!userId) {
      return json(
        {
          error: "Tenés que iniciar sesión para comprar",
          code: "AUTH_REQUIRED",
        },
        401,
      );
    }

    // Normalizamos los items: el id del producto es obligatorio para
    // poder descontar stock después.
    const normalizedItems = items.map((i: any) => ({
      id: i.id ?? i.product_id ?? null,
      name: String(i.name ?? "Producto"),
      price: Number(i.price) || 0,
      quantity: Number(i.quantity) || 1,
      image: i.image ?? i.image_url ?? null,
    }));

    if (normalizedItems.some((i) => !i.id)) {
      console.warn("Hay items sin id de producto:", normalizedItems);
    }

    const subtotal = normalizedItems.reduce(
      (s, i) => s + i.price * i.quantity,
      0,
    );

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return json({ error: "El total del pedido es inválido" }, 400);
    }

    // --- Cupón de descuento (autoritativo del lado del servidor) ---
    // El cliente puede mostrar un descuento, pero acá lo revalidamos con la
    // misma RPC y recalculamos sobre el subtotal real. Nunca confiamos en el
    // monto que llega del navegador.
    let discount = 0;
    let couponCode: string | null = null;
    const rawCoupon = typeof coupon === "string" ? coupon.trim() : "";
    if (rawCoupon) {
      const { data: cRows, error: cErr } = await supabase.rpc("validate_coupon", {
        p_code: rawCoupon,
        p_subtotal: subtotal,
      });
      const c = Array.isArray(cRows) ? cRows[0] : cRows;
      if (cErr || !c || c.valid !== true) {
        return json(
          {
            error: (c && c.message) || "El cupón no es válido",
            code: "COUPON_INVALID",
          },
          409,
        );
      }
      discount = Math.min(Number(c.discount_amount) || 0, subtotal);
      couponCode = rawCoupon;
    }

    const total = Math.max(0, Number((subtotal - discount).toFixed(2)));

    // --- Verificar stock antes de cobrar ---
    const productIds = normalizedItems.map((i) => i.id).filter(Boolean);
    if (productIds.length) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, stock")
        .in("id", productIds);

      for (const it of normalizedItems) {
        const p = prods?.find((x: any) => x.id === it.id);
        if (p && Number(p.stock ?? 0) < it.quantity) {
          return json(
            {
              error: `Sin stock suficiente de ${p.name}`,
              code: "NO_STOCK",
            },
            409,
          );
        }
      }
    }

    // --- Crear el pedido en estado "pending" ---
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        items: normalizedItems,
        subtotal: subtotal,
        discount: discount,
        coupon_code: couponCode,
        total: total,
        buyer_name: buyer.name,
        buyer_first_name: buyer.firstName || null,
        buyer_last_name: buyer.lastName || null,
        buyer_company: buyer.company || null,
        buyer_email: buyer.email,
        buyer_phone: buyer.phone,
        document_type: buyer.documentType || null,
        document_number: buyer.documentNumber || null,
        tax_condition: buyer.taxCondition || null,
        billing_street: billing?.street || null,
        billing_number: billing?.number || null,
        billing_floor: billing?.floor || null,
        billing_apartment: billing?.apartment || null,
        billing_postal_code: billing?.postalCode || null,
        shipping_province: shipping?.province || null,
        shipping_city: shipping?.city || null,
        ship_to_different_address: !!shipToDifferentAddress,
        shipping_street: shipping?.street || null,
        shipping_number: shipping?.number || null,
        shipping_floor: shipping?.floor || null,
        shipping_apartment: shipping?.apartment || null,
        shipping_postal_code: shipping?.postalCode || null,
        order_notes: orderNotes || null,
        payment_method: method,
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error al crear el pedido:", orderError);
      return json(
        { error: "No se pudo registrar el pedido", detalle: orderError.message },
        500,
      );
    }

    // --- Registrar el uso del cupón (idempotente por pedido) ---
    if (couponCode) {
      const { error: rErr } = await supabase.rpc("redeem_coupon", { p_code: couponCode });
      if (rErr) console.warn("No se pudo registrar el uso del cupón:", rErr.message);
    }

    // --- Pagos manuales: el stock se descuenta cuando vos confirmás ---
    if (method !== "mercadopago") {
      return json({
        order_number: order.order_number,
        order_id: order.id,
        discount: discount,
        total: total,
        init_point: null,
      });
    }

    // --- Checkout Pro ---
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      return json({ error: "Falta el secreto MP_ACCESS_TOKEN" }, 500);
    }

    const siteUrl = "https://cellspacearg.com.ar";
    // MercadoPago no acepta ítems con precio negativo, así que cuando hay un
    // cupón mandamos una sola línea con el total ya descontado. Sin cupón
    // mantenemos el detalle ítem por ítem (comportamiento original).
    const mpItems = discount > 0
      ? [{
          title: `Pedido ${order.order_number}`,
          quantity: 1,
          unit_price: total,
          currency_id: "ARS",
        }]
      : normalizedItems.map((i) => ({
          title: i.name,
          quantity: i.quantity,
          unit_price: i.price,
          currency_id: "ARS",
        }));

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        items: mpItems,
        payer: { name: buyer.name, email: buyer.email },
        external_reference: order.id,
        statement_descriptor: "CELL SPACE ARG",
        back_urls: {
          success: `${siteUrl}/checkout-resultado.html?status=success&order=${order.order_number}`,
          failure: `${siteUrl}/checkout-resultado.html?status=failure&order=${order.order_number}`,
          pending: `${siteUrl}/checkout-resultado.html?status=pending&order=${order.order_number}`,
        },
        auto_return: "approved",
        notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("Error de Mercado Pago:", mpData);
      return json(
        {
          error: "No se pudo generar el link de pago",
          detalle: mpData?.message ?? null,
        },
        502,
      );
    }

    await supabase
      .from("orders")
      .update({ mp_preference_id: mpData.id })
      .eq("id", order.id);

    return json({
      order_number: order.order_number,
      order_id: order.id,
      discount: discount,
      total: total,
      init_point: mpData.init_point,
    });
  } catch (err) {
    console.error("Error inesperado:", err);
    return json(
      { error: err instanceof Error ? err.message : "Error inesperado" },
      500,
    );
  }
});