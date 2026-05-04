document.addEventListener("DOMContentLoaded", () => {

  const ALL_IDS = ["about", "projects", "contact"];

  const win       = id => document.getElementById(`win-${id}`);
  const task      = id => document.getElementById(`task-${id}`);
  const shortcut  = id => document.getElementById(`shortcut-${id}`);
  const touchMQ   = window.matchMedia("(hover: none)");
  const isTouchOnly     = () => touchMQ.matches;
  const isMobileBehavior = () => window.innerWidth <= 768 && isTouchOnly();
  const hasMaxBtn = id  => !!win(id)?.querySelector(".max");
  const isVisible = id  => { const w = win(id); return !!(w && w.style.display !== "none"); };

  let activeWinId = null;
  const zOrder = [];

  function syncZIndices() {
    zOrder.forEach((id, i) => {
      const w = win(id);
      if (w) w.style.zIndex = 10 + i;
    });
  }

  function bringToFront(id) {
    const idx = zOrder.indexOf(id);
    if (idx !== -1) zOrder.splice(idx, 1);
    zOrder.push(id);
    syncZIndices();
  }

  function focusWindow(id) {
    ALL_IDS.forEach(i => {
      win(i)?.classList.toggle("active", i === id);
      const t = task(i);
      if (t && t.style.display !== "none") t.classList.toggle("active", i === id);
    });
    activeWinId = id;
  }

  function focusFallback(removedId) {
    const idx = zOrder.indexOf(removedId);
    if (idx !== -1) zOrder.splice(idx, 1);
    syncZIndices();
    for (let i = zOrder.length - 1; i >= 0; i--) {
      if (isVisible(zOrder[i])) { focusWindow(zOrder[i]); return; }
    }
    ALL_IDS.forEach(i => {
      win(i)?.classList.remove("active");
      task(i)?.classList.remove("active");
    });
    activeWinId = null;
  }

  function saveGeometry(w) {
    if (!w) return;
    const rect = w.getBoundingClientRect();
    w.dataset.restoreLeft   = w.style.left   || (rect.left   + "px");
    w.dataset.restoreTop    = w.style.top    || (rect.top    + "px");
    w.dataset.restoreWidth  = w.style.width  || (rect.width  + "px");
    w.dataset.restoreHeight = w.style.height || (rect.height + "px");
  }

  function applyGeometry(w, left, top, width, height) {
    if (!w) return;
    w.style.left   = left;
    w.style.top    = top;
    w.style.width  = width;
    w.style.height = height;
  }

  function restoreGeometry(w) {
    if (!w) return;
    applyGeometry(w,
      w.dataset.restoreLeft   || "",
      w.dataset.restoreTop    || "",
      w.dataset.restoreWidth  || "",
      w.dataset.restoreHeight || ""
    );
  }

  function fullscreenGeometry(w) {
    if (!w) return;
    applyGeometry(w, "0px", "0px", window.innerWidth + "px", (window.innerHeight - 40) + "px");
  }

  function clampToViewport(w) {
    if (!w) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight - 40;
    const left = parseFloat(w.style.left) || 0;
    const top  = parseFloat(w.style.top)  || 0;
    const cLeft = Math.max(0, Math.min(left, vw - w.offsetWidth));
    const cTop  = Math.max(0, Math.min(top,  vh - w.offsetHeight));
    if (cLeft !== left) w.style.left = cLeft + "px";
    if (cTop  !== top)  w.style.top  = cTop  + "px";
  }

  function centerWindow(id) {
    const w = win(id);
    if (!w) return;
    const prev = w.style.display;
    w.style.display = "flex";
    w.style.left = "-9999px";
    w.style.top  = "-9999px";
    const ww = w.offsetWidth;
    const wh = w.offsetHeight;
    w.style.display = prev;
    w.style.left = Math.max(0, (window.innerWidth  - ww) / 2) + "px";
    w.style.top  = Math.max(0, (window.innerHeight - 40 - wh) / 2) + "px";
  }

  const centeredOnce = new Set();

  function centerIfFirstOpen(id) {
    if (centeredOnce.has(id)) return;
    centeredOnce.add(id);
    centerWindow(id);
  }

  function openWindow(id) {
    const w = win(id);
    const t = task(id);
    if (!w) return;

    if (isMobileBehavior()) {
      w.classList.add("win-mobile");
      applyGeometry(w, "", "", "", "");
      w.dataset.maximized = "true";
    } else if (isTouchOnly()) {
      w.classList.remove("win-mobile");
      if (w.dataset.maximized !== "true") {
        if (w.style.left || w.style.width) saveGeometry(w);
        fullscreenGeometry(w);
        w.dataset.maximized = "true";
      }
    } else {
      w.classList.remove("win-mobile");
      if (w.dataset.maximized !== "true") centerIfFirstOpen(id);
    }

    w.style.display = "flex";
    requestAnimationFrame(() => {
      w.classList.add("show");
    });
    
  if (t) {
    const wasHidden = t.style.display === "none";
    t.style.display = "flex";
    if (wasHidden) {
      const list = document.querySelector(".tasklist");
      if (list && t.parentElement === list) list.appendChild(t);
    }
  }

    bringToFront(id);
    focusWindow(id);
  }

  function closeWindow(id) {
    const w = win(id);
    const t = task(id);

    if (w) {
      w.classList.remove("show");
      w.classList.add("closing");

      setTimeout(() => {
        w.style.display = "none";
        w.classList.remove("closing");

        if (w.dataset.maximized === "true" && !w.classList.contains("win-mobile")) {
          restoreGeometry(w);
        }
        w.dataset.maximized = "false";
        w.classList.remove("win-mobile");
      }, 120);
    }

    if (t) { t.style.display = "none"; t.classList.remove("active"); }

    centeredOnce.delete(id);
    focusFallback(id);
  }

  function minimizeWindow(id) {
    const w = win(id);
    if (w) {
      w.classList.remove("show");
      w.classList.add("closing");

      setTimeout(() => {
        w.style.display = "none";
        w.classList.remove("closing");
      }, 120);
    }

    task(id)?.classList.remove("active");
    focusFallback(id);
  }

  function maximizeWindow(id) {
    if (!hasMaxBtn(id)) return;
    const w = win(id);
    if (!w) return;
    if (w.dataset.maximized === "true") {
      restoreGeometry(w);
      w.dataset.maximized = "false";
    } else {
      saveGeometry(w);
      fullscreenGeometry(w);
      w.dataset.maximized = "true";
    }
    bringToFront(id);
    focusWindow(id);
  }

  function applyMobileUI() {
    ALL_IDS.forEach(id => {
      const maxBtn = win(id)?.querySelector(".max");
      if (maxBtn) maxBtn.style.display = isTouchOnly() ? "none" : "";
    });
  }

  ALL_IDS.forEach(id => {
    const w = win(id);
    const t = task(id);
    if (w) { w.style.display = "none"; w.dataset.maximized = "false"; }
    if (t) t.style.display = "none";
    if (!zOrder.includes(id)) zOrder.push(id);
  });

  applyMobileUI();
  openWindow("about");

  ALL_IDS.forEach(id => {
    const w   = win(id);
    const bar = w?.querySelector(".winbar");
    if (!w || !bar) return;

    w.querySelector(".close")?.addEventListener("click", e => { e.stopPropagation(); closeWindow(id); });
    w.querySelector(".min")  ?.addEventListener("click", e => { e.stopPropagation(); minimizeWindow(id); });
    w.querySelector(".max")  ?.addEventListener("click", e => { e.stopPropagation(); maximizeWindow(id); });

    w.addEventListener("mousedown", e => {
      if (!e.target.closest(".winbtns")) { bringToFront(id); focusWindow(id); }
    });

    bar.addEventListener("dblclick", e => {
      if (e.target.closest(".winbtns") || isTouchOnly() || !hasMaxBtn(id)) return;
      maximizeWindow(id);
    });

    let lastTap = 0;
    bar.addEventListener("touchend", e => {
      if (e.target.closest(".winbtns") || !hasMaxBtn(id)) return;
      const now = Date.now();
      if (now - lastTap < 300) { maximizeWindow(id); lastTap = 0; }
      else lastTap = now;
    });
  });

  ALL_IDS.forEach(id => {
    task(id)?.addEventListener("click", () => {
      if (isVisible(id) && activeWinId === id) minimizeWindow(id);
      else openWindow(id);
    });
  });

  ALL_IDS.forEach(id => {
    const s = shortcut(id);
    if (!s) return;

    const activate = () => {
      document.querySelectorAll(".shortcut").forEach(el => el.classList.remove("active"));
      s.classList.add("active");
    };

    s.addEventListener("click", e => {
      e.stopPropagation();
      activate();
      if (isTouchOnly()) openWindow(id);
    });

    s.addEventListener("dblclick", e => {
      if (isTouchOnly()) return;
      e.stopPropagation();
      activate();
      openWindow(id);
    });

    s.addEventListener("touchend", e => {
      e.preventDefault();
      activate();
      openWindow(id);
    });
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".shortcut"))
      document.querySelectorAll(".shortcut").forEach(el => el.classList.remove("active"));
  });

  ALL_IDS.forEach(id => {
    const w   = win(id);
    const bar = w?.querySelector(".winbar");
    if (!w || !bar) return;

    let dragging = false;
    let ox = 0, oy = 0;
    let pendingRestore = false;
    let restoreStartX = 0, restoreStartY = 0;

    function startDrag(cx, cy) {
      if (isTouchOnly()) return;
      bringToFront(id);
      focusWindow(id);
      if (w.dataset.maximized === "true") {
        if (!hasMaxBtn(id)) return;
        pendingRestore = true;
        restoreStartX = cx;
        restoreStartY = cy;
        return;
      }
      dragging = true;
      const rect = w.getBoundingClientRect();
      ox = cx - rect.left;
      oy = cy - rect.top;
      bar.style.cursor = "grabbing";
    }

    function moveDrag(cx, cy) {
      if (pendingRestore) {
        const dx = Math.abs(cx - restoreStartX);
        const dy = Math.abs(cy - restoreStartY);
        if (dx < 4 && dy < 4) return;
        pendingRestore = false;
        restoreGeometry(w);
        w.dataset.maximized = "false";
        dragging = true;
        ox = Math.min(w.offsetWidth  * 0.5, cx);
        oy = Math.min(w.offsetHeight * 0.1, bar.offsetHeight / 2);
        bar.style.cursor = "grabbing";
      }
      if (!dragging) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight - 40;
      w.style.left = Math.max(0, Math.min(cx - ox, vw - w.offsetWidth))  + "px";
      w.style.top  = Math.max(0, Math.min(cy - oy, vh - w.offsetHeight)) + "px";
    }

    function endDrag() {
      pendingRestore = false;
      dragging = false;
      bar.style.cursor = "grab";
    }

    bar.addEventListener("mousedown", e => {
      if (e.target.closest(".winbtns")) return;
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });

    document.addEventListener("mousemove", e => {
      if (!dragging && !pendingRestore) return;
      moveDrag(e.clientX, e.clientY);
    });

    document.addEventListener("mouseup", endDrag);
  });

  const handleResize = () => {
    applyMobileUI();
    ALL_IDS.forEach(id => {
      const w = win(id);
      if (!w || !isVisible(id)) return;
      if (isMobileBehavior()) {
        w.classList.add("win-mobile");
        applyGeometry(w, "", "", "", "");
        w.dataset.maximized = "true";
      } else if (isTouchOnly()) {
        w.classList.remove("win-mobile");
        fullscreenGeometry(w);
        w.dataset.maximized = "true";
      } else {
        w.classList.remove("win-mobile");
        if (w.dataset.maximized === "true") {
          fullscreenGeometry(w);
        } else {
          clampToViewport(w);
        }
      }
    });
  };

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 50);
  });
  window.addEventListener("orientationchange", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  });

  const startBtn  = document.querySelector(".start");
  const startMenu = document.querySelector(".start-menu");

  startBtn?.addEventListener("click", e => {
    e.stopPropagation();
    const isOpen = startMenu?.classList.contains("active");
    startMenu?.classList.toggle("active", !isOpen);
    startBtn.classList.toggle("active", !isOpen);
  });

  document.addEventListener("click", () => {
    startMenu?.classList.remove("active");
    startBtn?.classList.remove("active");
  });

  startMenu?.addEventListener("click", e => e.stopPropagation());

  document.querySelectorAll(".social[data-url]").forEach(el => {
    el.addEventListener("click", () => window.open(el.dataset.url, "_blank", "noopener,noreferrer"));
  });

  const clockEl = document.getElementById("clock-display");
  function updateClock() {
    if (!clockEl) return;
    const now  = new Date();
    let h      = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    clockEl.textContent = `${h}:${String(now.getMinutes()).padStart(2, "0")} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  const clearBtn  = document.getElementById("btn-clear");
  const sendBtn   = document.getElementById("btn-send");
  const statusImg = document.getElementById("status-img");
  const fieldIds  = ["contact-subject", "contact-from", "contact-message"];

  let statusTimer = null;

  function setStatus(state, autoReset = false) {
    if (!statusImg) return;
    statusImg.src = `res/${state}.png`;
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
    if (autoReset) {
      statusTimer = setTimeout(() => {
        if (statusImg) statusImg.src = "res/write.png";
        statusTimer = null;
      }, 1500);
    }
  }

  function validateForm() {
    const subject = document.getElementById("contact-subject")?.value.trim() ?? "";
    const from    = document.getElementById("contact-from")?.value.trim() ?? "";
    const message = document.getElementById("contact-message")?.value.trim() ?? "";
    const valid   = subject.length > 0
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)
      && message.length > 0;
    if (sendBtn) sendBtn.classList.toggle("disabled", !valid);
    return valid;
  }

  function clearFields() {
    fieldIds.forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = "";
    });
  }

  setStatus("write");
  validateForm();

  fieldIds.forEach(fid => {
    document.getElementById(fid)?.addEventListener("input", () => {
      if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
      setStatus("write");
      validateForm();
    });
  });

  clearBtn?.addEventListener("click", () => {
    clearFields();
    setStatus("write");
    validateForm();
  });

  let sending = false;

  sendBtn?.addEventListener("click", async () => {
    if (sendBtn.classList.contains("disabled") || sending) return;
    if (!validateForm()) return;

    const key     = document.getElementById("contact-key")?.value ?? "";
    const subject = document.getElementById("contact-subject")?.value.trim() ?? "";
    const from    = document.getElementById("contact-from")?.value.trim() ?? "";
    const message = document.getElementById("contact-message")?.value.trim() ?? "";

    if (!key || !subject || !from || !message) return;

    sending = true;
    sendBtn.classList.add("disabled");
    setStatus("wait");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_key: key, subject, email: from, message })
      });

      let data = null;
      try { data = await res.json(); } catch { data = null; }

      if (res.ok && data?.success) {
        clearFields();
        validateForm();
        setStatus("valid", true);
      } else {
        setStatus("invalid", true);
        sendBtn.classList.remove("disabled");
      }
    } catch {
      setStatus("invalid", true);
      sendBtn.classList.remove("disabled");
    } finally {
      sending = false;
    }
  });

});