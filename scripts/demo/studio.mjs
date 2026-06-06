// Demo "studio": drives the live app with Puppeteer, renders branded overlays
// + title cards in-browser, captures PNG frames with precise hold durations,
// and exposes helpers used by the storyboard. ffmpeg stitching lives here too.
import puppeteer from "puppeteer";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import fs from "node:fs";
import path from "node:path";

export const W = 1920;
export const H = 1080;
const FRAMES_DIR = "/tmp/demo/frames";
const BASE = process.env.DEMO_BASE || "http://localhost:3000";

// Stanford Consulting palette
const CARDINAL = "#8c1515";
const SAND = "#d2c295";

export class Studio {
  constructor() {
    this.manifest = []; // { file, duration }
    this.n = 0;
    this.section = "";
  }

  async start() {
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    this.browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--ignore-certificate-errors", "--force-color-profile=srgb", "--hide-scrollbars"],
      defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(45000);
  }

  async stop() {
    await this.browser.close().catch(() => {});
  }

  // ---- navigation -------------------------------------------------------
  async goto(p) {
    await this.page.goto(BASE + p, { waitUntil: "networkidle0", timeout: 60000 }).catch(() => {});
    await this.sleep(700);
    await this.injectOverlay();
  }

  sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  // ---- overlay (caption bar, section chip, cursor) ----------------------
  async injectOverlay() {
    await this.page.evaluate(({ CARDINAL, SAND }) => {
      if (document.getElementById("demo-overlay")) return;
      const o = document.createElement("div");
      o.id = "demo-overlay";
      o.innerHTML = `
        <style>
          #demo-overlay, #demo-overlay * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          #demo-chip { position: fixed; top: 18px; left: 18px; z-index: 2147483646;
            display: flex; align-items: center; gap: 8px; padding: 7px 13px; border-radius: 999px;
            background: rgba(15,23,42,.86); color: #fff; font-size: 14px; font-weight: 600; letter-spacing: .2px;
            box-shadow: 0 8px 24px rgba(0,0,0,.18); backdrop-filter: blur(4px); }
          #demo-chip .dot { width: 9px; height: 9px; border-radius: 999px; background: ${SAND}; }
          #demo-chip .num { color: ${SAND}; font-variant-numeric: tabular-nums; }
          #demo-cap { position: fixed; left: 50%; bottom: 46px; transform: translateX(-50%);
            z-index: 2147483646; max-width: 1180px; width: max-content;
            display: flex; align-items: stretch; gap: 0; border-radius: 14px; overflow: hidden;
            box-shadow: 0 18px 50px rgba(2,6,23,.28); }
          #demo-cap .accent { width: 8px; background: ${CARDINAL}; }
          #demo-cap .body { background: rgba(255,255,255,.97); padding: 16px 26px; }
          #demo-cap .t { color: #0f172a; font-size: 28px; font-weight: 700; line-height: 1.18; letter-spacing: -.2px; }
          #demo-cap .s { color: #475569; font-size: 18px; margin-top: 4px; font-weight: 500; }
          #demo-cursor { position: fixed; z-index: 2147483647; left: 0; top: 0; width: 26px; height: 26px;
            transform: translate(-100px,-100px); transition: transform .18s cubic-bezier(.4,0,.2,1); pointer-events: none;
            filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
          #demo-ring { position: fixed; z-index: 2147483645; width: 12px; height: 12px; border-radius: 999px;
            border: 3px solid ${CARDINAL}; opacity: 0; transform: translate(-100px,-100px) scale(1); pointer-events: none; }
        </style>
        <div id="demo-chip"><span class="dot"></span><span class="num"></span><span class="lbl"></span></div>
        <div id="demo-cap"><div class="accent"></div><div class="body"><div class="t"></div><div class="s"></div></div></div>
        <svg id="demo-cursor" viewBox="0 0 24 24" fill="white" stroke="#0f172a" stroke-width="1.4"><path d="M5 3l5.5 16 2.3-6.9L19 9.5z"/></svg>
        <div id="demo-ring"></div>`;
      document.documentElement.appendChild(o);
      window.__demo = {
        chip(num, lbl) {
          document.querySelector("#demo-chip .num").textContent = num || "";
          document.querySelector("#demo-chip .lbl").textContent = lbl || "";
          document.getElementById("demo-chip").style.display = lbl ? "flex" : "none";
        },
        cap(t, s) {
          document.querySelector("#demo-cap .t").textContent = t || "";
          document.querySelector("#demo-cap .s").textContent = s || "";
          document.getElementById("demo-cap").style.display = t ? "flex" : "none";
        },
        cursor(x, y) {
          document.getElementById("demo-cursor").style.transform = `translate(${x}px,${y}px)`;
        },
        ring(x, y, on) {
          const r = document.getElementById("demo-ring");
          r.style.transform = `translate(${x - 6}px,${y - 6}px) scale(${on ? 2.6 : 1})`;
          r.style.opacity = on ? "0.9" : "0";
        },
      };
    }, { CARDINAL, SAND });
    // restore current section chip + last caption after re-inject
    if (this.section) await this.page.evaluate((s) => window.__demo.chip(s.num, s.lbl), this.section);
  }

