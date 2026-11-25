/* Databeat platform UI layer (MediaMint look: warm cream page, light sidebar, teal brand).
   - left sidebar with grouped pages and the signed-in person at the bottom
   - a team-scoped Summary page, shown first
   - a native Account Scoring page
   - a light theme over every dashboard page
   Loaded after the dashboard's own script. It only reads data through google.script.run (the platform shim),
   so it never writes anything to the sheet. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ helpers */
  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function sum(a) { return a.reduce(function (s, x) { return s + (num(x) || 0); }, 0); }
  function avg(a) { a = a.filter(function (x) { return num(x) !== null; }); return a.length ? sum(a) / a.length : null; }
  function fmt(v, d) { return v === null || v === undefined || !isFinite(v) ? '–' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function signed(v, d) { return v === null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), d); }
  function gs(fn, args) {
    return new Promise(function (ok) {
      try {
        var r = google.script.run.withSuccessHandler(function (x) { ok(x && x.success !== false ? x : null); }).withFailureHandler(function () { ok(null); });
        r[fn].apply(r, args || []);
      } catch (e) { ok(null); }
    });
  }
  function access() { try { return CurrentAccess || null; } catch (e) { return null; } }
  function can(tab) { var a = access(); return !!a && (a.isAdmin || (a.tabs || []).indexOf(tab) !== -1); }
  function band5(v) { return v === null ? 'na' : v >= 4 ? 'good' : v >= 3 ? 'mid' : 'bad'; }
  function pl(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function titleCase(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ------------------------------------------------------------------ theme */
  var font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(font);

  var BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1000' preserveAspectRatio='xMidYMid slice'%3E%3Cpath d='M-4 5L195 -37M-4 5L38 164M-4 5L221 204M38 164L1 340M38 164L192 343M1 340L192 343M1 340L-28 501M1 340L147 461M-28 501L12 690M-28 501L180 631M12 690L180 631M12 690L-37 818M12 690L150 813M-37 818L150 813M-37 818L135 997M-37 1025L135 997M195 -37L221 204M221 204L357 178M192 343L147 461M192 343L352 482M147 461L352 482M147 461L180 631M147 461L400 706M180 631L386 850M150 813L386 850M150 813L135 997M135 997L339 978M350 27L514 -34M350 27L357 178M350 27L557 159M357 178L557 159M357 178L356 346M356 346L565 324M356 346L352 482M356 346L575 528M352 482L575 528M352 482L400 706M400 706L488 643M400 706L386 850M386 850L570 831M386 850L339 978M386 850L577 992M339 978L577 992M514 -34L736 148M557 159L736 148M557 159L565 324M557 159L674 320M565 324L575 528M565 324L753 521M575 528L753 521M575 528L677 646M488 643L677 646M488 643L570 831M488 643L675 798M570 831L675 798M570 831L738 974M577 992L738 974M673 10L894 -4M736 148L861 185M736 148L674 320M736 148L856 345M674 320L856 345M674 320L753 521M674 320L854 494M753 521L854 494M753 521L677 646M677 646L863 648M677 646L675 798M677 646L931 858M675 798L931 858M675 798L738 974M894 -4L1041 -8M894 -4L861 185M894 -4L1099 178M861 185L1099 178M861 185L856 345M861 185L1031 372M856 345L1031 372M856 345L854 494M856 345L1041 481M854 494L863 648M854 494L1091 653M863 648L1048 799M931 858L1048 799M871 1031L1030 1007M1041 -8L1099 178M1041 -8L1233 163M1099 178L1233 163M1099 178L1286 332M1031 372L1286 332M1041 481L1251 529M1041 481L1216 639M1091 653L1216 639M1091 653L1048 799M1091 653L1281 859M1048 799L1281 859M1048 799L1030 1007M1048 799L1222 975M1030 1007L1222 975M1221 8L1395 203M1233 163L1286 332M1233 163L1457 342M1286 332L1457 342M1286 332L1251 529M1286 332L1415 468M1251 529L1415 468M1251 529L1216 639M1216 639L1381 704M1216 639L1281 859M1216 639L1399 850M1281 859L1400 1026M1222 975L1400 1026M1444 35L1609 -17M1444 35L1395 203M1444 35L1571 184M1395 203L1571 184M1395 203L1561 312M1457 342L1561 312M1457 342L1415 468M1415 468L1605 528M1415 468L1610 649M1381 704L1610 649M1381 704L1399 850M1399 850L1638 810M1399 850L1400 1026M1399 850L1556 982M1400 1026L1556 982M1561 312L1605 528M1605 528L1610 649M1610 649L1638 810' fill='none' stroke='%23C9BBA6' stroke-opacity='.20' stroke-width='1'/%3E%3Cg fill='%23C9BBA6' fill-opacity='.38'%3E%3Ccircle cx='-4' cy='5' r='3'/%3E%3Ccircle cx='38' cy='164' r='2.5'/%3E%3Ccircle cx='1' cy='340' r='2'/%3E%3Ccircle cx='-28' cy='501' r='2'/%3E%3Ccircle cx='-37' cy='818' r='3'/%3E%3Ccircle cx='195' cy='-37' r='2'/%3E%3Ccircle cx='221' cy='204' r='2'/%3E%3Ccircle cx='192' cy='343' r='3'/%3E%3Ccircle cx='147' cy='461' r='2.5'/%3E%3Ccircle cx='150' cy='813' r='3'/%3E%3Ccircle cx='350' cy='27' r='3'/%3E%3Ccircle cx='357' cy='178' r='2'/%3E%3Ccircle cx='352' cy='482' r='3'/%3E%3Ccircle cx='339' cy='978' r='2.5'/%3E%3Ccircle cx='557' cy='159' r='2'/%3E%3Ccircle cx='575' cy='528' r='2'/%3E%3Ccircle cx='488' cy='643' r='2.5'/%3E%3Ccircle cx='570' cy='831' r='2.5'/%3E%3Ccircle cx='753' cy='521' r='2'/%3E%3Ccircle cx='675' cy='798' r='3'/%3E%3Ccircle cx='738' cy='974' r='3'/%3E%3Ccircle cx='861' cy='185' r='2.5'/%3E%3Ccircle cx='854' cy='494' r='2.5'/%3E%3Ccircle cx='931' cy='858' r='2'/%3E%3Ccircle cx='871' cy='1031' r='2.5'/%3E%3Ccircle cx='1099' cy='178' r='2'/%3E%3Ccircle cx='1031' cy='372' r='3'/%3E%3Ccircle cx='1091' cy='653' r='3'/%3E%3Ccircle cx='1221' cy='8' r='2'/%3E%3Ccircle cx='1233' cy='163' r='3'/%3E%3Ccircle cx='1286' cy='332' r='2'/%3E%3Ccircle cx='1216' cy='639' r='2.5'/%3E%3Ccircle cx='1281' cy='859' r='2.5'/%3E%3Ccircle cx='1222' cy='975' r='2.5'/%3E%3Ccircle cx='1444' cy='35' r='2.5'/%3E%3Ccircle cx='1395' cy='203' r='2'/%3E%3Ccircle cx='1457' cy='342' r='2.5'/%3E%3Ccircle cx='1415' cy='468' r='2.5'/%3E%3Ccircle cx='1381' cy='704' r='3'/%3E%3Ccircle cx='1399' cy='850' r='3'/%3E%3Ccircle cx='1400' cy='1026' r='2'/%3E%3Ccircle cx='1571' cy='184' r='3'/%3E%3Ccircle cx='1561' cy='312' r='2'/%3E%3Ccircle cx='1605' cy='528' r='2'/%3E%3Ccircle cx='1638' cy='810' r='2'/%3E%3Ccircle cx='1556' cy='982' r='2'/%3E%3C/g%3E%3C/svg%3E\")";
  var css = document.createElement('style');
  css.textContent = [
    ':root{--pv-side:256px;',
    '  --bg:#FBF6F0;--card:#FEFCF9;--panel2:#F5EEE4;--track:#ECE4D8;--ink:#1C2433;--muted:#5A6478;--faint:#8C95A8;',
    '  --brand:#0B807C;--brand-ink:#075E5B;--brand-soft:#DCF0EE;',
    '  --sbbg:#FDFBF8;--sbline:#EDE5D9;--sbtx:#4B5563;--sbhi:#1C2433;--sbsel:#E5EEF0;--sbhover:#F4EEE5;',
    '  --done:#1B7F55;--done-bg:#DDF1E6;--done-s:#3FAE7B;--late:#B03A4A;--late-bg:#FADEE0;--late-s:#E5808B;',
    '  --wait:#8F6110;--wait-bg:#FBEDC8;--wait-s:#E4B243;--prog:#6A4BB4;--prog-bg:#EAE3F8;--prog-s:#A38BDD;--unk:#66707F;--unk-bg:#E7EAF0;--unk-s:#AEB6C4;',
    '  --shadow:0 1px 2px rgba(20,30,50,.05),0 8px 24px rgba(20,30,50,.06);',
    /* the dashboard's own variables, mapped onto the MediaMint palette */
    '  --navy:#1C2433;--navy-2:#2A3346;--line:#E9E0D3;--line-2:#EFE7DB;--mute:#5A6478;--page:#FBF6F0;',
    '  --accent:#0B807C;--accent-dark:#075E5B;--accent-soft:#DCF0EE;--green:#1B7F55;--amber:#B5761A;--red:#B03A4A}',
    'html,body{background:var(--bg) ' + BG + ' center top/cover fixed no-repeat!important;color:var(--ink);font-family:"Inter","Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif!important;-webkit-font-smoothing:antialiased}',
    'body{padding-left:var(--pv-side)}',
    /* a calmer scale: the whole platform at 85% (the size that looked right at 80% browser zoom), desktop only */
    '@media (min-width:1001px){html{zoom:.85}}',
    '.pv-big{font-weight:700!important}.pv-tile .v{font-weight:700!important}',
    '.page{padding:26px 34px 48px!important;background:transparent!important;max-width:none}',

    /* sidebar */
    '.navbar{position:fixed;left:0;top:0;bottom:0;width:var(--pv-side);height:auto!important;flex-direction:column;align-items:stretch;justify-content:flex-start;padding:20px 14px 14px!important;gap:2px!important;overflow-x:hidden;overflow-y:auto;border:0!important;border-right:1px solid var(--sbline)!important;background:var(--sbbg)!important;color:var(--sbtx);z-index:60;scrollbar-width:thin}',
    '.navbar .brand-logo{background:transparent!important;padding:2px 10px!important;margin:0 0 4px!important;justify-content:flex-start;border-radius:0}',
    '.navbar .brand-logo img{height:30px!important}',
    '.pv-brand{padding:12px 10px 16px;margin:0 0 4px;border-bottom:1px solid var(--sbline)}',
    '.pv-brand b{display:block;color:var(--sbhi);font-size:15px;letter-spacing:-.01em}',
    '.pv-brand small{color:var(--muted);font-size:12px}',
    '.navbar .nav-item{height:auto!important;padding:9px 12px!important;gap:12px;font-size:13.5px!important;font-weight:600!important;letter-spacing:0!important;border-radius:10px!important;flex:0 0 auto;color:var(--sbtx)!important;background:transparent!important;box-shadow:none!important;white-space:nowrap}',
    '.navbar .nav-item svg{width:18px;height:18px;flex:0 0 18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.navbar .nav-item:hover{background:var(--sbhover)!important;color:var(--sbhi)!important}',
    '.navbar .nav-item.active{background:var(--sbsel)!important;color:var(--sbhi)!important;box-shadow:inset 3px 0 0 var(--brand)!important;font-weight:700!important}',
    '.navbar .nav-item.active svg{color:var(--brand)}',
    '.pv-group{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin:16px 12px 6px}',
    '.pv-side-foot{margin-top:auto;padding:14px 4px 2px;border-top:1px solid var(--sbline);display:flex;flex-direction:column;gap:10px}',
    '.pv-who{display:flex;align-items:center;gap:10px;min-width:0}',
    '.pv-av{width:36px;height:36px;border-radius:50%;flex:0 0 36px;display:grid;place-items:center;font-weight:800;font-size:13px;background:#FBEBC6;color:#7A5200}',
    '.pv-who div{min-width:0}.pv-who b{display:block;font-size:13px;color:var(--sbhi);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pv-role{display:inline-block;margin-top:3px;padding:1px 9px;border-radius:999px;background:var(--brand-soft);color:var(--brand-ink);font-weight:700;font-size:11px}',
    '.pv-out{border:1px solid var(--line);background:var(--card);color:var(--sbhi);border-radius:10px;padding:8px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}',
    '.pv-out:hover{border-color:var(--brand);color:var(--brand-ink)}',
    '#pvUser,#themeToggle,#signOutBtn,#navNewApp{display:none!important}',
    '.pv-upd{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--muted);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:4px 6px;border-radius:8px}',
    '.pv-upd svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.pv-upd:hover{color:var(--brand-ink);background:var(--sbhover)}.pv-upd.spin svg{animation:pvspin 1s linear infinite}',
    '@keyframes pvspin{to{transform:rotate(360deg)}}',
    /* access control */
    '.pv-acc-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}',
    '.pv-seg{display:inline-flex;background:var(--panel2);border:1px solid var(--line);border-radius:999px;padding:3px}',
    '.pv-seg button{border:0;background:transparent;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;white-space:nowrap}',
    '.pv-seg button.on{background:var(--brand);color:#F4FBFA}',
    '.pv-seg button b{font-weight:700;margin-left:4px;opacity:.85}',
    '.pv-acc-bar input{height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit;font-size:13.5px;background:var(--card);min-width:240px;flex:1;max-width:380px}',
    '.pv-add{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:14px;box-shadow:0 1px 2px rgba(20,30,50,.05)}',
    '.pv-add b{font-size:13.5px;color:var(--ink);margin-right:4px}',
    '.pv-add input{height:36px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit;font-size:13.5px;min-width:260px;background:#fff}',
    '.pv-btn{height:36px;border-radius:10px;border:1px solid var(--brand);background:var(--brand);color:#F4FBFA;font:inherit;font-size:13px;font-weight:700;padding:0 14px;cursor:pointer;white-space:nowrap}',
    '.pv-btn:hover{background:var(--brand-ink)}.pv-btn:disabled{opacity:.45;cursor:default}',
    '.pv-btn.ghost{background:var(--card);color:var(--ink);border-color:var(--line)}.pv-btn.ghost:hover{border-color:var(--brand);color:var(--brand-ink)}',
    '.pv-btn.danger{background:var(--card);color:var(--late);border-color:var(--late-bg)}.pv-btn.danger:hover{border-color:var(--late)}',
    '.pv-btn.sm{height:30px;padding:0 10px;font-size:12.5px}',
    '.pv-acc td,.pv-acc th{padding:10px 10px!important;height:auto!important}',
    '.pv-acc th.tab{white-space:normal!important;width:64px;min-width:58px;font-size:10.5px!important;line-height:1.25;letter-spacing:.03em!important;vertical-align:bottom;padding:10px 4px!important;hyphens:manual}',
    '.pv-acc td.who{text-align:left!important;min-width:220px;white-space:normal!important}',
    '.pv-acc td.who .pv-lv{margin:3px 6px 3px 0;font-size:10.5px;padding:1px 8px}',
    '.pv-acc td.who small{display:block}',
    '.pv-acc td.who b{display:block;font-size:13.5px;color:var(--ink)}.pv-acc td.who small{color:var(--muted);font-size:12px}',
    '.pv-acc tr.dirty td{background:#FFF8E8!important}',
    '.pv-lv.new{background:var(--wait-bg);color:var(--wait)}',
    '.pv-lv{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;white-space:nowrap}',
    '.pv-lv.admin{background:#FBEBC6;color:#7A5200}.pv-lv.core,.pv-lv.director{background:var(--brand-soft);color:var(--brand-ink)}.pv-lv.team{background:var(--prog-bg);color:var(--prog)}.pv-lv.viewer{background:var(--unk-bg);color:var(--unk)}',
    '.pv-acc input[type=checkbox]{width:17px;height:17px;cursor:pointer}',
    '.pv-acc td.act{white-space:nowrap;text-align:right!important;padding-right:14px!important}',
    '.pv-ico{width:30px;height:30px;margin-left:6px;border-radius:9px;border:1px solid var(--line);background:var(--card);color:var(--faint);cursor:pointer;vertical-align:middle;display:inline-grid;place-items:center}',
    '.pv-ico svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}',
    '.pv-ico:hover{color:var(--late);border-color:var(--late-s);background:var(--late-bg)}',
    '.pv-st{font-size:12px;font-weight:600;margin-right:6px}.pv-st.ok{color:var(--done)}.pv-st.err{color:var(--late)}.pv-st.busy{color:var(--muted)}',
    '.pv-help{font-size:12.5px;color:var(--muted);margin:0 0 14px;line-height:1.5}',
    '.pv-frame{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);overflow:hidden}',
    '.pv-frame iframe{display:block;width:100%;height:calc(100vh - 170px);min-height:560px;border:0;background:#fff}',
    '.pv-burger{display:none;position:fixed;left:12px;top:12px;z-index:70;width:42px;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer;box-shadow:var(--shadow);font-size:18px}',
    '.pv-scrim{display:none}',
    '@media (max-width:1000px){body{padding-left:0}.navbar{transform:translateX(-100%);transition:transform .2s ease;box-shadow:0 0 40px rgba(20,30,50,.18)}body.pv-open .navbar{transform:none}.pv-burger{display:block}.page{padding:66px 14px 40px!important}body.pv-open .pv-scrim{display:block;position:fixed;inset:0;background:rgba(28,36,51,.25);z-index:55}}',

    /* the dashboard's own pages in the light theme */
    '.card,.panel,.filter-bar,.info-legend,.lcard{background:var(--card)!important;border:1px solid var(--line)!important;border-radius:14px!important;box-shadow:var(--shadow)!important}',
    '.card-title{background:transparent!important;border-left:0!important;border-bottom:1px solid var(--line)!important;color:var(--ink)!important;font-size:15.5px!important;font-weight:700!important;padding:16px 20px!important;letter-spacing:-.01em!important}',
    'th{background:var(--panel2)!important;color:var(--muted)!important;border-bottom:1px solid var(--line)!important;font-size:11px!important;letter-spacing:.06em!important}',
    'td{border-bottom:1px solid var(--line-2)!important;color:var(--ink)}',
    'tr:hover td{background-color:rgba(245,238,228,.55)}',
    'tr.total-row td{background:var(--brand-soft)!important;border-color:#BFE3DF!important}',
    '.kpi-card{background:var(--card)!important;border:1px solid var(--line)!important;border-radius:12px!important}',
    '.kpi-val{color:var(--ink)!important}',
    '.pills{background:var(--panel2)!important;border:1px solid var(--line)}',
    '.pills button,.pills .pill{border-radius:999px!important}',
    'tbody tr:nth-child(even) td,tbody tr:nth-child(even) td.name-col{background:rgba(245,238,228,.35)}',
    '.group-start{border-left:2px solid var(--line)!important}tr.total-row td.group-start{border-left:2px solid #BFE3DF!important}',
    '.card .filter-bar,.card .panel{box-shadow:none!important;border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;background:transparent!important}',
    '.filter-bar{background:var(--card)!important}',
    'input[type=checkbox],input[type=radio]{accent-color:var(--brand)}',
    '.card{max-width:100%}#adminContainer,.card .scroll{overflow-x:auto}',
    'html,body{overflow-x:hidden}',
    'body>.page-section{padding:0 34px 48px;max-width:none}',
    '.page{padding-bottom:0!important}.page>.page-section{padding-bottom:48px}',
    '@media (max-width:1000px){body>.page-section{padding:66px 14px 40px}}',
    '.pills button[aria-pressed="true"],.pills .active{background:var(--brand)!important;border-color:var(--brand)!important;color:#F4FBFA!important}',
    'select,input[type=search],input[type=text]{border-color:var(--line)!important;border-radius:10px!important;background:var(--card)!important}',
    '.refresh-btn,.guide-btn{background:var(--card)!important;border-color:var(--line)!important;border-radius:10px!important}',
    '.loading{color:var(--muted)}',

    /* summary */
    '.pv-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:0 0 18px}',
    '.pv-top h1{margin:0;font-size:25px;letter-spacing:-.02em;color:var(--ink);line-height:1.2}',
    '.pv-top p{margin:3px 0 0;color:var(--muted);font-size:14px}',
    '.pv-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--card);padding:7px 14px;border-radius:999px;font-size:12.5px;color:var(--muted);box-shadow:0 1px 2px rgba(20,30,50,.04)}',
    '.pv-chip b{color:var(--brand-ink)}',
    '.pv-kicker{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin:6px 0 4px}',
    '.pv-hi{margin:0 0 18px;font-size:19px;font-weight:700;color:var(--ink);letter-spacing:-.01em}',
    '.pv-mods{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:18px}',
    '.pv-mods.c4{grid-template-columns:repeat(4,minmax(0,1fr))}.pv-mods.c2{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '@media (max-width:1280px){.pv-mods.c4{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width:1100px){.pv-mods,.pv-mods.c4{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width:640px){.pv-mods,.pv-mods.c4,.pv-mods.c2{grid-template-columns:1fr}}',
    '.pv-mod{display:flex;flex-direction:column;text-align:left;font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 18px 14px;box-shadow:0 1px 2px rgba(20,30,50,.05);cursor:pointer;transition:box-shadow .15s,transform .15s,border-color .15s;min-height:236px}',
    '.pv-mod:hover{box-shadow:var(--shadow);transform:translateY(-2px);border-color:#D9CDBB}',
    '.pv-mh{display:flex;align-items:center;gap:10px;margin-bottom:14px}',
    '.pv-ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--brand-soft);color:var(--brand-ink);flex:0 0 34px}',
    '.pv-ic svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.pv-mh b{font-size:14.5px;color:var(--ink);line-height:1.25}',
    '.pv-tag{margin-left:auto;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);background:var(--panel2);border-radius:999px;padding:2px 8px;white-space:nowrap}',
    '.pv-big{font-size:32px;font-weight:800;letter-spacing:-.02em;line-height:1.05;color:var(--ink);font-variant-numeric:tabular-nums}',
    '.pv-big small{font-size:14px;font-weight:600;color:var(--muted);margin-left:3px;letter-spacing:0}',
    '.pv-big.good{color:var(--done)}.pv-big.bad{color:var(--late)}',
    '.pv-line{color:var(--muted);font-size:13px;margin:5px 0 12px;min-height:20px}',
    '.pv-line b.up{color:var(--done)}.pv-line b.down{color:var(--late)}',
    '.pv-bar{display:flex;height:8px;border-radius:99px;overflow:hidden;background:var(--track);margin-bottom:12px}',
    '.pv-bar i{display:block;height:100%}',
    '.pv-leg{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12.5px;color:var(--muted);margin:0 0 12px}',
    '.pv-leg span{display:flex;align-items:center;gap:7px;min-width:0}',
    '.pv-leg span em{font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pv-leg i{width:8px;height:8px;border-radius:50%;flex:0 0 8px}',
    '.pv-leg b{margin-left:auto;color:var(--ink);font-variant-numeric:tabular-nums}',
    '.pv-foot{margin-top:auto;padding-top:10px;border-top:1px dashed var(--line);font-size:12px;color:var(--muted)}',
    '.pv-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;align-items:start}',
    '.pv-panel{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(20,30,50,.05);overflow:hidden}',
    '.pv-ph{display:flex;align-items:center;gap:10px;padding:16px 20px 12px}',
    '.pv-ph h3{margin:0;font-size:15.5px;color:var(--ink)}',
    '.pv-ph .pv-link{margin-left:auto}',
    '.pv-pb{padding:0 20px 18px}',
    '.pv-sub{font-size:12.5px;color:var(--muted);margin:0 0 10px}',
    '.pv-link{font-size:12.5px;font-weight:600;color:var(--brand-ink);cursor:pointer;border:0;background:none;padding:0;font-family:inherit}',
    '.pv-link:hover{text-decoration:underline}',
    '.pv-chart{display:flex;align-items:flex-end;gap:8px;height:150px;padding:6px 0 0;border-bottom:1px solid var(--line)}',
    '.pv-chart .b{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}',
    '.pv-chart .b i{display:block;width:100%;max-width:34px;background:#8FCFC9;border-radius:6px 6px 0 0;min-height:2px}',
    '.pv-chart .b:last-child i{background:var(--brand)}',
    '.pv-chart .b em{font-style:normal;font-size:10.5px;color:var(--muted);margin-bottom:4px;font-variant-numeric:tabular-nums}',
    '.pv-axis{display:flex;gap:8px;margin:5px 0 14px}.pv-axis span{flex:1;text-align:center;font-size:10.5px;color:var(--faint)}',
    '.pv-list{list-style:none;margin:0;padding:0}',
    '.pv-list li{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line-2);font-size:13px}',
    '.pv-list li:first-child{border-top:0}',
    '.pv-list .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink)}',
    '.pv-list .n small{color:var(--muted);margin-left:6px;font-size:12px}',
    '.pv-list .x{font-weight:700;font-variant-numeric:tabular-nums;color:var(--ink);min-width:44px;text-align:right}',
    '.pv-list li.go{cursor:pointer}.pv-list li.go:hover .n{color:var(--brand-ink)}',
    '.pv-meter{height:6px;border-radius:99px;background:var(--track);flex:0 0 96px;overflow:hidden}.pv-meter i{display:block;height:100%;border-radius:99px;background:var(--brand)}',
    '.pv-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}',
    '.pv-good{color:var(--done)!important}.pv-mid{color:var(--wait)!important}.pv-bad{color:var(--late)!important}',
    '.pv-empty{color:var(--muted);font-size:13px;padding:4px 0 2px}',
    '.pv-note{font-size:12px;color:var(--faint);margin-top:18px}',
    '.pv-skel{height:236px;border-radius:16px;background:linear-gradient(90deg,var(--panel2),#FBF7F1,var(--panel2));background-size:200% 100%;animation:pvsk 1.2s infinite;border:1px solid var(--line)}',
    '@keyframes pvsk{to{background-position:-200% 0}}',

    /* account scoring */
    '.pv-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:16px}',
    '.pv-tile{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--ts,var(--line));border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(20,30,50,.05)}',
    '.pv-tile .l{font-size:12px;font-weight:700;color:var(--muted)}',
    '.pv-tile .v{font-size:28px;font-weight:800;letter-spacing:-.02em;color:var(--ink);margin:4px 0 2px;font-variant-numeric:tabular-nums}',
    '.pv-tile .v small{font-size:13px;color:var(--muted);font-weight:600;margin-left:3px}',
    '.pv-tile .s{font-size:12px;color:var(--muted)}',
    '.pv-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}',
    '.pv-filters input,.pv-filters select{height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit;font-size:13.5px;background:var(--card);color:var(--ink)}',
    '.pv-filters input{min-width:240px;flex:1;max-width:360px}',
    '.pv-filters input:focus,.pv-filters select:focus{outline:2px solid var(--brand-soft);border-color:var(--brand)}',
    '.pv-scwrap{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);overflow:auto}',
    '.pv-sc{width:100%;border-collapse:collapse}',
    '.pv-sc th{position:sticky;top:0;z-index:1}',
    '.pv-sc td,.pv-sc th{height:auto!important;padding:11px 12px!important}',
    '.pv-sc td.c{font-weight:700;font-variant-numeric:tabular-nums}',
    '.pv-pill{display:inline-block;min-width:46px;padding:3px 8px;border-radius:999px;font-weight:700;font-size:12.5px}',
    '.pv-pill.good{background:var(--done-bg);color:var(--done)}.pv-pill.mid{background:var(--wait-bg);color:var(--wait)}.pv-pill.bad{background:var(--late-bg);color:var(--late)}.pv-pill.na{color:var(--faint)}',
    '.pv-pill.big{font-size:13.5px;min-width:54px}',
    '.pv-sc td.l,.pv-sc th.l{text-align:left!important}',
    '.pv-sc tr.row{cursor:pointer}',
    '.pv-sc tr.row.open td{background:var(--brand-soft)}',
    '.pv-sc tr.hist td{background:var(--panel2);text-align:left;white-space:normal;padding:14px 18px!important}',
    '.pv-sc th.sort{cursor:pointer;user-select:none}.pv-sc th.sort:hover{color:var(--brand-ink)!important}',
    '.pv-hist{display:flex;gap:10px;flex-wrap:wrap}',
    '.pv-hist .h{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:10px 14px;min-width:170px;max-width:320px;font-size:12px;color:var(--muted)}',
    '.pv-hist .h b{display:block;font-size:20px;margin:2px 0 4px}'
  ].join('\n');
  document.head.appendChild(css);

  /* ------------------------------------------------------------------ icons */
  var ICON = {
    summary: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 7h6V4h-6z"/>',
    business: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    billables: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    lead: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
    account: '<path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    utilization: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    aigains: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    csat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    esat: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    hiring: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    performance: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    ld: '<path d="M2 7l10-4 10 4-10 4z"/><path d="M6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9"/>',
    newapp: '<path d="M12 8v4l3 2"/><path d="M3.05 11a9 9 0 1 1 .5 4M3 4v5h5"/>',
    admin: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
    people: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[k] || '') + '</svg>'; }

  /* ------------------------------------------------------------------ sidebar */
  var GROUPS = [
    { label: 'Overview', items: [['navSummary', 'summary'], ['navBusiness', 'business']] },
    { label: 'Delivery', items: [['navAccount', 'account'], ['navLead', 'lead'], ['navBillables', 'billables'], ['navUtilization', 'utilization'], ['navPerformance', 'performance']] },
    { label: 'AI', items: [['navAiGains', 'aigains']] },
    { label: 'People & clients', items: [['navCsat', 'csat'], ['navEsat', 'esat'], ['navHiring', 'hiring'], ['navLd', 'ld']] },
    { label: 'Tools', items: [['navAcctTool', 'tool'], ['navAdmin', 'admin']] }
  ];

  function buildSidebar() {
    var nav = document.querySelector('.navbar');
    if (!nav || nav.dataset.pv) return;
    nav.dataset.pv = '1';
    var summary = document.createElement('div');
    summary.id = 'navSummary'; summary.className = 'nav-item'; summary.textContent = 'Summary';
    summary.onclick = function () { window.showPage('summary'); };
    var tool = document.createElement('div');
    tool.id = 'navAcctTool'; tool.className = 'nav-item'; tool.textContent = 'Account Scoring tool'; tool.style.display = 'none';
    tool.onclick = function () { window.showPage('acctool'); };
    var made = { navSummary: summary, navAcctTool: tool };
    var keep = {};
    GROUPS.forEach(function (g) { g.items.forEach(function (it) { keep[it[0]] = made[it[0]] || $(it[0]); }); });
    var adm = $('navAdmin'); if (adm) adm.textContent = 'Access control';
    var old = $('navNewApp'); if (old && old.parentNode) old.parentNode.removeChild(old);   // Lead SLA is not part of the platform
    if (old) { old.id = 'navNewApp'; old.style.display = 'none'; document.body.appendChild(old); }
    var logo = nav.querySelector('.brand-logo');
    var extras = ['signOutBtn', 'themeToggle'].map($).filter(Boolean);
    nav.innerHTML = '';
    if (logo) nav.appendChild(logo);
    var brand = document.createElement('div'); brand.className = 'pv-brand';
    brand.innerHTML = '<b>Business Dashboard</b><small>DataBeat · team view</small>';
    nav.appendChild(brand);
    GROUPS.forEach(function (g, gi) {
      var h = document.createElement('div'); h.className = 'pv-group'; h.textContent = g.label; h.id = 'pvGroup' + gi;
      nav.appendChild(h);
      g.items.forEach(function (it) {
        var el = keep[it[0]];
        if (!el) return;
        if (!el.querySelector('svg')) el.innerHTML = svg(it[1]) + '<span>' + el.innerHTML + '</span>';
        el.addEventListener('click', function () { document.body.classList.remove('pv-open'); });
        nav.appendChild(el);
      });
    });
    var foot = document.createElement('div'); foot.className = 'pv-side-foot'; foot.id = 'pvSideFoot';
    var upd = document.createElement('button'); upd.type = 'button'; upd.className = 'pv-upd'; upd.id = 'pvUpdate';
    upd.innerHTML = svg('refresh') + '<span>Update from the sheet</span>';
    upd.onclick = updateNow;
    foot.appendChild(upd);
    extras.forEach(function (el) { foot.appendChild(el); });
    nav.appendChild(foot);
    var burger = document.createElement('button'); burger.className = 'pv-burger'; burger.setAttribute('aria-label', 'Menu'); burger.innerHTML = '&#9776;';
    burger.onclick = function () { document.body.classList.toggle('pv-open'); };
    var scrim = document.createElement('div'); scrim.className = 'pv-scrim'; scrim.onclick = function () { document.body.classList.remove('pv-open'); };
    document.body.appendChild(burger); document.body.appendChild(scrim);
    tidyGroups();
  }
  function tidyGroups() {
    GROUPS.forEach(function (g, gi) {
      var h = $('pvGroup' + gi); if (!h) return;
      var any = g.items.some(function (it) { var el = $(it[0]); return el && el.style.display !== 'none'; });
      h.style.display = any ? '' : 'none';
    });
  }
  function roleOf(a) {
    if (!a) return '';
    if (a.isAdmin) return 'Admin';
    return ({ core: 'Core team', director: 'Director', member: 'Team lead', listed: 'Viewer' })[a.level] || 'Member';
  }
  function drawWho() {
    var a = access(), foot = $('pvSideFoot'); if (!a || !foot) return;
    var name = a.name || String(a.email || '').split('@')[0].replace(/[._]/g, ' ');
    var ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
    var box = $('pvWho');
    if (!box) { box = document.createElement('div'); box.id = 'pvWho'; foot.insertBefore(box, foot.firstChild); }
    box.innerHTML = '<div class="pv-who"><span class="pv-av">' + esc(ini) + '</span><div><b title="' + esc(a.email) + '">' + esc(titleCase(name)) + '</b><span class="pv-role">' + esc(roleOf(a)) + '</span></div></div>' +
      (document.getElementById('pvOut') ? '<button class="pv-out" type="button" id="pvSignOut">Sign out</button>' : '');
    var so = $('pvSignOut'); if (so) so.onclick = function () { var o = $('pvOut'); if (o) o.click(); };
  }

  /* ------------------------------------------------------------------ pages */
  function buildPages() {
    var page = document.querySelector('.page');
    if (!page || $('summaryPage')) return;
    var s = document.createElement('div'); s.id = 'summaryPage'; s.className = 'page-section'; s.style.display = 'none';
    var tb = $('mainToolbar');
    page.insertBefore(s, tb ? tb.nextSibling : page.firstChild);
    var ap = $('accountPage');
    if (ap) ap.innerHTML = '<div id="pvAccount"><div class="loading">Loading Account Scoring…</div></div>';
    var t = document.createElement('div'); t.id = 'pvToolPage'; t.className = 'page-section'; t.style.display = 'none';
    page.appendChild(t);
    var ad = $('adminPage');
    if (ad) ad.innerHTML = '<div id="adminContainer"><div class="loading">Loading the access list…</div></div>';
  }

  /* ------------------------------------------------------------------ routing */
  var origShow = window.showPage, origApply = window.applyAccessToNav_, origRefresh = window.refreshCurrentPage;
  var landed = false;
  var CUSTOM = {
    summary: { section: 'summaryPage', nav: 'navSummary', draw: function () { renderSummary(); } },
    acctool: { section: 'pvToolPage', nav: 'navAcctTool', draw: function () { drawTool(); } }
  };
  window.showPage = function (page) {
    if (!landed && access()) { landed = true; page = 'summary'; }
    var own = CUSTOM[page];
    if (own) {
      if (!access() || (own.tab && !can(own.tab))) return;
      try { currentPage = page; } catch (e) {}
      try { aiStopAutoRefresh_(); } catch (e) {}
      document.querySelectorAll('.page-section').forEach(function (el) { el.style.display = el.id === own.section ? 'block' : 'none'; });
      document.querySelectorAll('.navbar .nav-item').forEach(function (el) { el.classList.toggle('active', el.id === own.nav); });
      window.scrollTo(0, 0);
      own.draw();
      return;
    }
    Object.keys(CUSTOM).forEach(function (k) { var c = CUSTOM[k], sec = $(c.section), nv = $(c.nav); if (sec) sec.style.display = 'none'; if (nv) nv.classList.remove('active'); });
    var r = origShow.call(this, page);
    window.scrollTo(0, 0);
    return r;
  };
  window.applyAccessToNav_ = function () {
    var r = origApply.apply(this, arguments);
    try { applyTheme('light'); } catch (e) {}      // the platform uses one light theme
    var sn = $('navSummary'); if (sn) sn.style.display = '';
    var tn = $('navAcctTool'); if (tn) tn.style.display = '';   // everyone on the platform
    tidyGroups();
    drawWho();
    setTimeout(drawWho, 1500);                     // the sign-out control appears a moment later
    return r;
  };
  window.refreshCurrentPage = function () {
    var cp; try { cp = currentPage; } catch (e) {}
    if (cp === 'summary') return renderSummary();
    if (cp === 'account') return window.loadAccountScoring(true);
    if (cp === 'acctool') return drawTool(true);
    if (cp === 'admin') return window.loadAdminPage();
    return origRefresh.apply(this, arguments);
  };

  /* ------------------------------------------------------------------ summary: numbers */
  /* AI: same definition as the AI Gains page. Efficiency = hours saved / (headcount x 40 h x weeks), target 30%. */
  function aiSummary(ai) {
    if (!ai || !ai.rows) return null;
    var weeks = (ai.weeks || []).map(function (w) { return w.key; });
    var rows = ai.rows.filter(function (r) { return !r.inactive; });
    var byWeek = {};
    rows.forEach(function (r) { var w = byWeek[r.week] = byWeek[r.week] || { saved: 0, hours: 0, manual: 0 }; w.saved += (r.saved || 0); w.hours += (r.hours || 0); w.manual += (r.manual || 0); });
    var withData = weeks.filter(function (k) { return byWeek[k]; });
    if (!withData.length) return null;
    var last4 = withData.slice(-4), prev4 = withData.slice(-8, -4);
    function tot(keys, f) { return keys.reduce(function (s, k) { return s + (byWeek[k] ? byWeek[k][f] : 0); }, 0); }
    var months = {}; (ai.roster || []).forEach(function (x) { (months[x.m] = months[x.m] || {})[x.e] = true; });
    var lastMonth = Object.keys(months).sort().pop();
    var heads = lastMonth ? Object.keys(months[lastMonth]).length : 0;
    var emps = {}; rows.forEach(function (r) { if (last4.indexOf(r.week) !== -1 && r.emp) emps[r.emp] = true; });
    if (!heads) heads = Object.keys(emps).length;
    var saved = tot(last4, 'saved'), savedPrev = tot(prev4, 'saved');
    var acc = {}; rows.forEach(function (r) { if (last4.indexOf(r.week) === -1) return; var k = r.client || 'Other'; acc[k] = (acc[k] || 0) + (r.saved || 0); });
    var live = (ai.agents || []).filter(function (a) { return /live/i.test(a.status || ''); });
    return {
      eff: heads ? saved / (heads * 40 * last4.length) * 100 : null,
      effPrev: heads && prev4.length ? savedPrev / (heads * 40 * prev4.length) * 100 : null,
      saved: saved, savedPrev: prev4.length ? savedPrev : null, aiHours: tot(last4, 'hours'), manual: tot(last4, 'manual'),
      heads: heads, using: Object.keys(emps).length, weeks: last4.length, fte: saved / (35 * last4.length),
      chart: withData.slice(-10).map(function (k) { return { k: k, v: byWeek[k].saved }; }),
      top: Object.keys(acc).map(function (k) { return { k: k, v: acc[k] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 5),
      live: live.length
    };
  }
  function accSummary(d) {
    if (!d || !d.accounts) return null;
    var act = d.accounts.filter(function (a) { return !/inactive|closed/i.test(a.status || ''); });
    var list = act.filter(function (a) { return num(a.overall) !== null; });
    var byMgr = {}; list.forEach(function (a) { var m = a.manager || '—'; (byMgr[m] = byMgr[m] || []).push(a.overall); });
    var last = {}; (d.history || []).forEach(function (h) { var k = h.client + '|' + h.project; if (num(h.overall) !== null && (!last[k] || h.date > last[k].date)) last[k] = h; });
    return {
      quarter: d.quarter, n: list.length, unscored: act.length - list.length, avg: avg(list.map(function (a) { return a.overall; })),
      good: list.filter(function (a) { return a.overall >= 4; }).length, mid: list.filter(function (a) { return a.overall >= 3 && a.overall < 4; }).length, bad: list.filter(function (a) { return a.overall < 3; }).length,
      low: list.slice().sort(function (a, b) { return a.overall - b.overall; }).slice(0, 5),
      mgr: Object.keys(byMgr).map(function (m) { return { m: m, v: avg(byMgr[m]), n: byMgr[m].length }; }).sort(function (a, b) { return b.v - a.v; }),
      histAvg: avg(Object.keys(last).map(function (k) { return last[k].overall; }))
    };
  }
  function leadSummary(d) {
    if (!d || !d.rows) return null;
    var per = {}; d.rows.forEach(function (r) { if (num(r.weighted) !== null) (per[r.period] = per[r.period] || []).push(r); });
    var ps = Object.keys(per).sort(); var p = ps[ps.length - 1]; if (!p) return null;
    var rows = per[p], prev = ps.length > 1 ? per[ps[ps.length - 2]] : null;
    var five = function (r) { return r.weighted / 20; };   // weighted is a %; the Lead Scoring page shows it out of 5
    var bands = {}; rows.forEach(function (r) { var b = r.band || 'Not banded'; bands[b] = (bands[b] || 0) + 1; });
    return { period: p, avg: avg(rows.map(five)), prevAvg: prev ? avg(prev.map(five)) : null, n: rows.length, bands: bands,
      support: rows.filter(function (r) { return /needs support/i.test(r.band); }) };
  }
  function latestPeriod(rows, periods, pick) {
    for (var i = 0; i < (periods || []).length; i++) {
      var p = periods[i], vals = rows.map(function (r) { var v = (r.values || []).filter(function (x) { return x.period === p; })[0]; return v ? pick(v) : null; }).filter(function (v) { return num(v) !== null; });
      if (vals.length) return { period: p, avg: avg(vals), vals: vals };
    }
    return null;
  }
  function periodLabel(p) {
    var m = /^(\d{4})-(\d{2})/.exec(String(p || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : String(p || '');
  }
  function weekLabel(k) { var m = /^(\d{4})-W(\d+)$/.exec(k); return m ? 'W' + Number(m[2]) : k; }
  function delta(v, prev, d, unit) {
    if (v === null || prev === null || v === undefined || prev === undefined) return '';
    var x = v - prev; if (Math.abs(x) < Math.pow(10, -(d || 0)) / 2) return ' · <b>no change</b>';
    return ' · <b class="' + (x > 0 ? 'up' : 'down') + '">' + (x > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(x), d) + (unit || '') + '</b>';
  }

  /* ------------------------------------------------------------------ summary: building blocks */
  function go(p) { return 'onclick="showPage(\'' + p + '\')"'; }
  function bar(parts) {
    var t = sum(parts.map(function (p) { return p[1]; }));
    if (!t) return '<div class="pv-bar"></div>';
    return '<div class="pv-bar">' + parts.map(function (p) { return p[1] > 0 ? '<i style="width:' + (p[1] / t * 100) + '%;background:' + p[2] + '"></i>' : ''; }).join('') + '</div>';
  }
  function progress(pct, color) { return '<div class="pv-bar"><i style="width:' + Math.max(0, Math.min(100, pct || 0)) + '%;background:' + (color || 'var(--brand)') + '"></i></div>'; }
  function legend(items) {
    return '<div class="pv-leg">' + items.map(function (x) { return '<span><i style="background:' + x[2] + '"></i><em>' + esc(x[0]) + '</em><b>' + x[1] + '</b></span>'; }).join('') + '</div>';
  }
  function mod(o) {
    return '<button type="button" class="pv-mod" ' + go(o.page) + '><div class="pv-mh"><span class="pv-ic">' + svg(o.icon) + '</span><b>' + esc(o.title) + '</b>' + (o.tag ? '<span class="pv-tag">' + esc(o.tag) + '</span>' : '') + '</div>' +
      '<div class="pv-big' + (o.tone ? ' ' + o.tone : '') + '">' + o.big + '</div><div class="pv-line">' + (o.line || '&nbsp;') + '</div>' + (o.bar || '') + (o.legend || '') +
      '<div class="pv-foot">' + (o.foot || '&nbsp;') + '</div></button>';
  }
  function panel(title, icon, page, body) {
    return '<div class="pv-panel"><div class="pv-ph"><span class="pv-ic">' + svg(icon) + '</span><h3>' + esc(title) + '</h3>' + (page ? '<button class="pv-link" type="button" ' + go(page) + '>Open →</button>' : '') + '</div><div class="pv-pb">' + body + '</div></div>';
  }
  var C = { good: 'var(--done-s)', mid: 'var(--wait-s)', bad: 'var(--late-s)', unk: 'var(--unk-s)', prog: 'var(--prog-s)', brand: 'var(--brand)' };

  /* ------------------------------------------------------------------ summary page */
  var summaryToken = 0;
  function renderSummary() {
    var box = $('summaryPage'); if (!box) return;
    var a = access(); if (!a) return;
    var my = ++summaryToken;
    if (!box.innerHTML) box.innerHTML = header(a) + '<div class="pv-mods">' + '<div class="pv-skel"></div>'.repeat(4) + '</div>';
    var jobs = {
      ai: can('aigains') ? gs('getAiGainsData') : null,
      acc: can('account') ? gs('getAccountScoringData') : null,
      lead: can('lead') ? gs('getScorecardData', ['Monthly']) : null,
      csat: can('csat') ? gs('getCsatData') : null,
      esat: can('esat') ? gs('getEsatData') : null,
      rmg: can('hiring') ? gs('getRmgData') : null,
      perf: can('performance') ? gs('getPerformanceMetricsData') : null,
      bill: can('billables') ? gs('getBillables') : null,
      biz: can('business') && a.seesHeadcount !== false ? gs('getBusinessSummary') : null
    };
    var keys = Object.keys(jobs);
    Promise.all(keys.map(function (k) { return jobs[k]; })).then(function (res) {
      if (my !== summaryToken) return;
      var D = {}; keys.forEach(function (k, i) { D[k] = res[i]; });
      box.innerHTML = summaryHtml(a, D);
    });
  }
  function seesAll(a) { return a.isAdmin || a.seesAll || a.level === 'core' || a.level === 'admin' || a.level === 'listed'; }
  function header(a, scope) {
    var first = titleCase(String(a.name || a.email || '').split(/[\s@._]/)[0]);
    var today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return '<div class="pv-top"><div><h1>Summary</h1><p>Everything at a glance: open a card to see the details</p></div>' + (scope ? '<span class="pv-chip">Showing <b>' + scope + '</b></span>' : '') + '</div>' +
      '<div class="pv-kicker">' + esc(today) + '</div><h2 class="pv-hi">Hi ' + esc(first) + ', here is where things stand</h2>';
  }

  function summaryHtml(a, D) {
    var all = seesAll(a);
    var ai = aiSummary(D.ai), ac = accSummary(D.acc), ld = leadSummary(D.lead);
    var cs = D.csat ? latestPeriod(D.csat.rows || [], D.csat.periods, function (v) { return v.value; }) : null;
    var es = D.esat ? latestPeriod(D.esat.rows || [], D.esat.periods, function (v) { return v.overall; }) : null;
    var pf = D.perf ? latestPeriod(D.perf.rows || [], (D.perf.periods || []).filter(function (p) { return !p.expected; }).map(function (p) { return p.label; }).reverse(), function (v) { return v.value; }) : null;
    var pfx = D.perf ? latestPeriod(D.perf.rows || [], (D.perf.periods || []).filter(function (p) { return p.expected; }).map(function (p) { return p.label; }).reverse(), function (v) { return v.value; }) : null;
    var isClosed = function (r) { return /^(rmg|hr|internal)$/i.test(String(r.resolvedBy || '').trim()); };
    var rmgAll = D.rmg ? (D.rmg.rows || []) : null, rmgOpen = rmgAll ? rmgAll.filter(function (r) { return !isClosed(r); }) : null;
    var biz = D.biz && D.biz.monthlySummary && D.biz.monthlySummary[0];

    var scope = all ? 'the whole company' : 'your team' + (D.ai && D.ai.people ? ' · ' + pl(D.ai.people.length, 'person', 'people') : '') + (ac ? ' · ' + pl(ac.n + ac.unscored, 'account') : '');
    var h = header(a, esc(scope));
    var m = [];

    if (biz) {
      var bp = parseFloat(String(biz.billablePercent)) || null;
      m.push(mod({ page: 'business', icon: 'people', title: 'Headcount', tag: biz.month, big: fmt(biz.totalEmployees, 0), line: 'Billable <b>' + esc(biz.billablePercent) + '</b> of the team',
        bar: bar([['Billable', biz.billableResources, C.good], ['Floater', biz.floater, C.prog], ['Training', biz.training, C.mid], ['Bench', biz.benched, C.bad]]),
        legend: legend([['Billable', fmt(biz.billableResources, 0), C.good], ['Floater', fmt(biz.floater, 0), C.prog], ['Training', fmt(biz.training, 0), C.mid], ['Bench', fmt(biz.benched, 0), C.bad]]),
        foot: 'Core team only' + (bp ? '' : '') }));
    }
    if (ai) {
      m.push(mod({ page: 'aigains', icon: 'aigains', title: 'AI efficiency', tag: 'last ' + (ai.weeks === 1 ? 'week' : ai.weeks + ' wks'), big: fmt(ai.eff, 1) + '<small>%</small>', tone: ai.eff !== null && ai.eff >= 30 ? 'good' : '',
        line: 'Target 30%' + delta(ai.eff, ai.effPrev, 1, ' pts'), bar: progress(ai.eff / 30 * 100, ai.eff >= 30 ? C.good : C.brand),
        legend: legend([['Hours saved', fmt(ai.saved, 0), C.brand], ['FTE saved', fmt(ai.fte, 1), C.good], ['People using', ai.using + ' / ' + ai.heads, C.prog], ['Live agents', fmt(ai.live, 0), C.mid]]),
        foot: 'Hours saved ÷ (headcount × 40 h × weeks)' }));
    }
    if (ac) {
      m.push(mod({ page: 'account', icon: 'account', title: 'Account scoring', tag: ac.quarter, big: fmt(ac.avg, 2) + '<small>/ 5</small>', line: pl(ac.n + ac.unscored, 'account') + ' · average overall',
        bar: bar([['4+', ac.good, C.good], ['3–4', ac.mid, C.mid], ['<3', ac.bad, C.bad], ['n/a', ac.unscored, C.unk]]),
        legend: legend([['4 and above', ac.good, C.good], ['3 to 4', ac.mid, C.mid], ['Below 3', ac.bad, C.bad], ['Not scored', ac.unscored, C.unk]]),
        foot: ac.histAvg !== null ? 'Latest saved history averages ' + fmt(ac.histAvg, 2) : 'From Accounts details' }));
    }
    if (ld) {
      var B = ld.bands, bk = [['Exceptional', C.good], ['Strong', '#7CC7A2'], ['On track', C.brand], ['Developing', C.mid], ['Needs support', C.bad]];
      m.push(mod({ page: 'lead', icon: 'lead', title: 'Lead scoring', tag: periodLabel(ld.period), big: fmt(ld.avg, 2) + '<small>/ 5</small>', line: pl(ld.n, 'lead') + ' scored' + delta(ld.avg, ld.prevAvg, 2),
        bar: bar(bk.map(function (x) { return [x[0], B[x[0]] || 0, x[1]]; })),
        legend: legend([['Strong +', (B.Exceptional || 0) + (B.Strong || 0), C.good], ['On track', B['On track'] || 0, C.brand], ['Developing', B.Developing || 0, C.mid], ['Needs support', B['Needs support'] || 0, C.bad]]),
        foot: 'Monthly weighted score' }));
    }
    if (D.bill && ((D.bill.rows || []).length || (D.bill.overallRows || []).length)) {
      var qOf = function (r, k) { var x = ((r.metrics || {})[k] || []).filter(function (p) { return p.period === 'Overall'; })[0]; return x ? num(x.value) : null; };
      var br = D.bill.rows || [];
      var org = sum(br.map(function (r) { return qOf(r, 'organicGrowth'); })), inorg = sum(br.map(function (r) { return qOf(r, 'inorganicGrowth'); }));
      var lost = sum(br.map(function (r) { return qOf(r, 'actualLoss'); })), exp = sum(br.map(function (r) { return qOf(r, 'expectedLoss'); }));
      var net = (D.bill.overallRows || []).length ? sum(D.bill.overallRows.map(function (r) { return qOf(r, 'overall'); })) : org + inorg - Math.abs(lost);
      m.push(mod({ page: 'billables', icon: 'billables', title: 'Billables gain & loss', tag: 'FY', big: signed(net, 1), tone: net > 0 ? 'good' : net < 0 ? 'bad' : '', line: 'Net billable resources this year',
        bar: bar([['Organic', org, C.good], ['Inorganic', inorg, '#7CC7A2'], ['Lost', Math.abs(lost), C.bad], ['Expected', Math.abs(exp), C.mid]]),
        legend: legend([['Organic growth', fmt(org, 1), C.good], ['Inorganic', fmt(inorg, 1), '#7CC7A2'], ['Actual loss', fmt(Math.abs(lost), 1), C.bad], ['Expected loss', fmt(Math.abs(exp), 1), C.mid]]),
        foot: 'Gains minus losses' }));
    }
    if (cs) {
      var c8 = cs.vals.filter(function (v) { return v >= 8; }).length, c6 = cs.vals.filter(function (v) { return v >= 6 && v < 8; }).length, c0 = cs.vals.filter(function (v) { return v < 6; }).length;
      m.push(mod({ page: 'csat', icon: 'csat', title: 'CSAT', tag: cs.period, big: fmt(cs.avg, 1) + '<small>/ 10</small>', line: pl(cs.vals.length, 'client') + ' rated',
        bar: bar([['8+', c8, C.good], ['6–8', c6, C.mid], ['<6', c0, C.bad]]),
        legend: legend([['8 and above', c8, C.good], ['6 to 8', c6, C.mid], ['Below 6', c0, C.bad], ['Clients', cs.vals.length, C.unk]]), foot: 'Client satisfaction, half-yearly' }));
    }
    if (es) {
      var dir = latestPeriod(D.esat.rows || [], [es.period], function (v) { return v.direct; }), ind = latestPeriod(D.esat.rows || [], [es.period], function (v) { return v.indirect; });
      var e4 = es.vals.filter(function (v) { return v >= 4; }).length, e3 = es.vals.filter(function (v) { return v >= 3 && v < 4; }).length, e0 = es.vals.filter(function (v) { return v < 3; }).length;
      m.push(mod({ page: 'esat', icon: 'esat', title: 'ESAT', tag: es.period, big: fmt(es.avg, 2) + '<small>/ 5</small>', line: pl(es.vals.length, 'manager') + ' · overall score',
        bar: bar([['4+', e4, C.good], ['3–4', e3, C.mid], ['<3', e0, C.bad]]),
        legend: legend([['Direct team', dir ? fmt(dir.avg, 2) : '–', C.brand], ['Indirect team', ind ? fmt(ind.avg, 2) : '–', C.prog], ['4 and above', e4, C.good], ['Below 4', e3 + e0, C.mid]]), foot: 'Employee satisfaction' }));
    }
    if (pf) {
      m.push(mod({ page: 'performance', icon: 'performance', title: 'Performance', tag: pf.period, big: fmt(pf.avg, 2), line: pl(pf.vals.length, 'person', 'people') + ' · average',
        bar: progress(pf.avg / 5 * 100, C.brand),
        legend: legend([['Actual', fmt(pf.avg, 2), C.brand], [pfx ? pfx.period.replace(/^Projected\s*/i, 'Projected ') : 'Projected', pfx ? fmt(pfx.avg, 2) : '–', C.prog]]), foot: 'Performance metrics' }));
    }
    if (rmgOpen) {
      m.push(mod({ page: 'hiring', icon: 'hiring', title: 'RMG requests', tag: 'open', big: fmt(rmgOpen.length, 0), line: rmgAll.length + ' requests in total',
        bar: bar([['Closed', rmgAll.length - rmgOpen.length, C.good], ['Open', rmgOpen.length, C.mid]]),
        legend: legend([['Closed', rmgAll.length - rmgOpen.length, C.good], ['Open', rmgOpen.length, C.mid]]), foot: 'Resource requests' }));
    }
    if (!m.length) return h + '<div class="pv-panel"><div class="pv-pb" style="padding-top:18px"><div class="pv-empty">No pages with data are switched on for you yet. Ask an admin to add them on Access Control.</div></div></div>';
    var cols = m.length % 4 === 0 ? 'c4' : m.length === 2 ? 'c2' : m.length === 1 ? 'c2' : '';
    h += '<div class="pv-mods ' + cols + '">' + m.join('') + '</div><div class="pv-panels">';

    if (ai) {
      var mx = Math.max.apply(null, ai.chart.map(function (c) { return c.v; }).concat([1]));
      var chart = '<div class="pv-chart">' + ai.chart.map(function (c) { return '<div class="b" title="' + esc(c.k) + ': ' + fmt(c.v, 1) + ' h saved"><em>' + fmt(c.v, 0) + '</em><i style="height:' + Math.max(2, c.v / mx * 100) + '%"></i></div>'; }).join('') + '</div>' +
        '<div class="pv-axis">' + ai.chart.map(function (c) { return '<span>' + esc(weekLabel(c.k)) + '</span>'; }).join('') + '</div>';
      var top = ai.top.length ? '<div class="pv-sub">Top accounts by hours saved, last ' + (ai.weeks === 1 ? 'week' : ai.weeks + ' weeks') + '</div><ul class="pv-list">' + ai.top.map(function (x) { return '<li><span class="n">' + esc(x.k) + '</span><span class="pv-meter"><i style="width:' + (x.v / ai.top[0].v * 100) + '%"></i></span><span class="x">' + fmt(x.v, 0) + ' h</span></li>'; }).join('') + '</ul>' : '';
      h += panel('AI hours saved per week', 'aigains', 'aigains', chart + top);
    }
    if (ac) {
      var low = '<div class="pv-sub">Lowest overall scores, ' + esc(ac.quarter || '') + '</div><ul class="pv-list">' + ac.low.map(function (x) {
        return '<li><span class="pv-dot" style="background:' + C[band5(x.overall)] + '"></span><span class="n">' + esc(x.client) + (x.project && x.project !== x.client ? '<small>' + esc(x.project) + '</small>' : '') + '<small>' + esc(x.lead || '') + '</small></span><span class="x pv-' + band5(x.overall) + '">' + fmt(x.overall, 2) + '</span></li>';
      }).join('') + '</ul>';
      var mg = all && ac.mgr.length > 1 ? '<div class="pv-sub" style="margin-top:16px">Average by manager</div><ul class="pv-list">' + ac.mgr.slice(0, 8).map(function (x) {
        return '<li><span class="n">' + esc(x.m) + '<small>' + x.n + '</small></span><span class="pv-meter"><i style="width:' + (x.v / 5 * 100) + '%;background:' + C[band5(x.v)] + '"></i></span><span class="x">' + fmt(x.v, 2) + '</span></li>';
      }).join('') + '</ul>' : '';
      h += panel('Account scoring', 'account', 'account', low + mg);
    }
    var att = [];
    if (ai && ai.eff !== null && ai.eff < 30) att.push(['mid', 'AI efficiency is ' + fmt(ai.eff, 1) + '% against the 30% target', 'aigains']);
    if (ac) ac.low.filter(function (x) { return x.overall < 3; }).forEach(function (x) { att.push(['bad', esc(x.client) + ' · account score ' + fmt(x.overall, 2), 'account']); });
    if (ld) ld.support.slice(0, 5).forEach(function (r) { att.push(['bad', esc(r.person) + ' · needs support (' + fmt(r.weighted / 20, 2) + ')', 'lead']); });
    if (D.csat && cs) (D.csat.rows || []).forEach(function (r) { var v = (r.values || []).filter(function (x) { return x.period === cs.period; })[0]; if (v && num(v.value) !== null && v.value < 7) att.push(['bad', esc(r.client) + ' · CSAT ' + fmt(v.value, 1) + ' / 10', 'csat']); });
    if (rmgOpen && rmgOpen.length) att.push(['mid', rmgOpen.length + ' open RMG request' + (rmgOpen.length === 1 ? '' : 's'), 'hiring']);
    h += panel('Needs attention', 'alert', null, att.length ? '<ul class="pv-list">' + att.slice(0, 12).map(function (x) { return '<li class="go" ' + go(x[2]) + '><span class="pv-dot" style="background:' + C[x[0]] + '"></span><span class="n">' + x[1] + '</span><span class="pv-link">Open →</span></li>'; }).join('') + '</ul>' : '<div class="pv-empty">Nothing is flagged right now.</div>');
    h += '</div><div class="pv-note">A read-only view of the dashboard. It follows the sheet automatically (about every 10 minutes); nothing here changes the sheet.</div>';
    return h;
  }

  /* ------------------------------------------------------------------ account scoring page */
  var AS = { data: null, f: { q: '', mgr: '', lead: '', type: '', band: '' }, sort: { k: 'overall', dir: -1 }, open: {} };
  window.loadAccountScoring = function (force) {
    if (AS.data && !force) return drawAccount(true);
    var box = $('pvAccount'); if (box && !AS.data) box.innerHTML = '<div class="loading">Loading Account Scoring…</div>';
    gs('getAccountScoringData').then(function (d) {
      AS.data = d;
      if (!d) { $('pvAccount').innerHTML = '<div class="pv-panel"><div class="pv-pb" style="padding-top:18px"><div class="pv-empty">Account Scoring could not be read. It is prepared from the sheet; try again in a few minutes.</div></div></div>'; return; }
      drawAccount(true);
    });
  };
  function opts(list, cur, label) {
    var u = {}; list.forEach(function (x) { if (x) u[x] = true; });
    return '<option value="">' + esc(label) + '</option>' + Object.keys(u).sort().map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  }
  function pill(v, big) { var b = band5(v); return '<span class="pv-pill ' + b + (big ? ' big' : '') + '">' + (v === null ? '–' : fmt(v, 2)) + '</span>'; }
  function tile(label, value, sub, tone) { return '<div class="pv-tile" style="--ts:' + (tone || 'var(--line)') + '"><div class="l">' + esc(label) + '</div><div class="v">' + value + '</div><div class="s">' + (sub || '&nbsp;') + '</div></div>'; }
  function drawAccount(fresh) {
    var box = $('pvAccount'); if (!box || !AS.data) return;
    var d = AS.data, A = d.accounts || [];
    if (fresh || !$('pvAsTable')) {
      box.innerHTML = '<div class="pv-top"><div><h1>Account Scoring</h1><p>Scores out of 5 for the accounts you can see · ' + esc(d.quarter || '') + '. Click an account for its history.</p></div></div>' +
        '<div class="pv-tiles" id="pvAsKpis"></div>' +
        '<div class="pv-filters"><input id="pvAsQ" type="search" placeholder="Search client, project or lead" value="' + esc(AS.f.q) + '">' +
        '<select id="pvAsMgr">' + opts(A.map(function (a) { return a.manager; }), AS.f.mgr, 'All managers') + '</select>' +
        '<select id="pvAsLead">' + opts(A.map(function (a) { return a.lead; }), AS.f.lead, 'All leads') + '</select>' +
        '<select id="pvAsType">' + opts(A.map(function (a) { return a.type; }), AS.f.type, 'All types') + '</select>' +
        '<select id="pvAsBand"><option value="">All scores</option><option value="good">4 and above</option><option value="mid">3 to 4</option><option value="bad">Below 3</option></select></div>' +
        '<div class="pv-scwrap"><table class="pv-sc" id="pvAsTable"></table></div>';
      $('pvAsBand').value = AS.f.band;
      [['pvAsQ', 'q', 'input'], ['pvAsMgr', 'mgr', 'change'], ['pvAsLead', 'lead', 'change'], ['pvAsType', 'type', 'change'], ['pvAsBand', 'band', 'change']].forEach(function (x) {
        $(x[0]).addEventListener(x[2], function (e) { AS.f[x[1]] = e.target.value; drawAccount(); });
      });
    }
    var q = AS.f.q.trim().toLowerCase();
    var rows = A.filter(function (a) {
      if (AS.f.mgr && a.manager !== AS.f.mgr) return false;
      if (AS.f.lead && a.lead !== AS.f.lead) return false;
      if (AS.f.type && a.type !== AS.f.type) return false;
      if (AS.f.band && band5(num(a.overall)) !== AS.f.band) return false;
      return !q || [a.client, a.project, a.lead, a.manager].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    var P = d.params || [], k = AS.sort.k, dir = AS.sort.dir;
    function val(x) { return k === 'overall' ? x.overall : P.indexOf(k) !== -1 ? (x.scores || {})[k] : x[k]; }
    rows.sort(function (x, y) {
      var a = val(x), b = val(y);
      if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1;
      return (typeof a === 'number' ? a - b : String(a).localeCompare(String(b))) * dir;
    });
    var ov = rows.map(function (a) { return num(a.overall); }).filter(function (v) { return v !== null; });
    $('pvAsKpis').innerHTML =
      tile('Accounts', fmt(rows.length, 0), A.length !== rows.length ? 'of ' + A.length + ' (filtered)' : 'all you can see', 'var(--brand)') +
      tile('Average overall', fmt(avg(ov), 2) + '<small>/ 5</small>', esc(d.quarter || ''), 'var(--prog-s)') +
      tile('4 and above', fmt(ov.filter(function (v) { return v >= 4; }).length, 0), 'strong accounts', 'var(--done-s)') +
      tile('3 to 4', fmt(ov.filter(function (v) { return v >= 3 && v < 4; }).length, 0), 'on the way', 'var(--wait-s)') +
      tile('Below 3', fmt(ov.filter(function (v) { return v < 3; }).length, 0), 'need attention', 'var(--late-s)');
    function th(key, label, cls) { var on = AS.sort.k === key; return '<th class="sort ' + (cls || '') + '" data-k="' + esc(key) + '">' + esc(label) + (on ? (AS.sort.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>'; }
    var head = '<thead><tr>' + th('client', 'Client / project', 'l') + th('lead', 'Lead', 'l') + th('manager', 'Manager', 'l') + P.map(function (p) { return th(p, p); }).join('') + th('overall', 'Overall') + '</tr></thead>';
    var hist = {}; (d.history || []).forEach(function (h) { (hist[h.client + '|' + h.project] = hist[h.client + '|' + h.project] || []).push(h); });
    var cols = P.length + 4;
    var body = rows.map(function (a) {
      var id = a.client + '|' + a.project;
      var tr = '<tr class="row' + (AS.open[id] ? ' open' : '') + '" data-id="' + esc(id) + '"><td class="l"><b>' + esc(a.client) + '</b>' + (a.project && a.project !== a.client ? '<div style="font-size:12px;color:var(--muted)">' + esc(a.project) + '</div>' : '') + '</td><td class="l">' + esc(a.lead || '–') + '</td><td class="l">' + esc(a.manager || '–') + '</td>' +
        P.map(function (p) { return '<td class="c">' + pill(num((a.scores || {})[p])) + '</td>'; }).join('') + '<td class="c">' + pill(num(a.overall), true) + '</td></tr>';
      if (AS.open[id]) {
        var hs = (hist[id] || []).slice().sort(function (x, y) { return String(x.date).localeCompare(String(y.date)); });
        tr += '<tr class="hist"><td colspan="' + cols + '">' + (hs.length ? '<div class="pv-hist">' + hs.map(function (h) {
          return '<div class="h">' + esc(h.period) + ' · ' + esc(h.date) + '<b class="pv-' + band5(num(h.overall)) + '">' + (num(h.overall) === null ? '–' : fmt(h.overall, 2)) + '</b>' +
            Object.keys(h.parts || {}).filter(function (k) { return num(h.parts[k]) !== null; }).map(function (k) { return esc(k) + ' ' + fmt(h.parts[k], 1); }).join(' · ') + '</div>';
        }).join('') + '</div>' : '<span class="pv-empty">No scoring history saved for this account yet.</span>') + '</td></tr>';
      }
      return tr;
    }).join('');
    var t = $('pvAsTable');
    t.innerHTML = head + '<tbody>' + (body || '<tr><td colspan="' + cols + '" class="pv-empty">No accounts match.</td></tr>') + '</tbody>';
    t.querySelectorAll('th.sort').forEach(function (el) { el.onclick = function () { var kk = el.getAttribute('data-k'); if (AS.sort.k === kk) AS.sort.dir *= -1; else { AS.sort.k = kk; AS.sort.dir = (kk === 'overall' || P.indexOf(kk) !== -1) ? -1 : 1; } drawAccount(); }; });
    t.querySelectorAll('tr.row').forEach(function (el) { el.onclick = function () { var id = el.getAttribute('data-id'); AS.open[id] = !AS.open[id]; drawAccount(); }; });
  }

  /* ------------------------------------------------------------------ update from the sheet */
  function updateNow() {
    var b = $('pvUpdate'); if (!b || b.classList.contains('spin')) return;
    b.classList.add('spin'); b.querySelector('span').textContent = 'Updating…';
    var done = function (msg) { b.classList.remove('spin'); b.querySelector('span').textContent = msg; setTimeout(function () { b.querySelector('span').textContent = 'Update from the sheet'; }, 4000); };
    (window.platformUpdateNow ? window.platformUpdateNow() : Promise.resolve({ ok: true })).then(function (r) {
      AS.data = null;
      done(r && r.queued ? 'Queued · about a minute' : 'Up to date');
      setTimeout(function () { try { window.refreshCurrentPage(); } catch (e) {} }, 1500);
    }, function () { done('Could not update'); });
  }

  /* ------------------------------------------------------------------ Account Scoring tool (the scoring app itself) */
  /** The Account Scoring app (its own Apps Script). Open to everyone who can sign in to the platform; the app checks its own access. */
  var ACCOUNT_TOOL_URL = 'https://script.google.com/a/macros/databeat.io/s/AKfycbwEDZ09Gnv1NKgxHqFKRGIPbdTwaNgVou1ycjZU80DafRGhS8Q3bL556dqLo3GkP2ix-g/exec';
  function toolUrl() { return ACCOUNT_TOOL_URL; }
  function drawTool(reload) {
    var box = $('pvToolPage'); if (!box) return;
    var url = toolUrl();
    if (!box.innerHTML || reload) {
      box.innerHTML = '<div class="pv-top"><div><h1>Account Scoring tool</h1><p>The scoring app that fills the Account Scoring sheet. It opens with your own Google account.</p></div>' +
        '<a class="pv-btn ghost" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none" href="' + esc(url) + '" target="_blank" rel="noopener">' + svg('external').replace('<svg ', '<svg style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2" ') + 'Open in a new tab</a></div>' +
        '<div class="pv-frame"><iframe title="Account Scoring tool" src="' + esc(url) + '"></iframe></div>' +
        '<div class="pv-note">If the tool does not appear above, sign in to Google in this browser with your databeat.io account, or use "Open in a new tab".</div>';
    }
  }

  /* ------------------------------------------------------------------ Access control (Admin) */
  var AC = { data: null, view: 'listed', q: '', status: {}, dirty: {} };
  var LEVEL = { admin: 'Admin', core: 'Core team', director: 'Director', team: 'Team lead', viewer: 'Shared / partner' };
  function acTabs() { return ((AC.data && AC.data.tabs) || []).filter(function (t) { return t.id !== 'newapp'; }); }
  function acRows() {
    var d = AC.data || {}, q = AC.q.trim().toLowerCase();
    var list = d.users || [];   // exactly the Access Control tab
    return list.filter(function (u) { return !q || [u.email, u.name, u.role, u.manager].join(' ').toLowerCase().indexOf(q) !== -1; })
      .sort(function (a, b) { return (b.isAdmin - a.isAdmin) || String(a.name || a.email).localeCompare(String(b.name || b.email)); });
  }
  window.loadAdminPage = function () {
    var box = $('adminContainer'); if (!box) return;
    if (!AC.data) box.innerHTML = '<div class="loading">Loading the access list…</div>';
    google.script.run.withSuccessHandler(function (d) {
      if (!d || d.success === false) { box.innerHTML = '<div class="pv-panel"><div class="pv-pb" style="padding-top:18px"><div class="pv-empty">' + esc((d && d.error) || 'Could not load the access list.') + '</div></div></div>'; return; }
      AC.data = d; AC.dirty = {};
      drawAdmin();
    }).withFailureHandler(function (e) { box.innerHTML = '<div class="pv-panel"><div class="pv-pb" style="padding-top:18px"><div class="pv-empty">' + esc(e.message || e) + '</div></div></div>'; }).getAccessAdminData();
  };
  function drawAdmin() {
    var box = $('adminContainer'), d = AC.data; if (!box || !d) return;
    var users = d.users || [], sug = d.suggested || [], T = acTabs();
    var count = function (lv) { return users.filter(function (u) { return u.level === lv; }).length; };
    var h = '<div class="pv-top"><div><h1>Access control</h1><p>Tick the pages each person may open, then Save. Changes reach the platform and the Apps Script dashboard together (the Access Control tab).</p></div></div>' +
      '<div class="pv-tiles">' + tile('On the access list', fmt(users.length, 0), 'people with a row on Access Control', 'var(--brand)') +
      tile('Admins', fmt(count('admin'), 0), 'can change access', '#E4B243') +
      tile('Core team', fmt(count('core') + count('director'), 0), 'see everything', 'var(--done-s)') +
      tile('Team leads', fmt(count('team'), 0), 'see only their own team', 'var(--prog-s)') +
      tile('Shared / partner', fmt(count('viewer'), 0), 'ticked pages, no headcount', 'var(--unk-s)') + '</div>' +
      '<div class="pv-add"><b>Add someone</b><input id="pvAccNew" type="email" placeholder="name@databeat.io"><button class="pv-btn" id="pvAccAdd" type="button">Add</button>' +
      '<span class="pv-help" style="margin:0">They are added to the Access Control tab with no pages; then tick their pages and Save.</span></div>' +
      '<div class="pv-acc-bar"><input id="pvAccQ" type="search" placeholder="Search name, e-mail, role or manager" value="' + esc(AC.q) + '"></div>' +
      '<div class="pv-scwrap"><table class="pv-sc pv-acc" id="pvAccTable"></table></div>' +
      '<div class="pv-note">Admins see every page and this one. Core team see everything on the pages ticked for them, including the Business Summary headcount. Team leads see only themselves, everyone under them in the Roster and their accounts. "Shared / partner" addresses see the ticked pages but never the headcount.</div>';
    box.innerHTML = h;
    $('pvAccQ').addEventListener('input', function (e) { AC.q = e.target.value; drawAdminTable(); });
    $('pvAccAdd').onclick = function () {
      var em = String($('pvAccNew').value || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { $('pvAccNew').focus(); return; }
      var ex = (AC.data.users || []).concat(AC.data.suggested || []).filter(function (u) { return u.email.toLowerCase() === em; })[0];
      if (ex) { AC.q = em; drawAdmin(); return; }
      saveRow({ email: em, isAdmin: false, tabs: {}, listed: false, name: '', level: 'viewer' }, false, []);
    };
    drawAdminTable();
  }
  function drawAdminTable() {
    var t = $('pvAccTable'); if (!t) return;
    var T = acTabs(), rows = acRows();
    var SHORT = { business: 'Business summary', billables: 'Billables', lead: 'Lead scoring', account: 'Account scoring', csat: 'CSAT', esat: 'ESAT', hiring: 'RMG', performance: 'Perfor&shy;mance', aigains: 'AI Gains', utilization: 'Utiliz&shy;ation', ld: 'L&amp;D' };
    var head = '<thead><tr><th class="l">Person</th><th class="tab">Admin</th>' + T.map(function (x) { return '<th class="tab" title="' + esc(x.label) + '">' + (SHORT[x.id] || esc(x.label)) + '</th>'; }).join('') + '<th></th></tr></thead>';
    var body = rows.map(function (u) {
      var id = u.email.toLowerCase(), st = AC.status[id] || {}, dirty = AC.dirty[id];
      var sub = [u.role, u.manager ? 'under ' + u.manager : ''].filter(Boolean).join(' · ');
      return '<tr data-e="' + esc(id) + '" class="' + (u.listed ? '' : 'new ') + (dirty ? 'dirty' : '') + '">' +
        '<td class="who"><b>' + esc(u.name || u.email) + '</b><span class="pv-lv ' + esc(u.level || 'viewer') + '">' + esc(LEVEL[u.level] || 'Member') + '</span>' + (u.listed ? '' : '<span class="pv-lv new">not added</span>') + '<small>' + esc(u.name ? u.email : '') + (sub ? (u.name ? ' · ' : '') + esc(sub) : '') + '</small></td>' +
        '<td><input type="checkbox" data-k="__admin"' + ((dirty ? dirty.isAdmin : u.isAdmin) ? ' checked' : '') + '></td>' +
        T.map(function (x) { var on = dirty ? dirty.tabs[x.id] : (u.tabs || {})[x.id]; return '<td><input type="checkbox" data-k="' + esc(x.id) + '"' + (on ? ' checked' : '') + '></td>'; }).join('') +
        '<td class="act">' + (st.msg ? '<span class="pv-st ' + st.cls + '">' + esc(st.msg) + '</span>' : '') +
        (u.listed ? '<button class="pv-btn sm" data-a="save"' + (dirty ? '' : ' disabled') + '>Save</button><button class="pv-ico" data-a="remove" title="Remove all access" aria-label="Remove all access"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg></button>'
                  : '<button class="pv-btn sm" data-a="save"' + (dirty ? '' : ' disabled') + '>Give access</button>') + '</td></tr>';
    }).join('');
    t.innerHTML = head + '<tbody>' + (body || '<tr><td colspan="' + (T.length + 3) + '" class="pv-empty">' + 'No one matches.' + '</td></tr>') + '</tbody>';
    t.querySelectorAll('tr[data-e]').forEach(function (tr) {
      var id = tr.getAttribute('data-e');
      var u = (AC.data.users || []).concat(AC.data.suggested || []).filter(function (x) { return x.email.toLowerCase() === id; })[0];
      tr.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        cb.onchange = function () {
          var d = AC.dirty[id] || { isAdmin: !!u.isAdmin, tabs: Object.assign({}, u.tabs || {}) };
          if (cb.getAttribute('data-k') === '__admin') d.isAdmin = cb.checked; else d.tabs[cb.getAttribute('data-k')] = cb.checked;
          var same = d.isAdmin === !!u.isAdmin && Object.keys(d.tabs).every(function (k) { return !!d.tabs[k] === !!(u.tabs || {})[k]; });
          if (same && u.listed) delete AC.dirty[id]; else AC.dirty[id] = d;
          delete AC.status[id];
          drawAdminTable();
        };
      });
      tr.querySelectorAll('button[data-a]').forEach(function (b) {
        b.onclick = function () {
          if (b.getAttribute('data-a') === 'remove') {
            if (!window.confirm('Remove all access for ' + (u.name || u.email) + '? They will no longer be able to open the platform or the dashboard.')) return;
            AC.status[id] = { msg: 'Removing…', cls: 'busy' }; drawAdminTable();
            google.script.run.withSuccessHandler(function (r) { done(id, r, 'Removed'); }).withFailureHandler(function (e) { done(id, { success: false, error: e.message }); }).removeAccessUser(u.email);
            return;
          }
          var d = AC.dirty[id] || { isAdmin: !!u.isAdmin, tabs: Object.assign({}, u.tabs || {}) };
          var ids = Object.keys(d.tabs).filter(function (k) { return d.tabs[k]; });
          if ((u.tabs || {}).newapp && ids.indexOf('newapp') === -1) ids.push('newapp');   // keep a column the platform does not show
          saveRow(u, d.isAdmin, ids);
        };
      });
    });
  }
  function saveRow(u, isAdmin, ids) {
    var id = u.email.toLowerCase();
    AC.status[id] = { msg: 'Saving…', cls: 'busy' }; drawAdminTable();
    google.script.run.withSuccessHandler(function (r) {
      if (r && r.success !== false && !u.listed) AC.q = id;   // show the person just added
      done(id, r, u.listed ? 'Saved' : 'Access given');
    }).withFailureHandler(function (e) { done(id, { success: false, error: e.message }); }).saveAccessUser(u.email, !!isAdmin, ids);
  }
  function done(id, r, okMsg) {
    if (!r || r.success === false) { AC.status[id] = { msg: (r && r.error) || 'Could not save', cls: 'err' }; drawAdminTable(); return; }
    AC.status[id] = { msg: okMsg + ' ✓', cls: 'ok' };
    delete AC.dirty[id];
    window.loadAdminPage();
    setTimeout(function () { if (AC.status[id] && AC.status[id].cls === 'ok') { delete AC.status[id]; drawAdminTable(); } }, 5000);
  }

  /* ------------------------------------------------------------------ start */
  function init() { buildSidebar(); buildPages(); }
  init();   // this file is loaded at the end of <body>, so the navbar and the pages already exist
})();
