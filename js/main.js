/* ---------- Utilities ---------- */
const money = (n) => `${SITE.currency}${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
const money2 = (n) => (n === 0 ? "Free" : money(n));

const EXTRA_KEY = "df_extra_products";
const HIDDEN_KEY = "df_hidden_products";
const OVERRIDE_KEY = "df_override_products";

function applyExtras() {
  try {
    const extras = JSON.parse(localStorage.getItem(EXTRA_KEY)) || [];
    const hidden = new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []);
    const overrides = JSON.parse(localStorage.getItem(OVERRIDE_KEY)) || {};
    extras.forEach((e) => {
      if (e && e.id && !PRODUCTS.some((p) => p.id === e.id)) PRODUCTS.push(e);
    });
    Object.keys(overrides).forEach((id) => {
      const i = PRODUCTS.findIndex((p) => p.id === id);
      if (i >= 0 && overrides[id]) PRODUCTS.splice(i, 1, overrides[id]);
    });
    for (let i = PRODUCTS.length - 1; i >= 0; i--) {
      if (hidden.has(PRODUCTS[i].id)) PRODUCTS.splice(i, 1);
    }
  } catch (e) {}
}

const catInfo = (key) => CATEGORIES.find((c) => c.key === key) || { name: key, icon: "📦", color: "var(--brand)" };

const pct = (a, b) => Math.round(((a - b) / a) * 100);

const stars = (r) => {
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
};

const starsEl = (r, count) =>
  `<div class="stars">${stars(r)} <span>${r.toFixed(1)}${count ? ` · ${count.toLocaleString()}` : ""}</span></div>`;

/* ---------- Media helpers (images max 5, video max 1) ---------- */
const pImgs = (p) => (Array.isArray(p.imgs) ? p.imgs.filter(Boolean).slice(0, 5) : []);
const pVid = (p) => (p && typeof p.video === "string" ? p.video.trim() : "");
const embedUrl = (u) => {
  try {
    const y = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/.exec(u);
    if (y) return `https://www.youtube.com/embed/${y[1]}`;
  } catch (e) {}
  return u;
};
const isYouTube = (u) => /youtube\.com|youtu\.be/i.test(u);
const mediaCount = (p) => pImgs(p).length + (pVid(p) ? 1 : 0);

