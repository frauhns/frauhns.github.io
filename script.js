document.addEventListener("DOMContentLoaded", () => {

  // State
  let activeWinId = null;
  let topZ = 10;
  const zHistory = [];
  const openedOnce = new Set();

  // Helpers
  function getIds()           { return [...document.querySelectorAll("[id^='win-']")].map(el => el.id.replace("win-", "")); }
  function win(id)            { return document.getElementById(`win-${id}`); }
  function task(id)           { return document.getElementById(`task-${id}`); }
  function shortcut(id)       { return document.getElementById(`shortcut-${id}`); }
  const touchOnlyMQ           = window.matchMedia("(hover: none)");
  function isTouchOnly()      { return touchOnlyMQ.matches; }
  function isMobileBehavior() { return window.innerWidth <= 768 && isTouchOnly(); }
  function isTouchDevice()    { return isTouchOnly(); }
  function hasMaxBtn(id)      { return !!win(id)?.querySelector(".max"); }

  // Mobile sizing
  function setMobileMode(w, on) {
    if (on) {
      w.style.width = w.style.height = w.style.left = w.style.top = "";
      w.classList.add("win-mobile");
      w.dataset.maximized = "true";
    } else {
      w.classList.remove("win-mobile");
      w.dataset.maximized = "false";
    }
  }

  // Focus
  function bringToFront(winEl) { winEl.style.zIndex = ++topZ; }

  function focusWindow(id) {
    getIds().forEach(i => {
      win(i) ?.classList.toggle("active", i === id);
      task(i)?.classList.toggle("active", i === id);
    });
    activeWinId = id;
    const idx = zHistory.indexOf(id);
    if (idx !== -1) zHistory.splice(idx, 1);
    zHistory.push(id);
  }

  function focusFallback(removedId) {
    const idx = zHistory.indexOf(removedId);
    if (idx !== -1) zHistory.splice(idx, 1);
    for (let i = zHistory.length - 1; i >= 0; i--) {
      const id = zHistory[i];
      const w = win(id);
      if (w && w.style.display !== "none") { focusWindow(id); return; }
    }
    getIds().forEach(i => {
      win(i) ?.classList.remove("active");
      task(i)?.classList.remove("active");
    });
    activeWinId = null;
  }

  // Window actions
  function openWindow(id, requeue = false) {
    const w = win(id);
    const t = task(id);
    if (!w) return;

    if (isMobileBehavior()) {
      setMobileMode(w, true);
    } else if (isTouchDevice() && id !== "about") {
      setMobileMode(w, false);
      centerIfFirstOpen(id);
      if (w.dataset.maximized !== "true") {
        w.style.display = "flex";
        const rect = w.getBoundingClientRect();
        w.dataset.restoreLeft   = w.style.left   || rect.left   + "px";
        w.dataset.restoreTop    = w.style.top    || rect.top    + "px";
        w.dataset.restoreWidth  = w.style.width  || rect.width  + "px";
        w.dataset.restoreHeight = w.style.height || rect.height + "px";
        w.style.left   = "0px";
        w.style.top    = "0px";
        w.style.width  = window.innerWidth + "px";
        w.style.height = (window.innerHeight - 40) + "px";
        w.dataset.maximized = "true";
      }
    } else {
      setMobileMode(w, false);
      centerIfFirstOpen(id);
    }

    w.style.display = "flex";
    if (t) {
      t.style.display = "flex";
      if (requeue) {
        const tasklist = document.querySelector(".tasklist");
        if (tasklist && t.parentElement === tasklist) tasklist.appendChild(t);
      }
    }
    bringToFront(w);
    focusWindow(id);
  }

  function closeWindow(id) {
    const w = win(id);
    const t = task(id);
    if (w) {
      if (w.dataset.maximized === "true" && !w.classList.contains("win-mobile")) {
        w.style.width  = w.dataset.restoreWidth  || "";
        w.style.height = w.dataset.restoreHeight || "";
        w.style.left   = w.dataset.restoreLeft   || "";
        w.style.top    = w.dataset.restoreTop    || "";
        w.dataset.maximized = "false";
      }
      w.style.display = "none";
    }
    if (t) { t.style.display = "none"; t.classList.remove("active"); }
    focusFallback(id);
  }

  function minimizeWindow(id) {
    const w = win(id);
    if (w) w.style.display = "none";
    task(id)?.classList.remove("active");
    focusFallback(id);
  }

  function maximizeWindow(id) {
    if (!hasMaxBtn(id)) return;
    const w = win(id);
    if (!w) return;
    if (w.dataset.maximized === "true") {
      w.style.left   = w.dataset.restoreLeft   || "";
      w.style.top    = w.dataset.restoreTop    || "";
      w.style.width  = w.dataset.restoreWidth  || "";
      w.style.height = w.dataset.restoreHeight || "";
      w.dataset.maximized = "false";
    } else {
      const rect = w.getBoundingClientRect();
      w.dataset.restoreLeft   = w.style.left   || rect.left   + "px";
      w.dataset.restoreTop    = w.style.top    || rect.top    + "px";
      w.dataset.restoreWidth  = w.style.width  || rect.width  + "px";
      w.dataset.restoreHeight = w.style.height || rect.height + "px";
      w.style.left   = "0px";
      w.style.top    = "0px";
      w.style.width  = window.innerWidth + "px";
      w.style.height = (window.innerHeight - 40) + "px";
      w.dataset.maximized = "true";
    }
    bringToFront(w);
    focusWindow(id);
  }

  // Centering
  function centerIfFirstOpen(id) {
    if (openedOnce.has(id)) return;
    openedOnce.add(id);
    centerWindow(id);
  }

  function centerWindow(id) {
    const w = win(id);
    if (!w) return;
    const prevDisplay = w.style.display;
    w.style.display  = "flex";
    w.style.position = "fixed";
    w.style.left = w.style.top = "-9999px";
    const vw = window.innerWidth, vh = window.innerHeight - 40;
    const ww = w.offsetWidth,    wh = w.offsetHeight;
    w.style.display  = prevDisplay;
    w.style.position = "";
    w.style.left = Math.max(0, (vw - ww) / 2) + "px";
    w.style.top  = Math.max(0, (vh - wh) / 2) + "px";
  }

  // Init
  getIds().forEach(id => {
    const w = win(id);
    const t = task(id);
    if (w) w.style.display = "none";
    if (t) t.style.display = "none";
  });

  openWindow("about", true);

  // Mobile UI tweaks
  function applyMobileUI() {
    getIds().forEach(id => {
      const maxBtn = win(id)?.querySelector(".max");
      if (maxBtn) maxBtn.style.display = isTouchDevice() ? "none" : "";
    });
  }
  applyMobileUI();

  function handleResize() {
    applyMobileUI();
    getIds().forEach(id => {
      const w = win(id);
      if (!w || w.style.display === "none") return;

      w.classList.remove("win-mobile");
      w.style.width = w.style.height = w.style.left = w.style.top = "";
      w.dataset.maximized = "false";

      if (isMobileBehavior()) {
        setMobileMode(w, true);
      } else if (isTouchDevice() && id !== "about") {
        w.style.left   = "0px";
        w.style.top    = "0px";
        w.style.width  = window.innerWidth + "px";
        w.style.height = (window.innerHeight - 40) + "px";
        w.dataset.maximized = "true";
      } else {
        openedOnce.delete(id);
        centerWindow(id);
        openedOnce.add(id);
      }
    });
  }

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", () => setTimeout(handleResize, 100));

  // Window chrome
  getIds().forEach(id => {
    const w   = win(id);
    const bar = w?.querySelector(".winbar");
    if (!w || !bar) return;

    w.querySelector(".close")?.addEventListener("click", e => { e.stopPropagation(); closeWindow(id); });
    w.querySelector(".min")  ?.addEventListener("click", e => { e.stopPropagation(); minimizeWindow(id); });
    w.querySelector(".max")  ?.addEventListener("click", e => { e.stopPropagation(); maximizeWindow(id); });

    w.addEventListener("mousedown", () => { bringToFront(w); focusWindow(id); });

    bar.addEventListener("dblclick", e => {
      if (e.target.closest(".winbtn") || isTouchDevice() || !hasMaxBtn(id)) return;
      maximizeWindow(id);
    });

    let lastTap = 0;
    bar.addEventListener("touchend", e => {
      if (e.target.closest(".winbtn") || isTouchDevice() || !hasMaxBtn(id)) return;
      const now = Date.now();
      if (now - lastTap < 300) { maximizeWindow(id); lastTap = 0; }
      else lastTap = now;
    });
  });

  // Taskbar
  getIds().forEach(id => {
    const t = task(id);
    if (!t) return;
    t.addEventListener("click", () => {
      const w = win(id);
      const isVisible = w && w.style.display !== "none";
      const isFocused = activeWinId === id;
      if (isVisible && isFocused) {
        minimizeWindow(id);
      } else {
        const wasHidden = t.style.display === "none";
        openWindow(id, wasHidden);
      }
    });
  });

  // Desktop shortcuts
  getIds().forEach(id => {
    const s = shortcut(id);
    if (!s) return;

    s.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelectorAll(".shortcut").forEach(el => el.classList.remove("active"));
      s.classList.add("active");
      if (isTouchDevice()) openWindow(id, true);
    });

    s.addEventListener("dblclick", e => {
      if (isTouchDevice()) return;
      e.stopPropagation();
      document.querySelectorAll(".shortcut").forEach(el => el.classList.remove("active"));
      s.classList.add("active");
      openWindow(id, true);
    });

    s.addEventListener("touchend", e => {
      e.preventDefault();
      document.querySelectorAll(".shortcut").forEach(el => el.classList.remove("active"));
      s.classList.add("active");
      openWindow(id, true);
    });
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".shortcut"))
      document.querySelectorAll(".shortcut").forEach(el => el.classList.remove("active"));
  });

  // Draggable windows
  getIds().forEach(id => {
    const w   = win(id);
    const bar = w?.querySelector(".winbar");
    if (!w || !bar) return;

    let dragging = false, ox = 0, oy = 0, pendingRestore = false;

    function startDrag(clientX, clientY) {
      if (w.dataset.maximized === "true") {
        if (!hasMaxBtn(id)) return;
        pendingRestore = true;
        ox = clientX; oy = clientY;
        return;
      }
      dragging = true;
      const rect = w.getBoundingClientRect();
      ox = clientX - rect.left;
      oy = clientY - rect.top;
      bar.style.cursor = "grabbing";
      bringToFront(w);
      focusWindow(id);
    }

    function moveDrag(clientX, clientY) {
      if (pendingRestore) {
        pendingRestore = false;
        maximizeWindow(id);
        dragging = true;
        ox = w.offsetWidth / 2;
        oy = bar.offsetHeight / 2;
        bar.style.cursor = "grabbing";
        bringToFront(w);
        focusWindow(id);
      }
      if (!dragging) return;
      const vw = window.innerWidth, vh = window.innerHeight - 40;
      const ww = w.offsetWidth,    wh = w.offsetHeight;
      w.style.left = Math.max(0, Math.min(clientX - ox, vw - ww)) + "px";
      w.style.top  = Math.max(0, Math.min(clientY - oy, vh - wh)) + "px";
    }

    function endDrag() {
      pendingRestore = false;
      if (dragging) { dragging = false; bar.style.cursor = "grab"; }
    }

    bar.addEventListener("mousedown", e => {
      if (e.target.closest(".winbtn") || isTouchDevice()) return;
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });

    bar.addEventListener("touchstart", e => {
      if (e.target.closest(".winbtn") || isTouchDevice()) return;
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener("mousemove", e => moveDrag(e.clientX, e.clientY));

    document.addEventListener("touchmove", e => {
      if (!dragging && !pendingRestore) return;
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);
  });

  // Start menu
  const startBtn  = document.querySelector(".start");
  const startMenu = document.querySelector(".startmenu");

  startBtn?.addEventListener("click", e => {
    e.stopPropagation();
    startMenu?.classList.toggle("active");
    startBtn.classList.toggle("active");
  });

  document.addEventListener("click", () => {
    startMenu?.classList.remove("active");
    startBtn?.classList.remove("active");
  });

  startMenu?.addEventListener("click", e => e.stopPropagation());

  // Socials
  const socialLinks = {
    "Instagram": "https://instagram.com/frauhns",
    "Twitter":   "https://twitter.com/frauhns",
    "Facebook":  "https://facebook.com/frauhns",
    "Github":    "https://github.com/frauhns",
  };

  document.querySelectorAll(".social").forEach(el => {
    const label = el.querySelector("p")?.textContent.trim();
    const url   = socialLinks[label];
    if (url) el.addEventListener("click", () => window.open(url, "_blank"));
  });

  // Clock
  const clockEl = document.querySelector(".clock");
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    clockEl.querySelector("p").textContent = `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 10000);

  // Contact form
  const contactTool = document.querySelector(".contacttool");
  const clearBtn    = contactTool?.querySelector(".btn img[src*='clear']")?.closest(".btn") || null;
  const sendBtn     = contactTool?.querySelector(".btn img[src*='send']")?.closest(".btn")  || null;
  const statusImg   = document.querySelector(".inpstatus img");
  const fields      = ["contact-subject", "contact-from", "contact-message"];

  let statusTimer = null;

  function setStatus(state, autoReset = false) {
    if (!statusImg) return;
    statusImg.src = `res/${state}.png`;
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
    if (autoReset) {
      statusTimer = setTimeout(() => {
        statusImg.src = "res/write.png";
        statusTimer = null;
      }, 1500);
    }
  }

  setStatus("write");

  function validateForm() {
    const subject = document.getElementById("contact-subject")?.value.trim();
    const from    = document.getElementById("contact-from")?.value.trim();
    const message = document.getElementById("contact-message")?.value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from);
    const filled  = subject !== "" && emailOk && message !== "";
    if (sendBtn) sendBtn.classList.toggle("disabled", !filled);
  }

  fields.forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => {
      if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
      setStatus("write");
      validateForm();
    });
  });

  validateForm();

  clearBtn?.addEventListener("click", () => {
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    setStatus("write");
    validateForm();
  });

  sendBtn?.addEventListener("click", async () => {
    if (sendBtn.classList.contains("disabled")) return;
    const key     = document.getElementById("contact-key")?.value;
    const subject = document.getElementById("contact-subject")?.value.trim();
    const from    = document.getElementById("contact-from")?.value.trim();
    const message = document.getElementById("contact-message")?.value.trim();

    setStatus("wait");
    try {
      const res  = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_key: key, subject, email: from, message })
      });
      const data = await res.json();
      if (data.success) {
        fields.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        validateForm();
        setStatus("valid", true);
      } else {
        setStatus("invalid", true);
      }
    } catch {
      setStatus("invalid", true);
    }
  });

});