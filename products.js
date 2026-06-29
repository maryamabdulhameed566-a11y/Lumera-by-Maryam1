// ============================================================
// PRODUCTS — Firestore data layer + rendering helpers
// ============================================================
import {
  db, storage,
  collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp,
  storageRef, uploadBytes, getDownloadURL,
} from "./firebase-config.js";

const PRODUCTS_COL = "products";

export function listenProducts(callback) {
  const q = query(collection(db, PRODUCTS_COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    callback(items);
  }, (err) => {
    console.error("Failed to load products:", err);
    callback([], err);
  });
}

export async function addProduct(data) {
  return addDoc(collection(db, PRODUCTS_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateProduct(id, data) {
  return updateDoc(doc(db, PRODUCTS_COL, id), data);
}

export async function deleteProductById(id) {
  return deleteDoc(doc(db, PRODUCTS_COL, id));
}

// Uploads a File to Firebase Storage and returns its public URL.
export async function uploadProductImage(file, productSlug) {
  const path = `product-images/${productSlug}-${Date.now()}-${file.name}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}

export function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product";
}

function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Renders the storefront grid. `products` is the full list; `activeCategory`
// filters client-side so the chip row feels instant.
export function renderProductGrid(container, products, activeCategory = "All") {
  const filtered = activeCategory === "All" ? products : products.filter(p => p.category === activeCategory);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="label-caps">Nothing here yet</p>
        <p style="margin-top:8px;">New picks are on the way — check back soon, or browse another category.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <article class="product-card">
      <div class="product-media">
        <img src="${escapeHtml(p.imageUrl || 'assets/logo.png')}" alt="${escapeHtml(p.altText || p.name || 'Product photo')}" loading="lazy" />
        ${p.category ? `<span class="cat-tag">${escapeHtml(p.category)}</span>` : ""}
      </div>
      <div class="product-body">
        <h3>${escapeHtml(p.name || "Untitled product")}</h3>
        <p class="desc">${escapeHtml(p.description || "")}</p>
        <div class="product-foot">
          <div class="price">
            ${p.price ? `$${escapeHtml(String(p.price))}` : "—"}
            <small>Price set on Amazon</small>
          </div>
          <a class="btn btn-gold btn-sm" href="${escapeHtml(p.affiliateLink || '#')}" target="_blank" rel="noopener sponsored">
            Shop on Amazon
          </a>
        </div>
      </div>
    </article>
  `).join("");
}