function mediaPanel(sel, p, imgs, vid) {
  if (sel === "vid" && vid) {
    return isYouTube(vid)
      ? `<iframe src="${embedUrl(vid)}" title="${p.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
      : `<video controls preload="metadata" src="${vid}"></video>`;
  }
  const i = parseInt(String(sel || "img-0").replace("img-", ""), 10);
  const src = imgs[i] || (imgs.length ? imgs[0] : "");
  return src ? `<img src="${src}" alt="${p.title}">` : "";
}

/* ---------- Spotlight removed ---------- */

/* ---------- Downloads / delivery PDF ---------- */
const productLinks = (p) =>
  (Array.isArray(p.links) ? p.links : [])
    .map((l) => (l && typeof l === "object" && l.url ? { label: (l.label || "Access link").trim(), url: l.url.trim() } : null))
    .filter(Boolean);

function buildLinksPdf(data) {
  const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
  const W = 612, H = 792;
  const lines = data.lines || [];
  const ops = [];
  let y;

  ops.push("0.294 0.031 0.29 rg 0 700 612 92 re f");
  ops.push("1 1 1 rg");
  ops.push(`BT /F1 20 Tf 40 762 Td (${esc(data.store)}) Tj ET`);
  ops.push(`BT /F1 12 Tf 40 741 Td (${esc("Your download file for: " + data.title)}) Tj ET`);
  ops.push("0 0 0 rg");

  y = 676;
  const row = (label, val) => {
    ops.push(`BT /F2 10 Tf 40 ${y} Td (${esc(label + ": " + val)}) Tj ET`);
    y -= 20;
  };
  row("Order ref", data.ref);
  row("Date", data.date);
  row("Customer", data.name);
  y -= 10;

  ops.push(`BT /F1 13 Tf 40 ${y} Td (Your download links) Tj ET`);
  y -= 22;

  const rects = []; /* eslint-disable no-unused-vars */
  const annots = [];
  const addLink = (label, url) => {
    ops.push(`BT /F1 11 Tf 40 ${y} Td (${esc((label ? label + ": " : "") + url)}) Tj ET`);
    annots.push(`<< /Subtype /Link /Border [0 0 0] /Rect [40 ${y - 14} 560 ${y + 3}] /A << /S /URI /URI (${esc(url)}) >> >>`);
    y -= 24;
  };

  lines.forEach((l) => addLink(l.label, l.url));
  if (data.github) addLink("Source / GitHub", data.github);
  y -= 4;

  ops.push(`BT /F2 9 Tf 40 ${y} Td (${esc("Tip: click any link above, or copy it into your browser. Thank you for shopping at " + data.store + "!")}) Tj ET`);

  const stream = ops.join("\n");
  const streamLen = new TextEncoder().encode(stream).length;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R /Annots 7 0 R >>\nendobj\n`,
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`,
    `7 0 obj\n[ ${annots.join("\n  ")} ]\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o) => {
    offsets.push(pdf.length);
    pdf += o;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((n) => {
    pdf += String(n).padStart(10, "0") + " 00000 n \n";
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadProductPdf(p, order) {
  if (p && p.pdf) {
    if (String(p.pdf).indexOf("data:") === 0) {
      const a = document.createElement("a");
      a.href = p.pdf;
      a.download = `DigitalForge-${p.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Downloading PDF 📄");
    } else {
      window.open(p.pdf, "_blank", "noopener");
      toast("Opening your delivery file 🔽");
    }
    return;
  }
  const links = productLinks(p);
  if (!links.length) {
    toast("No download links added for this product yet", "⚠️");
    return;
  }
  const blob = buildLinksPdf({
    title: p.title,
    ref: order.ref,
    date: new Date().toLocaleDateString("en-GB"),
    name: order.name,
    lines: links,
    store: SITE.name,
    github: SITE.github,
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `DigitalForge-${p.id}-download.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Download started 🔽");
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, icon = "✅") {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="t-ic">${icon}</span><span>${msg}</span>`;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Cart (localStorage) ---------- */
const CART_KEY = "df_cart";
const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
};
const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const cartTotal = (cart) =>
  cart.reduce((s, i) => {
    const p = PRODUCTS.find((x) => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
const cartCount = (cart) => cart.reduce((s, i) => s + i.qty, 0);

function addToCart(id, qty = 1) {
  const cart = getCart();
  const found = cart.find((i) => i.id === id);
  if (found) found.qty += qty;
  else cart.push({ id, qty });
  saveCart(cart);
  refreshCartCount();
  const p = PRODUCTS.find((x) => x.id === id);
  toast(`“${p.title}” added to cart`, "🛒");
}

function changeQty(id, delta) {
  let cart = getCart();
  const found = cart.find((i) => i.id === id);
  if (!found) return;
  found.qty += delta;
  if (found.qty <= 0) cart = cart.filter((i) => i.id !== id);
  saveCart(cart);
  refreshCartCount();
  renderCartUI();
}

function removeFromCart(id) {
  saveCart(getCart().filter((i) => i.id !== id));
  refreshCartCount();
  renderCartUI();
}

function refreshCartCount() {
  const n = cartCount(getCart());
  const el = document.querySelector(".cart-count");
  if (!el) return;
  if (n > 0) {
    el.textContent = n;
    el.classList.add("show");
  } else {
    el.classList.remove("show");
  }
}

/* ---------- Product card partial ---------- */
const productCard = (p) => {
  const off = p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>` : "";
  const badge = p.badge ? `<span class="card-badge">${p.badge}</span>` : "";
  const priceHtml =
    p.price === 0
      ? `<div class="price free">Free</div>`
      : `<div class="price">${money(p.price)}${off}</div>`;
  const imgs = pImgs(p);
  const mc = imgs.length + (pVid(p) ? 1 : 0);
  const artHtml = imgs[0]
    ? `<img src="${imgs[0]}" alt="${p.title}" loading="lazy">${mc > 1 ? `<span class="media-count">+${mc - 1} 📷/🎬</span>` : ""}`
    : `<span>${p.icon}</span>`;
  return `
  <article class="card reveal">
    <div class="card-top" style="background:${p.grad}">
      ${badge}
      <button class="card-fav" aria-label="Save" onclick="event.preventDefault();toast('Added to wishlist','💜')">♡</button>
      ${artHtml}
    </div>
    <div class="card-body">
      <span class="card-cat">${catInfo(p.category).name}</span>
      <h3><a href="product.html?id=${p.id}">${p.title}</a></h3>
      ${starsEl(p.rating, p.reviews)}
      <div class="card-foot">
        ${priceHtml}
        <button class="quick-add" aria-label="Add to cart" onclick="addToCart('${p.id}')">➕</button>
      </div>
    </div>
  </article>`;
};

/* ---------- Nav / footer behaviour ---------- */
function initNav() {
  const burger = document.querySelector(".burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => {
      burger.classList.toggle("open");
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        burger.classList.remove("open");
        links.classList.remove("open");
      })
    );
  }
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- Home page ---------- */
function initHome() {
  const featured = document.querySelector("#featured-grid");
  if (featured) {
    featured.innerHTML = PRODUCTS.map(productCard).join("");
    initReveal();
  }

  const cats = document.querySelector("#categories-list") || document.querySelector("#categories");
  if (cats) {
    cats.innerHTML = CATEGORIES.map((c) => {
      const count = PRODUCTS.filter((p) => p.category === c.key).length;
      return `
      <a class="cat-card reveal" href="shop.html?cat=${c.key}" style="--glow:${c.color}" data-count="${count}">
        <div class="cat-ic">${c.icon}</div>
        <h3>${c.name}</h3>
        <span>${count} products</span>
      </a>`;
    }).join("");
  }

  const news = document.querySelector(".news-form");
  if (news) {
    news.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = news.querySelector("input");
      if (input.value.trim()) {
        toast("Subscribed! Welcome to the forge. 🔥");
        input.value = "";
      }
    });
  }
}

/* ---------- Shop page ---------- */
function initShop() {
  const grid = document.querySelector("#shop-grid");
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const chipsBox = document.querySelector(".chips");
  const searchInput = document.querySelector("#shop-search");
  const sortSel = document.querySelector("#shop-sort");

  const state = { cat: params.get("cat") || "all", q: "", sort: "popular" };

  const chipHtml = () => {
    const all = `<button class="chip ${state.cat === "all" ? "active" : ""}" data-cat="all">All</button>`;
    const rest = CATEGORIES.map(
      (c) =>
        `<button class="chip ${state.cat === c.key ? "active" : ""}" data-cat="${c.key}">${c.icon} ${c.name}</button>`
    ).join("");
    return all + rest;
  };
  chipsBox.innerHTML = chipHtml();

  chipsBox.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.cat = chip.dataset.cat;
    chipsBox.innerHTML = chipHtml();
    render();
  });

  if (searchInput)
    searchInput.addEventListener("input", (e) => {
      state.q = e.target.value.trim().toLowerCase();
      render();
    });

  if (sortSel)
    sortSel.addEventListener("change", (e) => {
      state.sort = e.target.value;
      render();
    });

  function filtered() {
    let list = PRODUCTS.filter((p) => {
      const okCat = state.cat === "all" || p.category === state.cat;
      const okQ =
        !state.q ||
        (p.title + p.description + catInfo(p.category).name + p.tagline).toLowerCase().includes(state.q);
      return okCat && okQ;
    });
    if (state.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (state.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => b.rating - a.rating);
    return list;
  }

  function render() {
    const list = filtered();
    grid.innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div><h3>No products found</h3><p>Try a different search keyword or category.</p></div>`;
    initReveal();
  }

  render();
}

/* ---------- Product detail page ---------- */
function initProduct() {
  const box = document.querySelector("#product-detail");
  if (!box) return;
  const id = new URLSearchParams(location.search).get("id");
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) {
    box.innerHTML = `<div class="empty"><div class="big">🤔</div><h3>Product not found</h3><p><a href="shop.html" class="link-more">Browse the shop instead →</a></p></div>`;
    return;
  }

  document.title = `${p.title} — ${SITE.name}`;

  const cat = catInfo(p.category);
  const off = p.oldPrice ? `<small class="old">${money(p.oldPrice)}</small>` : "";
  const saveAmt = p.oldPrice ? `<span class="format-chip">🔥 Save ${pct(p.oldPrice, p.price)}% today</span>` : "";

  const imgs = pImgs(p);
  const vid = pVid(p);
  const mc = imgs.length + (vid ? 1 : 0);

  let mediaHtml = `<div class="detail-art" style="background:${p.grad}"><span class="big">${p.icon}</span></div>`;
  if (imgs.length || vid) {
    const defSel = imgs.length ? "img-0" : "vid";
    const thumbs = [
      ...imgs.map(
        (src, i) =>
          `<button class="thumb-btn ${i === 0 ? "active" : ""}" data-sel="img-${i}" title="Image ${i + 1}"><span class="t-ic">📷</span><img src="${src}" alt="" loading="lazy"></button>`
      ),
      ...(vid
        ? [`<button class="thumb-btn" data-sel="vid" title="Video"><span class="t-ic">🎬</span><span class="t-vid">▶</span></button>`]
        : []),
    ].join("");
    mediaHtml = `<div class="gallery" id="gallery">
      <div class="gallery-main" id="g-main"><span class="g-ph">${p.icon}</span>${mediaPanel(defSel, p, imgs, vid)}</div>
      ${mc > 1 ? `<div class="thumbs">${thumbs}</div>` : ""}
    </div>`;
  }

  box.innerHTML = `
    <nav class="breadcrumb"><a href="index.html">Home</a> / <a href="shop.html">Shop</a> / <a href="shop.html?cat=${p.category}">${cat.name}</a> / <span style="color:var(--ink)">${p.title}</span></nav>
    <div class="detail-grid">
      ${mediaHtml}
      <div>
        <h1>${p.title}</h1>
        <p class="tagline">${p.tagline}</p>
        <div class="meta">
          ${starsEl(p.rating, p.reviews)}
          <span class="dot"></span>
          <span>${cat.icon} ${cat.name}</span>
          <span class="dot"></span>
          <span>${p.badge ? "🏆 " + p.badge : "⚡ Instant Download"}</span>
        </div>
        <p class="desc">${p.description}</p>
        <h4 class="feat-title">What's inside</h4>
        <ul class="feats">${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>
        <div class="buy-box">
          ${saveAmt}
          <div class="spec-row"><span>Format</span><span>${p.format}</span></div>
          <div class="spec-row"><span>License</span><span>Personal use — lifetime</span></div>
          <div class="spec-row"><span>Delivery</span><span>Instant, after payment</span></div>
          <div class="buy-row">
            <div class="price ${p.price === 0 ? "free" : ""}">${p.price === 0 ? "Free" : money(p.price)}${off}</div>
            <div style="display:flex;gap:10px">
              <button class="btn-ghost" onclick="addToCart('${p.id}')">Add to cart</button>
              <button class="btn-primary" onclick="addToCart('${p.id}');setTimeout(()=>location.href='checkout.html',350)">Buy now</button>
            </div>
          </div>
          <div class="buy-note">🔒 Secure checkout · instant access to your files</div>
        </div>
      </div>
    </div>
    <h2 style="margin:56px 0 22px;font-weight:900">You may also like</h2>
    <div class="grid" id="related">${PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id)
      .slice(0, 4)
      .map(productCard)
      .join("")}</div>`;

  const gal = document.getElementById("gallery");
  const gMain = document.getElementById("g-main");
  if (gal && gMain) {
    gal.addEventListener("click", (e) => {
      const b = e.target.closest(".thumb-btn");
      if (!b) return;
      gal.querySelectorAll(".thumb-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      gMain.innerHTML = `<span class="g-ph">${p.icon}</span>` + mediaPanel(b.dataset.sel, p, pImgs(p), pVid(p));
    });
  }

  initReveal();
}

/* ---------- Cart page ---------- */
function renderCartUI() {
  const list = document.querySelector("#cart-items");
  const summary = document.querySelector("#cart-summary");
  const empty = document.querySelector("#cart-empty");
  if (!list && !empty) return;

  const cart = getCart();
  const items = cart
    .map((i) => PRODUCTS.find((p) => p.id === i.id))
    .filter(Boolean);

  if (summary) {
    const sub = cartTotal(cart);
    summary.innerHTML = `
      <h3>Order summary</h3>
      <div class="line"><span>Subtotal</span><span>${money2(sub)}</span></div>
      <div class="line"><span>Items</span><span>${cartCount(cart)}</span></div>
      <div class="line"><span>Discount</span><span>${money2(0)}</span></div>
      <div class="line total"><span>Total</span><span>${money2(sub)}<br><small>${sub === 0 ? "(free products)" : "(incl. VAT where applicable)"}</small></span></div>
      ${sub > 0 ? `<a href="checkout.html" class="btn-primary btn-block" style="margin-top:16px">Checkout safely →</a>` : ""}
      <a href="shop.html" class="btn-ghost btn-block" style="margin-top:10px">Continue shopping</a>`;
  }

  if (list && empty) {
    if (items.length === 0) {
      empty.style.display = "block";
      list.innerHTML = "";
    } else {
      empty.style.display = "none";
      list.innerHTML = items
        .map(
          (p) => `
        <div class="cart-item reveal">
          <div class="cart-thumb" style="background:${p.grad}">${p.icon}</div>
          <div>
            <a href="product.html?id=${p.id}" style="color:inherit"><h4>${p.title}</h4></a>
            <span class="cat">${catInfo(p.category).name}</span>
            <div class="qty">
              <button onclick="changeQty('${p.id}',-1)">−</button>
              <span>${items.find((i) => i.id === p.id) ? cart.find((c) => c.id === p.id).qty : 1}</span>
              <button onclick="changeQty('${p.id}',1)">+</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">
            <span class="price">${money2(p.price * (cart.find((c) => c.id === p.id)?.qty || 1))}</span>
            <button class="remove" aria-label="Remove" onclick="removeFromCart('${p.id}')">✕</button>
          </div>
        </div>`
        )
        .join("");
      initReveal();
    }
  }
}

/* ---------- Checkout ---------- */
function initCheckout() {
  const summary = document.querySelector("#checkout-summary");
  const payOpts = document.querySelectorAll(".pay-opt");
  const form = document.querySelector("#checkout-form");
  if (!summary) return;

  const cart = getCart();
  const items = cart.map((i) => PRODUCTS.find((p) => p.id === i.id)).filter(Boolean);

  if (items.length === 0 && summary) {
    summary.innerHTML = `<div class="empty"><div class="big">🛒</div><h3>Your cart is empty</h3><p>Add some products before checking out.</p><a href="shop.html" class="btn-primary">Browse products</a></div>`;
    if (form) form.style.display = "none";
    return;
  }

  const sub = cartTotal(cart);
  const fee = sub > 30 ? 0 : 1.5;
  const total = sub + fee;

  function refresh() {
    summary.innerHTML = `
      <h3>Your order</h3>
      ${items.map((p) => `<div class="line"><span>${p.icon} ${p.title} × ${cart.find((c) => c.id === p.id).qty}</span><span>${money(p.price * cart.find((c) => c.id === p.id).qty)}</span></div>`).join("")}
      <div class="line"><span>Subtotal</span><span>${money(sub)}</span></div>
      <div class="line"><span>Processing fee</span><span>${fee === 0 ? "Free" : money(fee)}</span></div>
      <div class="line total"><span>Total</span><span>${money(total)}</span></div>
      <button type="submit" form="checkout-form" class="btn-primary btn-block" style="margin-top:16px">Place order · ${money(total)}</button>
      <div class="buy-note">🔒 Payments are encrypted &amp; secure</div>`;
  }
  refresh();

  payOpts.forEach((opt) =>
    opt.addEventListener("click", () => {
      payOpts.forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
    })
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.querySelector("#email").value;
    const name = form.querySelector("#name").value;
    const paid = payOpts.find((o) => o.classList.contains("selected"))?.dataset.method || "Debit / Credit Card";
    localStorage.setItem("df_order", JSON.stringify({ name, email, total, method: paid, ref: "DF-" + Date.now().toString(36).toUpperCase(), items: items.map((p) => ({ id: p.id, qty: cart.find((c) => c.id === p.id)?.qty || 1 })) }));
    localStorage.removeItem(CART_KEY);
    location.href = "success.html";
  });
}

/* ---------- Success page ---------- */
function initSuccess() {
  const box = document.querySelector("#success-box");
  if (!box) return;
  const order = JSON.parse(localStorage.getItem("df_order") || "null");
  if (!order) {
    box.innerHTML = `<div class="empty"><div class="big">🔗</div><h3>No recent order</h3><p>Nothing to show here yet.</p><a href="shop.html" class="btn-primary">Shop now</a></div>`;
    return;
  }
  box.innerHTML = `
    <div class="tick">✓</div>
    <h1>Thank you, ${order.name || "friend"}! 🎉</h1>
    <p>Your payment was successful and your downloads are being prepared. A receipt has been sent to <strong style="color:var(--ink)">${order.email}</strong>.</p>
    <div class="receipt">
      <div class="line"><span>Order ref</span><strong>${order.ref}</strong></div>
      <div class="line"><span>Method</span><strong>${order.method}</strong></div>
      <div class="line"><span>Amount</span><strong>${money(order.total)}</strong></div>
      <div class="line"><span>Status</span><strong style="color:var(--green)">● Paid</strong></div>
    </div>
    <a href="#downloads" class="btn-primary">Continue to my downloads ↓</a>`;

  const dl = document.querySelector("#downloads");
  if (dl) {
    const items = (order.items || [])
      .map((i) => ({ p: PRODUCTS.find((x) => x.id === i.id), qty: i.qty }))
      .filter((x) => x.p);
    if (items.length) {
      dl.innerHTML = `
        <h2>Your downloads <span style="background:var(--brand);color:#fff;font-size:0.72rem;font-weight:800;padding:4px 10px;border-radius:999px;vertical-align:middle">🔽 ready</span></h2>
        <p class="dl-note">Your delivery file is a PDF with every access link (Canva, pattern, GitHub…) inside. Click below to download each file.</p>
        <div class="dl-list">
          ${items
            .map(
              ({ p, qty }) => `
            <div class="dl-card">
              <span class="dl-ic" style="background:${p.grad}">${p.icon}</span>
              <div class="dl-info">
                <h4>${p.title}</h4>
                <span class="dl-sub">${p.format || catInfo(p.category).name}${qty > 1 ? " · ×" + qty : ""}</span>
              </div>
              <button class="dl-btn" onclick="downloadProductPdf(PRODUCTS.find(p=>p.id==='${p.id}'), window.__order)">📥 Download file (PDF)</button>
            </div>`
            )
            .join("")}
        </div>
        <p class="dl-note">Problem downloading? <a href="https://wa.me/923716774307?text=Hi%20DigitalForge%20%F0%9F%94%A5%20I%20need%20help%20with%20my%20download" target="_blank" rel="noopener" style="color:var(--brand);font-weight:700">Message us on WhatsApp</a> and we'll send your files instantly. 💬</p>
        <p class="dl-note"><a href="shop.html" class="link-more">Continue shopping →</a></p>`;
      window.__order = order;
    }
  }
  window.scrollTo(0, 0);
}

/* ---------- Bootstrap ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  refreshCartCount();
  initReveal();
  initHome();
  initShop();
  initProduct();
  renderCartUI();
  initCheckout();
  initSuccess();
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
});