const PASS_KEY = "df_admin_pass";
const SESS_KEY = "df_admin_session";

const defaultPass = "admin123";
const getPass = () => localStorage.getItem(PASS_KEY) || defaultPass;

const catInfoFor = (key) =>
  CATEGORIES.find((c) => c.key === key) || { key, name: key, icon: "📦", color: "var(--brand)" };

const moneyOf = (n) => `${SITE.currency}${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;

function loadExtras() {
  return {
    extras: JSON.parse(localStorage.getItem(EXTRA_KEY) || "[]"),
    hidden: new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]")),
    overrides: JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}"),
  };
}

function catalog() {
  const { extras, hidden, overrides } = loadExtras();
  const list = [...PRODUCTS];
  extras.forEach((e) => {
    if (e && e.id && !list.some((p) => p.id === e.id)) list.push(e);
  });
  Object.keys(overrides).forEach((id) => {
    const i = list.findIndex((p) => p.id === id);
    if (i >= 0 && overrides[id]) list.splice(i, 1, overrides[id]);
  });
  return {
    shown: list.filter((p) => !hidden.has(p.id)),
    hiddenList: list.filter((p) => hidden.has(p.id)),
    hiddenSet: hidden,
    extras,
    overrides,
  };
}

function rowHtml(p, isHidden) {
  const old = p.oldPrice ? `<span class="old">${moneyOf(p.oldPrice)}</span>` : "";
  const price = p.price === 0 ? "Free" : moneyOf(p.price);
  const cat = catInfoFor(p.category);
  const imgsN = Array.isArray(p.imgs) ? p.imgs.filter(Boolean).length : 0;
  const vidN = p.video ? 1 : 0;
  const linksN = productLinks ? (Array.isArray(p.links) ? p.links.filter((l) => l && l.url).length : 0) : 0;
  const pdfN = p.pdf ? 1 : 0;
  const dlBadge = (linksN + pdfN) > 0 ? ` · 📄 ${linksN}${pdfN ? "+PDF" : ""}` : "";
  return `
  <tr data-id="${p.id}">
    <td><span class="mini" style="background:${p.grad}">${p.icon || "📦"}</span></td>
    <td>
      <strong>${p.title}</strong>
      ${p.badge ? `<div style="font-size:0.7rem;color:var(--brand);font-weight:800;text-transform:uppercase;letter-spacing:.04em">${p.badge}</div>` : ""}
      <div style="font-size:0.68rem;color:var(--muted-2)">${(imgsN + vidN) > 0 ? `📷 ${imgsN}${vidN ? " · 🎬 1" : ""}` : "no media"}${dlBadge}</div>
    </td>
    <td>${cat.icon} ${cat.name}</td>
    <td class="price-cell">${price}${old}</td>
    <td>${isHidden ? '<span style="color:var(--danger);font-weight:700">Hidden</span>' : '<span style="color:var(--green);font-weight:700">Live</span>'}</td>
    <td>
      <div class="tbl-actions">
        ${isHidden ? `<button class="mini-btn" onclick="restoreProduct('${p.id}')">Restore</button>` : `<button class="mini-btn" onclick="editProduct('${p.id}')">Edit</button><button class="mini-btn red" onclick="deleteProduct('${p.id}')">✕</button>`}
      </div>
    </td>
  </tr>`;
}

function renderAdmin(filter = "all") {
  const tbody = document.getElementById("admin-tbody");
  const c = catalog();
  const list = filter === "hidden" ? c.hiddenList : c.shown;
  tbody.innerHTML = list.length
    ? list.map((p) => rowHtml(p, filter === "hidden" || c.hiddenSet.has(p.id))).join("")
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:26px">Nothing in this filter yet.</td></tr>`;
}

function fillCatSelect() {
  const sel = document.getElementById("f-cat");
  sel.innerHTML = CATEGORIES.map(
    (c) => `<option value="${c.key}">${c.icon} ${c.name}</option>`
  ).join("");
}