  async setSection(num, lbl) {
    this.section = { num, lbl };
    await this.page.evaluate((s) => window.__demo && window.__demo.chip(s.num, s.lbl), this.section);
  }

  async caption(t, s = "") {
    await this.page.evaluate(({ t, s }) => window.__demo && window.__demo.cap(t, s), { t, s });
  }

  // ---- frame capture ----------------------------------------------------
  async frame(duration) {
    const file = path.join(FRAMES_DIR, `f${String(this.n).padStart(5, "0")}.png`);
    await this.page.screenshot({ path: file });
    this.manifest.push({ file, duration });
    this.n++;
  }

  // Hold the current screen for `sec` seconds (one frame, long duration).
  async hold(sec) { await this.frame(sec); }

  // ---- interaction (captures motion frames) -----------------------------
  async center(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, selector);
  }

  async moveCursorTo(x, y) {
    await this.page.evaluate((p) => window.__demo.cursor(p.x, p.y), { x, y });
    await this.sleep(220);
    await this.frame(0.28);
  }

  async clickAt(x, y, selector) {
    await this.page.evaluate((p) => window.__demo.ring(p.x, p.y, true), { x, y });
    await this.frame(0.18);
    await this.page.evaluate((p) => window.__demo.ring(p.x, p.y, false), { x, y });
    if (selector) await this.page.click(selector).catch(() => {});
    await this.sleep(400);
    await this.injectOverlay();
    await this.frame(0.3);
  }

  // Move to a selector and click it, capturing the motion.
  async pointAndClick(selector, settleMs = 700) {
    const c = await this.center(selector);
    if (!c) return false;
    await this.moveCursorTo(c.x, c.y);
    await this.clickAt(c.x, c.y, selector);
    await this.sleep(settleMs);
    await this.injectOverlay();
    return true;
  }

  // Type into a field, capturing a few frames of progress.
  async typeInto(selector, text, perFrame = 3) {
    const c = await this.center(selector);
    if (c) await this.moveCursorTo(c.x, c.y);
    await this.page.click(selector).catch(() => {});
    await this.page.evaluate((sel) => { const e = document.querySelector(sel); if (e) e.value = ""; }, selector).catch(() => {});
    let buf = "";
    for (let i = 0; i < text.length; i++) {
      buf += text[i];
      await this.page.type(selector, text[i], { delay: 0 }).catch(() => {});
      if (i % perFrame === 0 || i === text.length - 1) await this.frame(0.10);
    }
    await this.sleep(300);
  }

  async scrollTo(y, ms = 600) {
    await this.page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "smooth" }), y);
    await this.sleep(ms);
    await this.injectOverlay();
  }

  // Find the on-screen center of the first visible element matching text.
  async centerText(text, tag = "*") {
    return this.page.evaluate(({ text, tag }) => {
      const els = Array.from(document.querySelectorAll(tag));
      const el = els.find((e) => e.offsetParent !== null && (e.textContent || "").trim().includes(text) && e.getBoundingClientRect().width > 0);
      if (!el) return null;
      el.setAttribute("data-demo-target", "1");
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + Math.min(r.height / 2, 24)) };
    }, { text, tag });
  }

  // Move cursor to an element (no click) — a "look here" gesture.
  async pointTo(selector) {
    const c = await this.center(selector);
    if (c) await this.moveCursorTo(c.x, c.y);
    return c;
  }
  async pointToText(text, tag = "*") {
    const c = await this.centerText(text, tag);
    if (c) await this.moveCursorTo(c.x, c.y);
    return c;
  }

  async pointAndClickText(text, tag = "button", settleMs = 800) {
    const c = await this.centerText(text, tag);
    if (!c) return false;
    await this.moveCursorTo(c.x, c.y);
    await this.page.evaluate((p) => window.__demo.ring(p.x, p.y, true), c);
    await this.frame(0.18);
    await this.page.evaluate((p) => window.__demo.ring(p.x, p.y, false), c);
    await this.page.evaluate(() => { const e = document.querySelector('[data-demo-target]'); if (e) { e.click(); e.removeAttribute('data-demo-target'); } });
    await this.sleep(settleMs);
    await this.injectOverlay();
    await this.frame(0.3);
    return true;
  }

  // ---- branded full-screen slide ---------------------------------------
  async slide(html, sec) {
    await this.page.goto("about:blank");
    await this.page.setContent(html, { waitUntil: "load" });
    await this.sleep(250);
    await this.frame(sec);
  }

  // ---- encode -----------------------------------------------------------
  async render(outPath, fps = 30) {
    const listPath = "/tmp/demo/list.txt";
    let list = "";
    for (const m of this.manifest) {
      list += `file '${m.file}'\nduration ${m.duration.toFixed(3)}\n`;
    }
    // concat demuxer needs the last file repeated (no duration) to flush.
    if (this.manifest.length) list += `file '${this.manifest[this.manifest.length - 1].file}'\n`;
    fs.writeFileSync(listPath, list);

    const total = this.manifest.reduce((a, m) => a + m.duration, 0);
    const args = [
      "-y", "-f", "concat", "-safe", "0", "-i", listPath,
      "-vf", `fps=${fps}`,
      "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      outPath,
    ];
    const res = spawnSync(ffmpegPath, args, { encoding: "utf8" });
    if (res.status !== 0) {
      console.error(res.stderr?.slice(-1500));
      throw new Error("ffmpeg failed");
    }
    return { total, frames: this.manifest.length };
  }
}

