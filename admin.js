// ============================================================
// ADMIN PANEL
// ============================================================
import { requireAdmin } from "./auth.js";
import { CHAT_FUNCTION_URL } from "./firebase-config.js";
import {
  listenProducts, addProduct, updateProduct, deleteProductById,
  uploadProductImage, slugify,
} from "./products.js";

// Your 3 brand pillars come first, then general categories for anything else
// you decide to link — add more strings here any time, just keep them in
// CATEGORY_KEYWORDS too if you want auto-detection for them.
const CATEGORIES = ["Beauty", "Skincare", "Self-Care", "Electronics", "Home", "Fashion", "Other"];

// Quick local guess so the category updates instantly while typing —
// the "✨ Generate with AI" button does a smarter pass afterward.
// "Other" has no keywords — it's a manual fallback for anything that doesn't fit.
const CATEGORY_KEYWORDS = {
  Skincare: ["cerave", "cetaphil", "neutrogena", "vitamin c", "serum", "moisturizer", "moisturiser",
    "cleanser", "toner", "spf", "sunscreen", "retinol", "niacinamide", "hyaluronic", "exfoliat",
    "eye cream", "face wash", "acne", "salicylic", "peptide", "la roche", "the ordinary", "cosrx"],
  "Self-Care": ["candle", "bath soak", "robe", "sleep mask", "journal", "diffuser", "weighted blanket",
    "massage", "gua sha", "bonnet", "herbal tea", "aromatherapy", "heating pad", "yoga mat"],
  Beauty: ["lipstick", "mascara", "blush", "foundation", "highlighter", "eyeliner", "eyeshadow",
    "concealer", "brow", "lip gloss", "nail polish", "perfume", "brush set", "bronzer", "primer"],
  Electronics: ["phone", "iphone", "samsung", "laptop", "charger", "usb", "earbuds", "headphones",
    "airpods", "tablet", "ipad", "smartwatch", "camera", "speaker", "bluetooth", "keyboard", "mouse",
    "monitor", "power bank", "router", "webcam", "tv", "gaming"],
  Home: ["cookware", "blender", "air fryer", "vacuum", "bedding", "bed sheets", "furniture", "decor",
    "kitchen", "storage bin", "organizer", "toaster", "rug", "curtain", "pillow", "cutlery", "mattress"],
  Fashion: ["dress", "jeans", "jacket", "handbag", "purse", "jewelry", "necklace", "earrings",
    "sunglasses", "scarf", "sneakers", "boots", "sweater", "belt", "wallet", "heels", "hoodie"],
};
function guessCategory(name) {
  const t = name.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => t.includes(w))) return cat;
  }
  return null;
}

requireAdmin(() => {
  const form = document.getElementById("product-form");
  const tableBody = document.getElementById("product-rows");
  const formTitle = document.getElementById("form-title");
  const cancelEditBtn = document.getElementById("cancel-edit");
  const imageInput = form.image;
  const imagePreview = document.getElementById("image-preview");
  let editingId = null;
  let pendingFile = null;
  let allProducts = [];

  // populate category select
  form.category.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");

  // Auto-pick a category from the product name as the admin types, unless
  // they've already changed the dropdown themselves for this product.
  let categoryTouched = false;
  form.category.addEventListener("change", () => { categoryTouched = true; });
  form.name.addEventListener("input", () => {
    if (categoryTouched) return;
    const guess = guessCategory(form.name.value);
    if (guess) form.category.value = guess;
  });

  imageInput.addEventListener("change", () => {
    pendingFile = imageInput.files[0] || null;
    if (pendingFile) {
      imagePreview.src = URL.createObjectURL(pendingFile);
      imagePreview.style.display = "block";
    }
  });

  listenProducts((products, err) => {
    allProducts = products;
    if (err) {
      tableBody.innerHTML = `<tr><td colspan="5">Couldn't load products. Check your Firestore rules / connection.</td></tr>`;
      return;
    }
    renderTable(products);
  });

  function renderTable(products) {
    if (products.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5">No products yet — add your first one on the left.</td></tr>`;
      return;
    }
    tableBody.innerHTML = products.map(p => `
      <tr>
        <td><img src="${p.imageUrl || 'assets/logo.png'}" alt="" /></td>
        <td>${p.name || ""}</td>
        <td>${p.category || ""}</td>
        <td>${p.price ? "$" + p.price : "—"}</td>
        <td class="row-actions">
          <button class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-delete="${p.id}">Delete</button>
        </td>
      </tr>
    `).join("");

    tableBody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => startEdit(btn.dataset.edit));
    });
    tableBody.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Delete this product? This can't be undone.")) {
          deleteProductById(btn.dataset.delete);
        }
      });
    });
  }

  function startEdit(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    form.name.value = p.name || "";
    form.category.value = p.category || CATEGORIES[0];
    categoryTouched = true; // don't override a category that was already chosen/saved
    form.price.value = p.price || "";
    form.affiliateLink.value = p.affiliateLink || "";
    form.altText.value = p.altText || "";
    form.description.value = p.description || "";
    if (p.imageUrl) { imagePreview.src = p.imageUrl; imagePreview.style.display = "block"; }
    pendingFile = null;
    formTitle.textContent = "Edit product";
    cancelEditBtn.style.display = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelEditBtn.addEventListener("click", () => resetForm());

  function resetForm() {
    form.reset();
    editingId = null;
    pendingFile = null;
    categoryTouched = false;
    imagePreview.style.display = "none";
    formTitle.textContent = "Add a product";
    cancelEditBtn.style.display = "none";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
    try {
      const data = {
        name: form.name.value.trim(),
        category: form.category.value,
        price: form.price.value.trim(),
        affiliateLink: form.affiliateLink.value.trim(),
        altText: form.altText.value.trim(),
        description: form.description.value.trim(),
      };
      if (pendingFile) {
        data.imageUrl = await uploadProductImage(pendingFile, slugify(data.name));
      }
      if (editingId) {
        await updateProduct(editingId, data);
      } else {
        await addProduct(data);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Couldn't save the product. Check the console for details.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save product";
    }
  });

  // ----- AI-assisted copy: description + alt text -----
  document.getElementById("ai-generate").addEventListener("click", async () => {
    const name = form.name.value.trim();
    const category = form.category.value;
    if (!name) { alert("Enter a product name first."); return; }
    const btn = document.getElementById("ai-generate");
    btn.disabled = true;
    btn.textContent = "Writing…";
    try {
      if (CHAT_FUNCTION_URL.startsWith("PASTE_")) throw new Error("not-configured");
      const res = await fetch(CHAT_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "product_copy", name, category }),
      });
      if (!res.ok) throw new Error("bad-response");
      const data = await res.json();
      if (data.category && CATEGORIES.includes(data.category)) {
        form.category.value = data.category;
        categoryTouched = true;
      }
      if (data.description) form.description.value = data.description;
      if (data.altText) form.altText.value = data.altText;
    } catch (err) {
      if (err.message === "not-configured") {
        alert("Connect the Cloud Function first (README step 4) to use AI copywriting.");
      } else {
        alert("Couldn't generate copy right now — try again in a moment.");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "✨ Generate with AI";
    }
  });
});