function resetForm() {
  document.getElementById("product-form").reset();
  document.getElementById("f-id").value = "";
  document.getElementById("f-cat").value = "crochet";
  document.getElementById("f-icon").value = "📦";
  document.getElementById("f-rating").value = "4.8";
  document.getElementById("f-old").value = "";
  for (let i = 1; i <= 5; i++) document.getElementById("f-img-" + i).value = "";
  document.getElementById("f-video").value = "";
  document.getElementById("f-links").value = "";
  document.getElementById("f-pdf").value = "";
  document.getElementById("form-title").textContent = "➕ Add new product";
  document.getElementById("form-cancel").style.display = "none";
}

function collectForm() {
  const id = document.getElementById("f-id").value;
  const feats = document
    .getElementById("f-feats")
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const imgs = [];
  for (let i = 1; i <= 5; i++) {
    const v = document.getElementById("f-img-" + i).value.trim();
    if (v) imgs.push(v);
  }
  const video = document.getElementById("f-video").value.trim();
  const links = document
    .getElementById("f-links")
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf("|");
      return i > 0 ? { label: s.slice(0, i).trim(), url: s.slice(i + 1).trim() } : { label: "Access link", url: s };
    })
    .filter((l) => l.url);
  const pdf = document.getElementById("f-pdf").value.trim();
  const product = {
    id: id || "adm-" + Date.now().toString(36),
    category: document.getElementById("f-cat").value,
    title: document.getElementById("f-title").value.trim(),
    tagline: document.getElementById("f-tagline").value.trim(),
    price: parseFloat(document.getElementById("f-price").value) || 0,
    oldPrice: parseFloat(document.getElementById("f-old").value) || null,
    rating: Math.min(5, Math.max(1, parseFloat(document.getElementById("f-rating").value) || 4.8)),
    reviews: 0,
    badge: document.getElementById("f-badge").value.trim() || null,
    grad: document.getElementById("f-grad").value,
    icon: document.getElementById("f-icon").value.trim() || "📦",
    description:
      document.getElementById("f-desc").value.trim() ||
      "Handcrafted by DigitalForge.",
    features: feats.length ? feats : ["Instant download", "Lifetime updates"],
    format: document.getElementById("f-format").value.trim() || "Instant Download",
    imgs: imgs.slice(0, 5),
    video: video || null,
    links: links.length ? links : null,
    pdf: pdf || null,
  };
  return product;
}

function saveProduct(e) {
  e.preventDefault();
  const d = loadExtras();
  const p = collectForm();
  const isCustom = d.extras.some((x) => x.id === p.id);
  const isDefault = PRODUCTS.some((x) => x.id === p.id);

  if (p.id && isCustom) {
    const next = d.extras.map((x) => (x.id === p.id ? p : x));
    localStorage.setItem(EXTRA_KEY, JSON.stringify(next));
  } else if (isDefault) {
    const ov = d.overrides;
    ov[p.id] = p;
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(ov));
  } else {
    const next = [...d.extras, p];
    localStorage.setItem(EXTRA_KEY, JSON.stringify(next));
  }

  resetForm();
  renderAdmin(currentFilter());
  toast("Product saved ✅");
}

function editProduct(id) {
  const stored = catalog();
  let p = [...stored.shown, ...stored.hiddenList].find((x) => x.id === id);
  if (!p) return;
  document.getElementById("form-title").textContent = "✏️ Edit: " + p.title;
  document.getElementById("f-id").value = p.id;
  document.getElementById("f-title").value = p.title;
  document.getElementById("f-cat").value = p.category;
  document.getElementById("f-icon").value = p.icon || "";
  document.getElementById("f-price").value = p.price || 0;
  document.getElementById("f-old").value = p.oldPrice || "";
  document.getElementById("f-badge").value = p.badge || "";
  const gsel = document.getElementById("f-grad");
  if (![...gsel.options].some((o) => o.value === p.grad)) gsel.add(new Option(p.grad, p.grad));
  gsel.value = p.grad;
  document.getElementById("f-tagline").value = p.tagline || "";
  document.getElementById("f-desc").value = p.description || "";
  document.getElementById("f-feats").value = (p.features || []).join("\n");
  document.getElementById("f-format").value = p.format || "";
  document.getElementById("f-rating").value = p.rating || 4.8;
  const imgs = Array.isArray(p.imgs) ? p.imgs.slice(0, 5) : [];
  for (let i = 1; i <= 5; i++) document.getElementById("f-img-" + i).value = imgs[i - 1] || "";
  document.getElementById("f-video").value = p.video || "";
  document.getElementById("f-links").value = (Array.isArray(p.links) ? p.links : [])
    .map((l) => (l ? `${l.label || "Access link"}|${l.url}` : ""))
    .filter(Boolean)
    .join("\n");
  document.getElementById("f-pdf").value = p.pdf || "";
  document.getElementById("form-cancel").style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteProduct(id) {
  const d = loadExtras();
  if (d.extras.some((x) => x.id === id)) {
    const next = d.extras.filter((x) => x.id !== id);
    localStorage.setItem(EXTRA_KEY, JSON.stringify(next));
  } else {
    d.hidden.add(id);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...d.hidden]));
  }
  renderAdmin(currentFilter());
  toast("Product hidden from shop 🗑️");
}