// Reusable slide templates ------------------------------------------------
export function titleSlide({ kicker, title, subtitle, footer }) {
  return slideShell(`
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 130px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:34px;">
        <div style="width:60px;height:60px;border-radius:14px;background:${CARDINAL};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:24px;letter-spacing:.5px;">SC</div>
        <div style="color:#cbd5e1;font-size:22px;font-weight:600;letter-spacing:3px;text-transform:uppercase;">${kicker || "Stanford Consulting"}</div>
      </div>
      <div style="color:#fff;font-size:78px;font-weight:800;line-height:1.05;letter-spacing:-1.5px;max-width:1400px;">${title}</div>
      ${subtitle ? `<div style="color:#94a3b8;font-size:30px;margin-top:28px;font-weight:500;max-width:1250px;line-height:1.4;">${subtitle}</div>` : ""}
      ${footer ? `<div style="position:absolute;bottom:64px;left:130px;color:#64748b;font-size:20px;">${footer}</div>` : ""}
      <div style="position:absolute;bottom:0;left:0;right:0;height:10px;background:linear-gradient(90deg,${CARDINAL},${SAND});"></div>
    </div>`);
}

export function sectionSlide({ num, title, points }) {
  const items = (points || []).map((p) => `
    <div style="display:flex;align-items:flex-start;gap:16px;margin-top:22px;">
      <div style="width:12px;height:12px;border-radius:999px;background:${SAND};margin-top:12px;flex:none;"></div>
      <div style="color:#e2e8f0;font-size:27px;font-weight:500;line-height:1.4;max-width:1150px;">${p}</div>
    </div>`).join("");
  return slideShell(`
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 130px;">
      <div style="color:${SAND};font-size:26px;font-weight:800;letter-spacing:4px;">SECTION ${num}</div>
      <div style="color:#fff;font-size:62px;font-weight:800;line-height:1.08;letter-spacing:-1px;margin-top:12px;">${title}</div>
      <div style="margin-top:26px;">${items}</div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:10px;background:linear-gradient(90deg,${CARDINAL},${SAND});"></div>
    </div>`);
}

function slideShell(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${W}px;height:${H}px;overflow:hidden;
      font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      background:radial-gradient(1200px 700px at 78% 18%, #1e293b 0%, #0b1220 55%, #060a14 100%);}
  </style></head><body>${inner}</body></html>`;
}
