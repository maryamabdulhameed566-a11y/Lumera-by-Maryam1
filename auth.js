// ============================================================
// AUTH — shared across all pages
// ============================================================
import {
  auth, db, ADMIN_EMAIL, ADMIN_USERNAME,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail, updateProfile,
  collection, addDoc, serverTimestamp,
} from "./firebase-config.js";

// Keep the header nav in sync with sign-in state on every page.
export function wireNav() {
  const guestSlots = document.querySelectorAll("[data-nav-guest]");
  const userSlots = document.querySelectorAll("[data-nav-user]");
  const adminSlots = document.querySelectorAll("[data-nav-admin]");
  const nameSlots = document.querySelectorAll("[data-user-name]");

  onAuthStateChanged(auth, (user) => {
    guestSlots.forEach(el => el.style.display = user ? "none" : "");
    userSlots.forEach(el => el.style.display = user ? "" : "none");
    adminSlots.forEach(el => el.style.display = (user && user.email === ADMIN_EMAIL) ? "" : "none");
    nameSlots.forEach(el => el.textContent = user ? (user.displayName || user.email.split("@")[0]) : "");
  });

  document.querySelectorAll("[data-logout]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await signOut(auth);
      window.location.href = "index.html";
    });
  });
}

export function showError(el, message) {
  el.textContent = message;
  el.classList.add("show");
}
export function hideError(el) {
  el.classList.remove("show");
}

// Friendlier copy for Firebase's auth error codes.
export function friendlyAuthError(err) {
  const code = err?.code || "";
  const map = {
    "auth/email-already-in-use": "That email already has an account — try logging in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Please use at least 6 characters for your password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "We couldn't find an account with that email.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ---------- Register page ----------
export function initRegisterForm(form) {
  const errorBox = form.querySelector("[data-form-error]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(errorBox);
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector("[type=submit]");
    submitBtn.disabled = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid, name, email, createdAt: serverTimestamp(),
      });
      window.location.href = "index.html";
    } catch (err) {
      showError(errorBox, friendlyAuthError(err));
      submitBtn.disabled = false;
    }
  });
}

// ---------- Login page ----------
export function initLoginForm(form) {
  const errorBox = form.querySelector("[data-form-error]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(errorBox);
    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector("[type=submit]");
    submitBtn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "index.html";
    } catch (err) {
      showError(errorBox, friendlyAuthError(err));
      submitBtn.disabled = false;
    }
  });

  const resetLink = document.querySelector("[data-reset-password]");
  if (resetLink) {
    resetLink.addEventListener("click", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!email) { showError(errorBox, "Enter your email above first, then tap reset."); return; }
      try {
        await sendPasswordResetEmail(auth, email);
        const successBox = form.querySelector("[data-form-success]");
        successBox.textContent = "Password reset email sent — check your inbox.";
        successBox.classList.add("show");
      } catch (err) {
        showError(errorBox, friendlyAuthError(err));
      }
    });
  }
}

// ---------- Admin login page (admin-login.html) ----------
// Separate from the customer login: takes a username instead of an email,
// but signs in to the same one admin account behind the scenes. Wrong
// username and wrong password get the exact same generic error, so nobody
// probing the form can tell which part they got wrong.
export function initAdminLoginForm(form) {
  const errorBox = form.querySelector("[data-form-error]");
  const successBox = form.querySelector("[data-form-success]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(errorBox);
    const username = form.username.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector("[type=submit]");
    submitBtn.disabled = true;

    if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
      showError(errorBox, "Incorrect username or password.");
      submitBtn.disabled = false;
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      window.location.href = "admin.html";
    } catch {
      showError(errorBox, "Incorrect username or password.");
      submitBtn.disabled = false;
    }
  });

  const resetLink = document.querySelector("[data-reset-password]");
  if (resetLink) {
    resetLink.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await sendPasswordResetEmail(auth, ADMIN_EMAIL);
        successBox.textContent = "Password reset email sent to your admin inbox.";
        successBox.classList.add("show");
      } catch {
        showError(errorBox, "Couldn't send a reset email right now — try again shortly.");
      }
    });
  }
}

// ---------- Admin gate: call on admin.html ----------
export function requireAdmin(onReady) {
  onAuthStateChanged(auth, (user) => {
    const gate = document.getElementById("admin-gate");
    const panel = document.getElementById("admin-content");
    if (!user) {
      gate.innerHTML = adminGateMarkup(
        "Sign in to continue",
        "Log in with your admin account to manage products.",
        `<a class="btn btn-gold" href="admin-login.html">Admin log in</a>`
      );
      gate.style.display = "flex";
      panel.style.display = "none";
      return;
    }
    if (user.email !== ADMIN_EMAIL) {
      gate.innerHTML = adminGateMarkup(
        "This area is admin-only",
        `You're signed in as ${user.email}, which isn't the admin account for this store.`,
        `<a class="btn btn-outline" href="index.html">Back to shop</a> <a class="btn btn-gold" href="admin-login.html">Admin log in</a>`
      );
      gate.style.display = "flex";
      panel.style.display = "none";
      return;
    }
    gate.style.display = "none";
    panel.style.display = "";
    onReady(user);
  });
}

function adminGateMarkup(title, body, actionHtml) {
  return `
    <div class="auth-card">
      <div class="auth-head">
        <img src="assets/logo.png" alt="Luméra by Maryam logo" />
        <h1>${title}</h1>
        <p>${body}</p>
      </div>
      ${actionHtml}
    </div>`;
}