function restoreProduct(id) {
  const d = loadExtras();
  d.hidden.delete(id);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...d.hidden]));
  renderAdmin(currentFilter());
  toast("Product is live again ✅");
}

let filterState = "all";
function currentFilter() {
  return filterState;
}

function gate() {
  const gateEl = document.getElementById("gate");
  const panel = document.getElementById("panel");
  const ok = sessGet() === "1";
  if (ok) {
    gateEl.style.display = "none";
    panel.style.display = "block";
    return true;
  }
  gateEl.style.display = "block";
  panel.style.display = "none";
  return false;
}

let sessCache = {};
const sessSet = (v) => {
  sessCache = { [SESS_KEY]: v };
  try {
    sessionStorage.setItem(SESS_KEY, v);
  } catch (e) {}
};
const sessGet = () => {
  try {
    return sessionStorage.getItem(SESS_KEY) ?? sessCache[SESS_KEY] ?? null;
  } catch (e) {
    return sessCache[SESS_KEY] ?? null;
  }
};
const sessDel = () => {
  try {
    sessionStorage.removeItem(SESS_KEY);
  } catch (e) {}
  delete sessCache[SESS_KEY];
};

const byId = (id) => {
  try {
    return document.getElementById(id);
  } catch (e) {
    return null;
  }
};
const safe = (fn) => {
  try {
    return fn();
  } catch (e) {
    if (window.console && console.error) console.error("admin:", e);
    return undefined;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  gate();

  byId("gate-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = byId("gate-pass").value;
    if (v === "admin123" || v === getPass()) {
      sessSet("1");
      toast("Welcome, Admin 🔥");
      gate();
      safe(() => renderAdmin());
    } else {
      const el = byId("gate-pass");
      el.focus();
      el.select();
      toast("Wrong password — try admin123", "⚠️");
    }
  });

  byId("reset-pass")?.addEventListener("click", () => {
    localStorage.removeItem(PASS_KEY);
    sessSet("1");
    toast("Password reset to admin123 — opening panel 🔁");
    gate();
    safe(() => renderAdmin());
  });

  safe(() => {
    byId("year").textContent = new Date().getFullYear();
  });
  safe(() => fillCatSelect());

  if (sessGet() === "1") {
    safe(() => renderAdmin());
  }

  safe(() => byId("product-form").addEventListener("submit", saveProduct));
  safe(() => byId("form-cancel").addEventListener("click", resetForm));
  safe(() =>
    byId("logout").addEventListener("click", () => {
      sessDel();
      gate();
    })
  );
  safe(() =>
    document.querySelectorAll(".chip[data-filter]").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip[data-filter]").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        filterState = chip.dataset.filter;
        renderAdmin(filterState);
      });
    })
  );
  safe(() =>
    byId("save-pass").addEventListener("click", () => {
      const np = byId("f-pass").value.trim();
      if (!np) return toast("Password cannot be empty", "⚠️");
      localStorage.setItem(PASS_KEY, np);
      byId("f-pass").value = "";
      toast("Password changed ✅");
    })
  );
});