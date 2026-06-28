/**
 * LandingPage
 * Trang giới thiệu hiển thị cho khách CHƯA đăng nhập (route "/").
 * Toàn bộ CSS được scope dưới `.nx-landing` để không ảnh hưởng phần còn lại của app.
 * Điều hướng: Đăng nhập / Tạo workspace -> /auth/login ; Đăng ký -> /auth/register.
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const STYLES = `
.nx-landing {
  --terracotta: #D97757;
  --terracotta-soft: rgba(217,119,87,.10);
  --ink: #1F1E1D;
  --ink-deep: #141413;
  --ink-2: #3D3D3A;
  --ink-3: #73726C;
  --bg: #FAF9F5;
  --card: #FFFFFF;
  --line: rgba(31,30,29,.15);
  --line-2: rgba(31,30,29,.3);
  --hover-bg: rgba(31,30,29,.04);
  --shadow-sm: rgba(0,0,0,.04) 0px 4px 20px 0px;
  --shadow-md: rgba(0,0,0,.016) 0px 4px 24px 0px, rgba(0,0,0,.016) 0px 4px 32px 0px, rgba(0,0,0,.01) 0px 2px 64px 0px, rgba(0,0,0,.01) 0px 16px 32px 0px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--ink);
  background: var(--bg);
  font-size: 16px; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
.nx-landing * { box-sizing: border-box; margin: 0; padding: 0; }
.nx-landing h1, .nx-landing h2 { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-weight: 600; line-height: 1.15; letter-spacing: -0.5px; }
.nx-landing h3, .nx-landing h4 { font-family: 'Inter', sans-serif; font-weight: 600; line-height: 1.2; letter-spacing: 0; }
.nx-landing a { color: inherit; text-decoration: none; }
.nx-landing .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 40px; }
.nx-landing .brand-text { color: var(--terracotta); }

.nx-landing header { position: sticky; top: 0; z-index: 50; background: var(--bg); border-bottom: 1px solid rgba(31,30,29,.1); }
.nx-landing .nav { display: flex; align-items: center; justify-content: space-between; height: 84px; }
.nx-landing .logo { display: flex; align-items: center; gap: 10px; font-family: 'Playfair Display', serif; font-size: 22px; }
.nx-landing .logo .mark { width: 32px; height: 32px; border-radius: 8px; background: var(--terracotta); display: grid; place-items: center; color: #fff; font-size: 18px; font-family: 'Playfair Display', serif; }
.nx-landing .nav-links { display: flex; align-items: center; gap: 8px; }
.nx-landing .nav-links a { color: var(--ink); font-size: 16px; font-weight: 400; padding: 8px 12px; border-radius: 8px; transition: color .15s, background .15s; }
.nx-landing .nav-links a:hover { color: var(--ink-2); background: var(--hover-bg); }
.nx-landing .nav-cta { display: flex; align-items: center; gap: 12px; }

.nx-landing .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: 'Inter', sans-serif; font-weight: 400; font-size: 15px; line-height: 22.5px; height: 44px; padding: 12px 24px; border-radius: 9.6px; cursor: pointer; border: 1px solid transparent; transition: background .18s ease, border-color .18s ease, transform .1s ease, box-shadow .2s ease; }
.nx-landing .btn-primary { background: var(--ink); color: #fff; box-shadow: var(--shadow-sm); }
.nx-landing .btn-primary:hover { background: #0A0A0A; box-shadow: rgba(0,0,0,.08) 0px 8px 28px 0px; }
.nx-landing .btn-primary:active { background: #000; transform: scale(.98); }
.nx-landing .btn-ghost { color: var(--ink); border-color: var(--line-2); background: var(--card); }
.nx-landing .btn-ghost:hover { background: var(--bg); border-color: rgba(31,30,29,.6); }
.nx-landing .btn-lg { height: 52px; padding: 14px 28px; font-size: 16px; }

.nx-landing .hero { padding: 80px 0 64px; text-align: center; position: relative; overflow: hidden; }
.nx-landing .hero::before { content: ''; position: absolute; inset: -1px 0 auto 0; height: 520px; z-index: 0; background: radial-gradient(50% 60% at 50% 0%, rgba(217,119,87,.07), transparent 70%), radial-gradient(40% 50% at 88% 8%, rgba(217,119,87,.05), transparent 70%); }
.nx-landing .hero::after { content: ''; position: absolute; inset: 0; z-index: 0; opacity: .5; background-image: radial-gradient(rgba(31,30,29,.05) 1px, transparent 1px); background-size: 22px 22px; -webkit-mask-image: radial-gradient(60% 50% at 50% 0%, #000, transparent 75%); mask-image: radial-gradient(60% 50% at 50% 0%, #000, transparent 75%); }
.nx-landing .hero .container { position: relative; z-index: 1; }
.nx-landing .badge { display: inline-flex; align-items: center; gap: 8px; background: var(--card); color: var(--ink); font-size: 12.5px; font-weight: 500; padding: 5px 14px; border-radius: 999px; border: 1px solid var(--line); margin-bottom: 28px; box-shadow: var(--shadow-sm); }
.nx-landing .badge .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--terracotta); box-shadow: 0 0 0 3px rgba(217,119,87,.18); }
.nx-landing .hero h1 { font-size: clamp(42px, 6.4vw, 64px); font-weight: 700; max-width: 15ch; margin: 0 auto 22px; }
.nx-landing .hero p.lead { font-size: 18px; line-height: 27px; color: var(--ink-2); max-width: 54ch; margin: 0 auto 36px; }
.nx-landing .hero-cta { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.nx-landing .hero-note { margin-top: 18px; font-size: 13px; color: var(--ink-3); }

.nx-landing .mockup { margin: 56px auto 0; max-width: 960px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-md); overflow: hidden; position: relative; }
.nx-landing .mockup-bar { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--line); background: var(--bg); }
.nx-landing .mockup-bar .d { width: 11px; height: 11px; border-radius: 50%; }
.nx-landing .mockup-bar .d.r { background: #E8857A; } .nx-landing .mockup-bar .d.y { background: #E8C07A; } .nx-landing .mockup-bar .d.g { background: #9BCBA0; }
.nx-landing .mockup-bar .url { margin-left: 12px; font-size: 12px; color: var(--ink-3); background: #fff; border: 1px solid var(--line); border-radius: 7px; padding: 4px 12px; }
.nx-landing .mockup-body { display: grid; grid-template-columns: 188px 1fr; min-height: 420px; }
.nx-landing .mk-side { background: var(--card); border-right: 1px solid var(--line); padding: 14px 12px; text-align: left; }
.nx-landing .mk-side .ws { display: flex; align-items: center; gap: 8px; font-family: 'Playfair Display', serif; font-size: 17px; padding: 4px 8px 14px; }
.nx-landing .mk-side .ws .av { width: 26px; height: 26px; border-radius: 7px; background: var(--terracotta); display: grid; place-items: center; color: #fff; font-size: 15px; font-family: 'Playfair Display', serif; }
.nx-landing .mk-nav-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ink-2); padding: 8px 10px; border-radius: 8px; margin-bottom: 1px; }
.nx-landing .mk-nav-item .mi { font-size: 13px; width: 16px; text-align: center; opacity: .75; }
.nx-landing .mk-nav-item.active { background: var(--ink); color: #fff; font-weight: 600; }
.nx-landing .mk-nav-item.active .mi { opacity: 1; }
.nx-landing .mk-main { background: var(--bg); text-align: left; }
.nx-landing .mk-top { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--line); background: var(--card); }
.nx-landing .mk-top .wsbtn { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; border: 1px solid var(--line); border-radius: 8px; padding: 5px 10px; }
.nx-landing .mk-top .wsbtn .gw { width: 20px; height: 20px; border-radius: 6px; background: var(--terracotta); color: #fff; display: grid; place-items: center; font-size: 9px; font-weight: 700; }
.nx-landing .mk-top .right { display: flex; align-items: center; gap: 8px; }
.nx-landing .mk-top .pill { font-size: 11px; color: var(--ink-2); border: 1px solid var(--line); border-radius: 999px; padding: 4px 10px; background: var(--card); }
.nx-landing .mk-top .av2 { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#E8C07A,#9BCBA0); }
.nx-landing .mk-content { padding: 18px; }
.nx-landing .mk-content .ttl { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; margin-bottom: 2px; }
.nx-landing .mk-content .sub { font-size: 12.5px; color: var(--ink-3); margin-bottom: 16px; }
.nx-landing .mk-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px; }
.nx-landing .mk-stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 12px; }
.nx-landing .mk-stat .si { font-size: 15px; margin-bottom: 10px; }
.nx-landing .mk-stat .sn { font-size: 20px; font-weight: 700; line-height: 1; }
.nx-landing .mk-stat .sl { font-size: 10.5px; color: var(--ink-3); margin-top: 3px; }
.nx-landing .mk-qa { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
.nx-landing .mk-qa .qh { font-size: 14px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 7px; }
.nx-landing .mk-act { display: flex; align-items: center; gap: 11px; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
.nx-landing .mk-act:last-child { margin-bottom: 0; }
.nx-landing .mk-act .ai { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: #fff; font-size: 13px; flex: 0 0 auto; }
.nx-landing .mk-act .at { font-size: 12.5px; font-weight: 600; }
.nx-landing .mk-act .ad { font-size: 11px; color: var(--ink-3); }

.nx-landing .trust { padding: 48px 0 8px; text-align: center; }
.nx-landing .trust p { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 24px; }
.nx-landing .trust-row { display: flex; flex-wrap: wrap; gap: 40px; justify-content: center; align-items: center; opacity: .55; font-weight: 400; font-size: 19px; font-family: 'Playfair Display', serif; color: var(--ink-2); }

.nx-landing section { padding: 80px 0; }
.nx-landing .sec-head { text-align: center; max-width: 60ch; margin: 0 auto 56px; }
.nx-landing .sec-head .kicker { color: var(--terracotta); font-weight: 600; font-size: 14px; letter-spacing: .02em; text-transform: uppercase; margin-bottom: 12px; }
.nx-landing .sec-head h2 { font-size: clamp(32px, 4vw, 48px); margin-bottom: 14px; }
.nx-landing .sec-head p { color: var(--ink-2); font-size: 17px; line-height: 25.5px; }

.nx-landing .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.nx-landing .feat { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 32px; transition: box-shadow .2s ease; }
.nx-landing .feat:hover { box-shadow: var(--shadow-md); }
.nx-landing .feat .fi { width: 46px; height: 46px; border-radius: 12px; background: var(--terracotta-soft); display: grid; place-items: center; margin-bottom: 16px; font-size: 22px; }
.nx-landing .feat h3 { font-size: 24px; margin-bottom: 8px; }
.nx-landing .feat p { color: var(--ink-2); font-size: 15px; line-height: 22.5px; }

.nx-landing .split { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.nx-landing .split h2 { font-size: clamp(28px, 3.6vw, 40px); margin-bottom: 16px; }
.nx-landing .split p { color: var(--ink-2); font-size: 16px; line-height: 24px; margin-bottom: 20px; }
.nx-landing .check { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.nx-landing .check .ck { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 50%; background: var(--terracotta); color: #fff; display: grid; place-items: center; font-size: 12px; margin-top: 2px; }
.nx-landing .check span { font-size: 15px; }
.nx-landing .visual { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 28px; box-shadow: var(--shadow-sm); }
.nx-landing .vis-card { background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
.nx-landing .vis-card:last-child { margin-bottom: 0; }
.nx-landing .vis-card .q { font-weight: 600; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.nx-landing .vis-card .a { font-size: 13.5px; color: var(--ink-2); }
.nx-landing .vis-card .src { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 11.5px; color: var(--ink); background: var(--card); border: 1px solid var(--line); padding: 4px 10px; border-radius: 8px; }

.nx-landing .ai-demo { max-width: 860px; margin: 0 auto; }
.nx-landing .ai-prompts { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 24px; }
.nx-landing .ai-chip { font-size: 13.5px; color: var(--ink-2); background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 9px 16px; cursor: pointer; transition: border-color .15s, color .15s, background .15s, box-shadow .15s; }
.nx-landing .ai-chip:hover { border-color: var(--line-2); color: var(--ink); }
.nx-landing .ai-chip.active { background: var(--ink); color: #fff; border-color: var(--ink); box-shadow: var(--shadow-sm); }
.nx-landing .ai-window { background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-md); overflow: hidden; }
.nx-landing .ai-winbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--line); background: var(--bg); }
.nx-landing .ai-winbar .d { width: 10px; height: 10px; border-radius: 50%; }
.nx-landing .ai-winbar .d.r { background: #E8857A; } .nx-landing .ai-winbar .d.y { background: #E8C07A; } .nx-landing .ai-winbar .d.g { background: #9BCBA0; }
.nx-landing .ai-winbar .t { margin-left: 8px; font-size: 12px; color: var(--ink-3); display: flex; align-items: center; gap: 6px; }
.nx-landing .ai-body { padding: 22px 22px 24px; min-height: 230px; }
.nx-landing .ai-msg { display: flex; gap: 12px; margin-bottom: 18px; }
.nx-landing .ai-msg .who { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; font-size: 13px; color: #fff; }
.nx-landing .ai-msg.user .who { background: linear-gradient(135deg,#E8C07A,#9BCBA0); }
.nx-landing .ai-msg.bot .who { background: var(--ink); }
.nx-landing .ai-msg .bubble { flex: 1; }
.nx-landing .ai-msg .bubble .q { font-size: 15px; font-weight: 600; padding-top: 4px; }
.nx-landing .ai-msg .bubble .ans { font-size: 14.5px; line-height: 22px; color: var(--ink-2); }
.nx-landing .ai-typing .ans::after { content: '▋'; color: var(--terracotta); animation: nxblink 1s steps(2) infinite; }
@keyframes nxblink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
.nx-landing .ai-sources { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.nx-landing .ai-src { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink); background: var(--bg); border: 1px solid var(--line); padding: 5px 11px; border-radius: 8px; }
.nx-landing .ai-src .sd { width: 6px; height: 6px; border-radius: 50%; background: var(--terracotta); }
.nx-landing .ai-foot { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--line); }
.nx-landing .ai-foot .fake-input { flex: 1; font-size: 13px; color: var(--ink-3); background: var(--bg); border: 1px solid var(--line); border-radius: 9.6px; padding: 9px 14px; }
.nx-landing .ai-foot .send { width: 36px; height: 36px; border-radius: 9.6px; background: var(--ink); color: #fff; display: grid; place-items: center; font-size: 14px; }

.nx-landing .bento { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 200px; gap: 16px; }
.nx-landing .bento .b { position: relative; overflow: hidden; background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 22px; transition: box-shadow .2s ease, transform .2s ease; }
.nx-landing .bento .b:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.nx-landing .bento .b .bh { font-size: 18px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.nx-landing .bento .b .bp { font-size: 13.5px; color: var(--ink-3); line-height: 20px; max-width: 30ch; }
.nx-landing .bento .b .bi { font-size: 18px; }
.nx-landing .b-wide { grid-column: span 2; }
.nx-landing .b-tall { grid-row: span 2; }
.nx-landing .b-dark { background: var(--ink-deep); border-color: var(--ink-deep); color: #fff; }
.nx-landing .b-dark .bp { color: rgba(255,255,255,.66); }
.nx-landing .mini-chat { position: absolute; left: 22px; right: 22px; bottom: 18px; display: flex; flex-direction: column; gap: 8px; }
.nx-landing .bub { font-size: 12px; padding: 8px 12px; border-radius: 12px; max-width: 78%; line-height: 1.35; }
.nx-landing .bub.them { background: var(--bg); color: var(--ink-2); border: 1px solid var(--line); align-self: flex-start; border-bottom-left-radius: 4px; }
.nx-landing .bub.me { background: var(--terracotta); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
.nx-landing .b-dark .bub.them { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.85); }
.nx-landing .mini-kanban { position: absolute; left: 22px; right: 22px; bottom: 18px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.nx-landing .kcol { background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 8px; }
.nx-landing .kcol .kt { font-size: 9.5px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
.nx-landing .kcard { background: var(--card); border: 1px solid var(--line); border-radius: 7px; padding: 6px 8px; font-size: 10.5px; margin-bottom: 5px; }
.nx-landing .kcard .kdot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 5px; }
.nx-landing .mini-cal { position: absolute; left: 22px; right: 22px; bottom: 18px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.nx-landing .mini-cal .cd { aspect-ratio: 1; border-radius: 7px; background: var(--bg); border: 1px solid var(--line); display: grid; place-items: center; font-size: 10px; color: var(--ink-3); }
.nx-landing .mini-cal .cd.on { background: var(--terracotta); color: #fff; border-color: var(--terracotta); font-weight: 600; }
.nx-landing .mini-files { position: absolute; left: 22px; right: 22px; bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
.nx-landing .frow { display: flex; align-items: center; gap: 9px; background: var(--bg); border: 1px solid var(--line); border-radius: 9px; padding: 7px 10px; }
.nx-landing .frow .fic { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; font-size: 11px; color: #fff; }
.nx-landing .frow .fn { font-size: 11.5px; font-weight: 500; flex: 1; }
.nx-landing .frow .fs { font-size: 10px; color: var(--ink-3); }
.nx-landing .b-dark .glow { position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(217,119,87,.45), transparent 70%); }
.nx-landing .ai-stat { position: absolute; left: 22px; bottom: 20px; }
.nx-landing .ai-stat .big { font-family: 'Playfair Display', serif; font-size: 40px; font-weight: 700; line-height: 1; }
.nx-landing .ai-stat .sm { font-size: 12px; color: rgba(255,255,255,.6); margin-top: 4px; }

.nx-landing .cta-band { background: var(--ink-deep); border-radius: 12px; padding: 56px 40px; text-align: center; color: #fff; }
.nx-landing .cta-band h2 { font-size: clamp(30px, 4vw, 48px); margin-bottom: 14px; }
.nx-landing .cta-band p { font-size: 17px; color: rgba(255,255,255,.78); margin-bottom: 30px; }
.nx-landing .cta-band .btn-primary { background: var(--terracotta); color: #fff; }
.nx-landing .cta-band .btn-primary:hover { background: #C5663F; box-shadow: rgba(0,0,0,.2) 0px 8px 28px 0px; }

.nx-landing footer { border-top: 1px solid rgba(31,30,29,.1); padding: 56px 0 40px; }
.nx-landing .foot { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px; }
.nx-landing .foot .col h4 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); margin-bottom: 14px; font-weight: 600; }
.nx-landing .foot .col a { display: block; color: var(--ink-2); font-size: 14.5px; padding: 5px 0; transition: color .15s; }
.nx-landing .foot .col a:hover { color: var(--terracotta); }
.nx-landing .foot .about p { color: var(--ink-2); font-size: 14.5px; margin-top: 14px; max-width: 36ch; }
.nx-landing .foot-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(31,30,29,.1); color: var(--ink-3); font-size: 13.5px; flex-wrap: wrap; gap: 12px; }

@media (max-width: 900px) {
  .nx-landing .grid { grid-template-columns: 1fr 1fr; }
  .nx-landing .split { grid-template-columns: 1fr; gap: 32px; }
  .nx-landing .bento { grid-template-columns: 1fr 1fr; grid-auto-rows: 180px; }
  .nx-landing .bento .b-wide, .nx-landing .bento .b-tall { grid-column: auto; grid-row: auto; }
  .nx-landing .foot { grid-template-columns: 1fr 1fr; }
  .nx-landing .mockup-body { grid-template-columns: 1fr; }
  .nx-landing .mk-side { display: none; }
  .nx-landing .mk-stats { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 620px) {
  .nx-landing .nav-links { display: none; }
  .nx-landing .grid { grid-template-columns: 1fr; }
  .nx-landing .bento { grid-template-columns: 1fr; }
  .nx-landing .hero { padding: 56px 0 40px; }
  .nx-landing .mk-stats { grid-template-columns: repeat(2, 1fr); }
  .nx-landing .mk-top .pill { display: none; }
}
`;

const QA = [
  {
    q: 'Đề cương dự án Q3 deadline khi nào?',
    a: 'Theo tài liệu "demo.pdf", mốc bàn giao cuối là 30/09. Sprint 4 cần hoàn tất trước 22/09 để kịp vòng review nội bộ.',
    src: ['📎 demo.pdf', '✅ Sprint 4 · Projects'],
  },
  {
    q: 'Tóm tắt thảo luận kênh #design hôm nay',
    a: 'Đội đã chốt bảng màu terracotta, hoãn dark-mode sang sprint sau, và giao Lan Anh dựng mockup landing. Có 3 task mới được tạo từ cuộc thảo luận.',
    src: ['💬 #design · 12 tin nhắn', '🤖 3 task gợi ý'],
  },
  {
    q: 'Còn task nào quá hạn trong tuần này?',
    a: 'Có 2 task quá hạn: "Viết nội dung hero" (hạn 26/06, giao Minh Khang) và "Kiểm thử upload file" (hạn 27/06). Cả hai đang ở trạng thái In Progress.',
    src: ['✅ 2 task quá hạn', '📅 Tuần 26/06–02/07'],
  },
  {
    q: 'Ai phụ trách phần tích hợp LiveKit?',
    a: 'Theo ghi chú "Kien-truc-video.md" và lịch sử task, phần tích hợp LiveKit cho gọi video nhóm do Gia Khang phụ trách, hiện đã hoàn thành 80%.',
    src: ['📝 Kien-truc-video.md', '🎥 Video Call · module'],
  },
];

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..800;1,400..600&family=Inter:opsz,wght@14..32,100..900&display=swap&subset=vietnamese,latin';

export default function LandingPage() {
  const promptsRef = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const srcRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);
  const secRef = useRef<HTMLElement>(null);

  // Nạp Google Fonts một lần (nếu chưa có)
  useEffect(() => {
    if (!document.querySelector('link[data-nx-landing-font]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      link.setAttribute('data-nx-landing-font', '');
      document.head.appendChild(link);
    }
  }, []);

  // AI playground: gõ chữ + trích dẫn nguồn
  useEffect(() => {
    let typer: ReturnType<typeof setInterval> | null = null;
    let started = false;

    const select = (i: number) => {
      const chips = promptsRef.current?.querySelectorAll('.ai-chip');
      chips?.forEach((c, idx) => c.classList.toggle('active', idx === i));
      const item = QA[i];
      if (qRef.current) qRef.current.textContent = item.q;
      if (srcRef.current) srcRef.current.innerHTML = '';
      botRef.current?.classList.add('ai-typing');
      if (typer) clearInterval(typer);

      let n = 0;
      if (aRef.current) aRef.current.textContent = '';
      typer = setInterval(() => {
        n++;
        if (aRef.current) aRef.current.textContent = item.a.slice(0, n);
        if (n >= item.a.length) {
          if (typer) clearInterval(typer);
          botRef.current?.classList.remove('ai-typing');
          item.src.forEach((s) => {
            const tag = document.createElement('span');
            tag.className = 'ai-src';
            tag.innerHTML = '<span class="sd"></span>' + s;
            srcRef.current?.appendChild(tag);
          });
        }
      }, 16);
    };

    // gắn click cho từng chip
    const chips = promptsRef.current?.querySelectorAll('.ai-chip');
    const handlers: Array<() => void> = [];
    chips?.forEach((c, idx) => {
      const h = () => select(idx);
      c.addEventListener('click', h);
      handlers.push(() => c.removeEventListener('click', h));
    });

    // chạy câu đầu khi cuộn tới
    let io: IntersectionObserver | null = null;
    if (secRef.current && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && !started) {
              started = true;
              select(0);
              io?.disconnect();
            }
          });
        },
        { threshold: 0.4 },
      );
      io.observe(secRef.current);
    } else {
      select(0);
    }

    return () => {
      if (typer) clearInterval(typer);
      io?.disconnect();
      handlers.forEach((off) => off());
    };
  }, []);

  return (
    <div className="nx-landing">
      <style>{STYLES}</style>

      {/* NAV */}
      <header>
        <div className="container nav">
          <Link className="logo" to="/auth/login"><span className="mark">N</span> Nexus</Link>
          <nav className="nav-links">
            <a href="#features">Tính năng</a>
            <a href="#ai">Nexus AI</a>
            <a href="#workflow">Quy trình</a>
            <a href="#stats">Hỏi AI</a>
          </nav>
          <div className="nav-cta">
            <Link className="btn btn-ghost" to="/auth/login">Đăng nhập</Link>
            <Link className="btn btn-primary" to="/auth/register">Đăng ký</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <span className="badge"><span className="dot"></span> All-in-One Workspace · tích hợp AI</span>
          <h1>Tất cả công việc của đội nhóm, trong <span className="brand-text">một workspace</span></h1>
          <p className="lead">Chat, dự án, tệp, lịch, ghi chú và gọi video — hợp nhất trong Nexus. Ít công cụ rời rạc hơn, nhiều việc hoàn thành hơn.</p>
          <div className="hero-cta">
            <Link className="btn btn-primary btn-lg" to="/auth/login">Bắt đầu miễn phí →</Link>
            <a className="btn btn-ghost btn-lg" href="#features">Xem tính năng</a>
          </div>
          <p className="hero-note">Hoàn toàn miễn phí · Không cần thẻ tín dụng</p>

          {/* App mockup */}
          <div className="mockup">
            <div className="mockup-bar">
              <span className="d r"></span><span className="d y"></span><span className="d g"></span>
              <span className="url">app.nexusapp.io/workspace</span>
            </div>
            <div className="mockup-body">
              <aside className="mk-side">
                <div className="ws"><span className="av">N</span> Nexus</div>
                <div className="mk-nav-item active"><span className="mi">⌂</span> Dashboard</div>
                <div className="mk-nav-item"><span className="mi">💬</span> Messages</div>
                <div className="mk-nav-item"><span className="mi">✦</span> AI Chat</div>
                <div className="mk-nav-item"><span className="mi">▦</span> Projects</div>
                <div className="mk-nav-item"><span className="mi">📝</span> Notes</div>
                <div className="mk-nav-item"><span className="mi">📅</span> Calendar</div>
                <div className="mk-nav-item"><span className="mi">🎥</span> Video Call</div>
                <div className="mk-nav-item"><span className="mi">📁</span> Files</div>
                <div className="mk-nav-item"><span className="mi">🔍</span> Search</div>
              </aside>
              <main className="mk-main">
                <div className="mk-top">
                  <div className="wsbtn"><span className="gw">GW</span> My Workspace ▾</div>
                  <div className="right">
                    <span className="pill">🌐 English</span>
                    <span className="pill">🔔 6</span>
                    <span className="av2"></span>
                  </div>
                </div>
                <div className="mk-content">
                  <div className="ttl">Dashboard</div>
                  <div className="sub">Welcome back! Here's what's happening in your workspace.</div>
                  <div className="mk-stats">
                    <div className="mk-stat"><div className="si" style={{ color: '#5B6CBE' }}>👥</div><div className="sn">4</div><div className="sl">Total Members</div></div>
                    <div className="mk-stat"><div className="si" style={{ color: '#DC6038' }}>🎥</div><div className="sn">3</div><div className="sl">Events</div></div>
                    <div className="mk-stat"><div className="si" style={{ color: '#5BBE7A' }}>✓</div><div className="sn">13</div><div className="sl">Tasks</div></div>
                    <div className="mk-stat"><div className="si" style={{ color: '#1F1E1D' }}>✉</div><div className="sn">38</div><div className="sl">Messages</div></div>
                    <div className="mk-stat"><div className="si" style={{ color: '#D97757' }}>📂</div><div className="sn">5</div><div className="sl">Files</div></div>
                    <div className="mk-stat"><div className="si" style={{ color: '#8250DF' }}>💼</div><div className="sn">5</div><div className="sl">Projects</div></div>
                  </div>
                  <div className="mk-qa">
                    <div className="qh">⚡ Quick Actions</div>
                    <div className="mk-act"><span className="ai" style={{ background: '#4285F4' }}>+</span><div><div className="at">Start New Project</div><div className="ad">Create a new project workspace</div></div></div>
                    <div className="mk-act"><span className="ai" style={{ background: '#5BBE7A' }}>💬</span><div><div className="at">Send Message</div><div className="ad">Start a conversation</div></div></div>
                    <div className="mk-act"><span className="ai" style={{ background: '#8250DF' }}>📄</span><div><div className="at">Upload Files</div><div className="ad">Add files to workspace</div></div></div>
                    <div className="mk-act"><span className="ai" style={{ background: '#DC6038' }}>📅</span><div><div className="at">Schedule Meeting</div><div className="ad">Create calendar event</div></div></div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <div className="trust">
        <div className="container">
          <p>Được tin dùng bởi các đội nhóm hiện đại</p>
          <div className="trust-row">
            <span>Acme</span><span>Lumen</span><span>Vega</span><span>Northwind</span><span>Orbit</span><span>Helio</span>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features">
        <div className="container">
          <div className="sec-head">
            <div className="kicker">Một nền tảng — đủ mọi việc</div>
            <h2>Mọi thứ đội nhóm cần, không phải nhảy giữa 6 ứng dụng</h2>
            <p>Nexus gom toàn bộ luồng làm việc cộng tác vào chung một nơi, đồng bộ thời gian thực.</p>
          </div>
          <div className="grid">
            <div className="feat"><div className="fi">💬</div><h3>Chat &amp; Kênh</h3><p>Kênh công khai/riêng tư, hội thoại trực tiếp, thread, reaction, ghim tin và tin nhắn hẹn giờ. Mã hoá đầu cuối tuỳ chọn.</p></div>
            <div className="feat"><div className="fi">✅</div><h3>Dự án &amp; Công việc</h3><p>Bảng Kanban, task con, phụ thuộc, trường tuỳ chỉnh, nhắc hạn — quản lý sprint trọn vẹn ngay trong workspace.</p></div>
            <div className="feat"><div className="fi">📁</div><h3>Tệp &amp; Thư mục</h3><p>Lưu trữ, sắp xếp theo thư mục phân cấp, chia sẻ qua link công khai có hạn dùng và mật khẩu. Tìm kiếm nội dung tệp.</p></div>
            <div className="feat"><div className="fi">📅</div><h3>Lịch &amp; Phòng họp</h3><p>Sự kiện lặp lại, danh mục, lời nhắc, người tham dự, đặt phòng họp — đồng bộ lịch của cả đội.</p></div>
            <div className="feat"><div className="fi">📝</div><h3>Ghi chú &amp; Tài liệu</h3><p>Trang tài liệu phân cấp, đính kèm, chia sẻ với phân quyền, yêu cầu truy cập và soạn thảo cộng tác.</p></div>
            <div className="feat"><div className="fi">🎥</div><h3>Gọi video</h3><p>Cuộc gọi nhóm tích hợp LiveKit, mời tham gia, duyệt yêu cầu vào phòng — họp trực tiếp không rời ứng dụng.</p></div>
          </div>
        </div>
      </section>

      {/* AI / RAG HIGHLIGHT */}
      <section id="ai" style={{ background: 'var(--card)', borderTop: '1px solid rgba(31,30,29,.1)', borderBottom: '1px solid rgba(31,30,29,.1)' }}>
        <div className="container split">
          <div>
            <div className="kicker" style={{ color: 'var(--terracotta)', fontWeight: 600, fontSize: 14, letterSpacing: '.02em', textTransform: 'uppercase', marginBottom: 12 }}>Nexus AI · RAG</div>
            <h2>Hỏi đáp ngay trên dữ liệu của đội bạn</h2>
            <p>Nexus AI lập chỉ mục tệp, ghi chú và tin nhắn của workspace, rồi trả lời câu hỏi kèm trích dẫn nguồn — bạn luôn biết câu trả lời đến từ đâu.</p>
            <div className="check"><span className="ck">✓</span><span>Tìm kiếm ngữ nghĩa trên toàn bộ tệp &amp; ghi chú</span></div>
            <div className="check"><span className="ck">✓</span><span>Tóm tắt hội thoại &amp; gợi ý task tự động</span></div>
            <div className="check"><span className="ck">✓</span><span>Trợ lý chat hiểu ngữ cảnh workspace của bạn</span></div>
            <div className="check"><span className="ck">✓</span><span>Trả lời kèm trích dẫn nguồn, minh bạch &amp; kiểm chứng được</span></div>
          </div>
          <div className="visual">
            <div className="vis-card">
              <div className="q">🤖 Đề cương dự án Q3 deadline khi nào?</div>
              <div className="a">Theo tài liệu "demo.pdf", mốc bàn giao cuối là 30/09. Sprint 4 cần xong trước 22/09 để kịp review.</div>
              <span className="src">📎 Nguồn: demo.pdf</span>
            </div>
            <div className="vis-card">
              <div className="q">🤖 Tóm tắt thảo luận kênh #design hôm nay</div>
              <div className="a">Đội đã chốt bảng màu terracotta, hoãn phần dark-mode sang sprint sau, và giao Lan Anh dựng mockup landing.</div>
              <span className="src">💬 Nguồn: #design · 12 tin nhắn</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI PLAYGROUND */}
      <section id="stats" ref={secRef}>
        <div className="container">
          <div className="sec-head">
            <div className="kicker">Hỏi Nexus AI</div>
            <h2>Đặt câu hỏi — AI trả lời dựa trên workspace của bạn</h2>
            <p>Chọn một câu hỏi để xem Nexus AI tổng hợp câu trả lời từ tệp, ghi chú và tin nhắn của đội bạn, kèm trích dẫn nguồn.</p>
          </div>
          <div className="ai-demo">
            <div className="ai-prompts" ref={promptsRef}>
              {QA.map((item, i) => (
                <button key={i} className={'ai-chip' + (i === 0 ? ' active' : '')} type="button">{item.q}</button>
              ))}
            </div>
            <div className="ai-window">
              <div className="ai-winbar">
                <span className="d r"></span><span className="d y"></span><span className="d g"></span>
                <span className="t">✦ Nexus AI · My Workspace</span>
              </div>
              <div className="ai-body">
                <div className="ai-msg user">
                  <span className="who">GW</span>
                  <div className="bubble"><div className="q" ref={qRef}>—</div></div>
                </div>
                <div className="ai-msg bot" ref={botRef}>
                  <span className="who">✦</span>
                  <div className="bubble">
                    <div className="ans" ref={aRef}></div>
                    <div className="ai-sources" ref={srcRef}></div>
                  </div>
                </div>
              </div>
              <div className="ai-foot">
                <div className="fake-input">Hỏi bất cứ điều gì về workspace của bạn…</div>
                <span className="send">↑</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section id="workflow" style={{ background: 'var(--card)', borderTop: '1px solid rgba(31,30,29,.1)', borderBottom: '1px solid rgba(31,30,29,.1)' }}>
        <div className="container">
          <div className="sec-head">
            <div className="kicker">Một ngày làm việc với Nexus</div>
            <h2>Trao đổi, lên kế hoạch, thực thi — không rời tab</h2>
            <p>Mọi mảnh ghép của công việc nói chuyện với nhau trong cùng một workspace.</p>
          </div>
          <div className="bento">
            <div className="b b-wide">
              <div className="bh"><span className="bi">💬</span> Trò chuyện theo thời gian thực</div>
              <div className="bp">Kênh, thread, reaction, mention — giữ ngữ cảnh ở đúng nơi.</div>
              <div className="mini-chat">
                <div className="bub them">Mockup landing xong rồi nha 🎉</div>
                <div className="bub me">Tuyệt! Mình tạo task review nhé 👍</div>
              </div>
            </div>
            <div className="b b-tall b-dark">
              <span className="glow"></span>
              <div className="bh"><span className="bi">🤖</span> Nexus AI · RAG</div>
              <div className="bp">Hỏi đáp trên tệp, ghi chú &amp; tin nhắn — trả lời kèm trích dẫn nguồn.</div>
              <div className="ai-stat"><div className="big">1.2k+</div><div className="sm">tài liệu đã lập chỉ mục &amp; sẵn sàng hỏi đáp</div></div>
            </div>
            <div className="b">
              <div className="bh"><span className="bi">📅</span> Lịch &amp; họp</div>
              <div className="bp">Sự kiện, nhắc lịch, đặt phòng họp.</div>
              <div className="mini-cal">
                <div className="cd">8</div><div className="cd">9</div><div className="cd on">10</div><div className="cd">11</div><div className="cd">12</div><div className="cd">13</div><div className="cd">14</div>
              </div>
            </div>
            <div className="b">
              <div className="bh"><span className="bi">📁</span> Tệp &amp; chia sẻ</div>
              <div className="bp">Lưu trữ, chia sẻ link an toàn.</div>
              <div className="mini-files">
                <div className="frow"><span className="fic" style={{ background: '#DC6038' }}>T</span><span className="fn">demo.pdf</span><span className="fs">2.4MB</span></div>
                <div className="frow"><span className="fic" style={{ background: '#5B6CBE' }}>D</span><span className="fn">Brief.docx</span><span className="fs">810KB</span></div>
              </div>
            </div>
            <div className="b b-wide">
              <div className="bh"><span className="bi">✅</span> Dự án &amp; công việc</div>
              <div className="mini-kanban">
                <div className="kcol"><div className="kt">To Do</div>
                  <div className="kcard"><span className="kdot" style={{ background: '#DC6038' }}></span>Thiết kế hero</div>
                  <div className="kcard"><span className="kdot" style={{ background: '#D29922' }}></span>Viết nội dung</div>
                </div>
                <div className="kcol"><div className="kt">Doing</div>
                  <div className="kcard"><span className="kdot" style={{ background: '#4285F4' }}></span>Dựng landing</div>
                </div>
                <div className="kcol"><div className="kt">Done</div>
                  <div className="kcard"><span className="kdot" style={{ background: '#5BBE7A' }}></span>Chốt bảng màu</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta">
        <div className="container">
          <div className="cta-band">
            <h2>Hợp nhất đội nhóm của bạn ngay hôm nay</h2>
            <p>Nexus hoàn toàn miễn phí — tạo workspace và bắt đầu cộng tác trong vài phút.</p>
            <Link className="btn btn-primary btn-lg" to="/auth/login">Tạo workspace miễn phí →</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="foot">
            <div className="col about">
              <Link className="logo" to="/auth/login"><span className="mark">N</span> Nexus</Link>
              <p>Nền tảng workspace tất cả trong một cho các đội nhóm hiện đại.</p>
            </div>
            <div className="col">
              <h4>Sản phẩm</h4>
              <a href="#features">Tính năng</a>
              <a href="#ai">Nexus AI</a>
              <a href="#workflow">Quy trình</a>
              <Link to="/auth/register">Đăng ký</Link>
            </div>
            <div className="col">
              <h4>Công ty</h4>
              <a href="#">Về chúng tôi</a>
              <a href="#">Blog</a>
              <a href="#">Tuyển dụng</a>
              <a href="#">Liên hệ</a>
            </div>
            <div className="col">
              <h4>Hỗ trợ</h4>
              <a href="#">Tài liệu</a>
              <a href="#">Trạng thái hệ thống</a>
              <a href="#">Điều khoản</a>
              <a href="#">Bảo mật</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Nexus. All rights reserved.</span>
            <span>Made with Phong &amp; Khang</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
