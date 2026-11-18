// Eu Delegado — app de estudos (PWA). Estado em localStorage, espelhado em /api/state quando servido por serve.js.
const KEY = "eu-delegado-v2";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let NOW = () => new Date();

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isWk = (d) => d.getDay() >= 1 && d.getDay() <= 5;
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const fmt = (d) => `${DIAS[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const NOME = (id) => (DISCIPLINAS.find((d) => d.id === id) || {}).nome || id;

// ---------- Estado ----------
const fresh = () => ({ v: 2, start: PLANO_INICIO, step: 1, hora: "08:00", ptr: 0, days: {}, errors: [], perdidos: [], banco: { done: {} }, updatedAt: 0 });
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 2) { s.banco ||= { done: {} }; return s; } } catch (e) {}
  return fresh();
}
let S = load();
let syncOk = null, pushT;
function save() {
  S.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  clearTimeout(pushT);
  pushT = setTimeout(() => fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(S) })
    .then((r) => { syncOk = r.ok; }).catch(() => { syncOk = false; }), 800);
}
async function pull() {
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (!r.ok) throw 0;
    const s = await r.json(); syncOk = true;
    if (s && s.v === 2 && (s.updatedAt || 0) > (S.updatedAt || 0)) { S = s; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} render(); }
    else if ((S.updatedAt || 0) > ((s && s.updatedAt) || 0)) save();
  } catch (e) { syncOk = false; }
}
const EMPTY = { tasks: {}, entries: [] };
const peek = (k) => S.days[k] || EMPTY;              // leitura sem criar registro
const day = (k) => (S.days[k] ||= { tasks: {}, entries: [] });
const qDone = (k) => peek(k).entries.reduce((a, e) => a + e.n, 0);

// ---------- Ciclo por bloco cumprido ----------
// S.ptr = disciplina do primeiro dia ainda não cumprido. Dia perdido não avança o ponteiro: o bloco perdido volta primeiro.
function discIdxFor(d) {
  const k = iso(d), t = NOW(), tk = iso(t), st = peek(k);
  if (st.disc != null) return st.disc;
  if (k <= tk) return S.ptr % DISCIPLINAS.length;
  let w = 0; for (let x = addDays(t, 1); iso(x) <= k; x = addDays(x, 1)) if (isWk(x)) w++;
  const base = isWk(t) && !peek(tk).advanced ? S.ptr + 1 : S.ptr;
  return (base + Math.max(w - 1, 0)) % DISCIPLINAS.length;
}
const discFor = (d) => DISCIPLINAS[discIdxFor(d)];
function nextBlockDisc(t) {
  const adv = peek(iso(t)).advanced;
  return DISCIPLINAS[((isWk(t) && !adv ? S.ptr + 1 : S.ptr)) % DISCIPLINAS.length];
}

// Material exato do dia: o n-ésimo documento da disciplina, onde n = dias já cumpridos nela. Passou do último, repete o último.
function materialDoDia(discId) {
  const lista = MATERIAL[discId]; if (!lista || !lista.length) return null;
  const feitos = Object.values(S.days).filter((d) => d.advanced && d.disc != null && DISCIPLINAS[d.disc] && DISCIPLINAS[d.disc].id === discId).length;
  return lista[Math.min(feitos, lista.length - 1)];
}

// ---------- Orçamento de tempo ----------
const modoOf = (k) => peek(k).modo || "cheio";
function tempo(modo) {
  const b = { ...TEMPO[modo] }, ex = DEGRAUS[S.step - 1].extra;
  if (modo === "cheio") { b.quest += ex; b.meta = DEGRAUS[S.step - 1].meta; }
  b.total = b.quest + b.erros + b.ler + b.oral;
  return b;
}

// ---------- Erros e arguição oral (revisão 1 · 7 · 30 dias) ----------
function dueErrors(d) {
  const tk = iso(d), out = [];
  for (const e of S.errors) {
    if (e.seen === tk) continue;
    for (const off of [1, 7, 30]) {
      if (!e.done[off] && iso(addDays(parse(e.date), off)) <= tk) { out.push({ e, off }); break; }
    }
  }
  return out.sort((a, b) => a.e.date.localeCompare(b.e.date)).slice(0, 5);   // teto de 5 por dia = cabe nos 15 min
}

function tasksFor(k) {
  const dd = peek(k), disc = DISCIPLINAS[dd.disc ?? S.ptr % DISCIPLINAS.length], modo = modoOf(k), T = tempo(modo);
  const l = [{ id: "quest", t: `Questões no TEC: ${disc.nome}`, min: T.quest, q: T.meta,
    d: `Mínimo ${T.meta} para fechar o dia. Sem consulta; marque “?” nos chutes.`, url: tecUrl(disc.id), link: (tecCaderno(disc.id) || {}).nome ? "Abrir: " + tecCaderno(disc.id).nome : "Abrir cadernos do TEC" },
  { id: "erros", t: "Registrar cada erro (tema, regra, causa)", min: T.erros, d: "Uma linha por erro. É o combustível do áudio e da arguição.", url: ERROS_DOC[disc.id] ? DOC(ERROS_DOC[disc.id]) : PASTA_EUD, link: `Abrir Caderno de erros — ${disc.nome}` }];
  if (T.ler) { const m = materialDoDia(disc.id); l.push({ id: "ler", t: `Ler: ${m ? m[0] : "resumo da banca (" + disc.nome + ")"}`, min: T.ler, d: "Leia ativamente, depois feche e reconstrua de memória. Só os trechos ligados aos erros.", url: m ? DOC(m[1]) : disc.banca, link: "Abrir o material de hoje" }); }
  const due = dueErrors(parse(k));
  l.push({ id: "oral", t: due.length ? `Arguição oral: ${due.length} item(ns) dos seus erros` : "Arguição oral: nada vencendo hoje", min: T.oral, auto: !due.length, d: "Diga a regra em voz alta antes de ver a resposta." });
  return l;
}
const taskDone = (t, k) => (t.q ? qDone(k) >= t.q : t.auto || !!peek(k).tasks[t.id]);
const dayComplete = (k) => tasksFor(k).every((t) => taskDone(t, k));

function streak(today) {
  let n = 0, x = new Date(today);
  if (isWk(x) && !dayComplete(iso(x))) x = addDays(x, -1);
  for (let i = 0; i < 400; i++) {
    if (!isWk(x)) { x = addDays(x, -1); continue; }
    const k = iso(x);
    if (k < S.start || !peek(k).advanced) break;
    n++; x = addDays(x, -1);
  }
  return n;
}
function weekQ(today) {
  const mon = addDays(today, -((today.getDay() + 6) % 7)); let n = 0;
  for (let i = 0; i < 7; i++) n += qDone(iso(addDays(mon, i)));
  return n;
}
function perDisc() {
  const r = {};
  for (const dd of Object.values(S.days)) for (const e of dd.entries) { const o = (r[e.disc] ||= { n: 0, h: 0 }); o.n += e.n; o.h += e.h; }
  return r;
}

// ---------- Áudio dos meus erros ----------
function roteiro(d) {
  const tk = iso(d), recent = S.errors.filter((e) => e.date >= iso(addDays(d, -3)));
  const due = dueErrors(d).map((x) => x.e), seen = new Set(), itens = [];
  for (const e of [...recent, ...due]) if (!seen.has(e.id)) { seen.add(e.id); itens.push(e); }
  let words = 0; const partes = [];
  for (const e of itens) {
    const p = `${NOME(e.disc)}. ${e.tema}. Regra correta: ${e.regra}. ${e.tipo === "B" ? "Atenção: esta é a posição que a banca costuma adotar. " : ""}Você errou por: ${CAUSAS[e.causa] || e.causa}.`;
    const w = p.split(/\s+/).length;
    if (words + w > 1300) break;                 // ~10 min de fala
    words += w; partes.push(p);
  }
  return { texto: partes.join("\n\n"), n: partes.length, min: Math.max(1, Math.round(words / 130)) };
}
function falar(texto) {
  if (!("speechSynthesis" in window)) return alert("Seu navegador não tem leitura em voz alta. Copie o roteiro.");
  speechSynthesis.cancel();
  const voz = speechSynthesis.getVoices().find((v) => /pt-BR/i.test(v.lang));
  texto.split("\n\n").forEach((p) => { const u = new SpeechSynthesisUtterance(p); u.lang = "pt-BR"; if (voz) u.voice = voz; u.rate = 1; speechSynthesis.speak(u); });
}

// ---------- Telas ----------
let tab = "hoje", oralShow = false;

function renderLock() {
  const t = NOW(), k = iso(t), need = isWk(t) && !dayComplete(k), el = $("#lock");
  el.className = "lock " + (need ? "on" : "off");
  el.textContent = need ? "🔒 meta pendente" : "🔓 meta cumprida";
}

function viewHoje() {
  const t = NOW(), k = iso(t);
  if (!isWk(t)) {
    const r = roteiro(t);
    return `<h2>${fmt(t)}</h2><div class="card"><b>Fim de semana: sem bloco obrigatório.</b>
      <p class="mut">Domingo: 20 min para abrir a agenda e conferir os blocos da semana. Se quiser, ouça o áudio dos seus erros numa caminhada (${r.n} itens, ~${r.min} min).</p>
      <div class="row"><button id="aud">Ouvir meus erros</button><button id="audStop">Parar</button></div></div>`;
  }
  const dd = day(k); if (dd.disc == null) { dd.disc = S.ptr % DISCIPLINAS.length; save(); }
  const disc = DISCIPLINAS[dd.disc], modo = modoOf(k), T = tempo(modo), q = qDone(k), done = dayComplete(k);
  const tasks = tasksFor(k).map((x) => {
    const ok = taskDone(x, k);
    return `<div class="task ${ok ? "done" : ""}"><input type="checkbox" ${ok ? "checked" : ""} ${x.q || x.auto ? "disabled" : `data-task="${x.id}"`} aria-label="${esc(x.t)}">
      <div class="t"><b>${esc(x.t)} <span class="pill">${x.min} min</span></b><span class="mut">${esc(x.d)}</span>
      ${x.url ? `<br><a href="${x.url}" target="_blank" rel="noopener">${esc(x.link)} ↗</a>` : ""}${x.q ? ` <span class="pill">${q}/${x.q}</span>` : ""}</div></div>`;
  }).join("");
  const nxt = nextBlockDisc(t), r = roteiro(t);
  const perd = S.days[k] && dd.perdido;
  return `<h2>${fmt(t)} <span class="pill">${esc(disc.nome)}</span></h2>
  <div class="card ${done ? "" : "warn"}">${done ? "✅ <b>Meta do dia cumprida.</b> Bloqueio liberado." : "<b>Bloco Delta</b> — antes do e-mail e do WhatsApp. Celular em outro cômodo."}
    <div class="stat" style="margin-top:10px"><div><b>${streak(t)}</b><span class="mut">dias cumpridos</span></div><div><b>${weekQ(t)}/${DEGRAUS[S.step - 1].sem}</b><span class="mut">questões na semana</span></div><div><b>${S.step}</b><span class="mut">degrau</span></div></div></div>
  <div class="card"><div class="row"><b>Tempo de hoje:</b>
    ${["curto", "medio", "cheio"].map((m) => `<button data-modo="${m}" class="${m === modo ? "pri" : ""}">${m === "cheio" ? tempo("cheio").total + " min" : TEMPO[m].label}</button>`).join("")}</div>
    <div class="mut">Orçamento: ${T.total} min na mesa. O que não cabe sai do dia, não vira atraso.</div></div>
  <div class="card">${tasks}</div>
  ${BANCO[disc.id] ? `<div class="card"><b>Banco local: ${BANCO[disc.id]} questões de ${esc(disc.nome)}</b> <span class="pill">sem limite do TEC</span>
    <p class="mut">${bancoRestantes(disc.id)}</p><div class="row"><button class="pri" id="treino">Fazer ${T.meta} agora no app</button><button id="imprimir">Imprimir lista do dia</button></div></div>` : ""}
  <h3>Registrar questões</h3>
  <div class="card"><div class="row"><select id="qd">${DISCIPLINAS.map((d) => `<option value="${d.id}" ${d.id === disc.id ? "selected" : ""}>${d.nome}</option>`).join("")}</select>
    <input id="qn" type="number" min="1" placeholder="feitas" inputmode="numeric"><input id="qh" type="number" min="0" placeholder="acertos" inputmode="numeric"><button class="pri" id="qadd">Salvar</button></div>
    <div class="mut">${peek(k).entries.map((e) => `${esc(NOME(e.disc))}: ${e.h}/${e.n}`).join(" · ") || "Nenhum registro hoje."}</div></div>
  <h3>Registrar um erro</h3>
  <div class="card"><div class="row"><select id="ed">${DISCIPLINAS.map((d) => `<option value="${d.id}" ${d.id === disc.id ? "selected" : ""}>${d.nome}</option>`).join("")}</select>
    <select id="ec">${Object.entries(CAUSAS).map(([a, b]) => `<option value="${a}">${b}</option>`).join("")}</select>
    <select id="et"><option value="M">Posição majoritária</option><option value="B">Posição da banca</option></select></div>
    <div class="row"><input id="etm" placeholder="Tema (ex.: prisão em flagrante, art. 302)" style="flex:1;min-width:200px"></div>
    <div class="row"><input id="er" placeholder="Regra correta em 1 linha" style="flex:1;min-width:200px"><button class="pri" id="eadd">Salvar erro</button></div>
    <div class="mut">${S.errors.filter((e) => e.date === k).length} erro(s) registrados hoje.</div></div>
  ${blocoOral(t)}
  <h3>Fora da mesa (conta à parte)</h3>
  <div class="card"><b>Áudio da véspera: ${esc(nxt.nome)}</b> <span class="pill">~10 min</span>
    <div class="row"><a class="btn" href="${nxt.audio}" target="_blank" rel="noopener">Pasta de áudios ↗</a></div>
    <b>Áudio dos meus erros</b> <span class="pill">${r.n} itens · ~${r.min} min</span>
    <div class="row"><button id="aud">Ouvir</button><button id="audStop">Parar</button><button id="audCopy">Copiar roteiro</button></div></div>
  <div class="card mut">Dia ruim? Faça só 5 questões. Perdeu o bloco: ${perd ? "registrado." : `<button id="perdi">registrar dia perdido</button>`} O ponteiro não avança, então a disciplina volta primeiro amanhã.</div>`;
}

function blocoOral(t) {
  const due = dueErrors(t);
  if (!due.length) return "";
  const { e, off } = due[0];
  return `<h3>Arguição oral · ${due.length} restante(s)</h3><div class="card">
    <div class="mut">${esc(NOME(e.disc))} · ${CAUSAS[e.causa] || ""} · revisão de ${off} dia(s)</div>
    <p><b>${esc(e.tema)}</b><br>Diga em voz alta a regra e os limites dela.</p>
    ${oralShow ? `<p class="warn card">${esc(e.regra)}${e.tipo === "B" ? "<br><span class='mut'>Posição da banca.</span>" : ""}</p>
      <div class="row"><button class="pri" data-ju="ok" data-id="${e.id}" data-off="${off}">Acertei</button><button data-ju="no" data-id="${e.id}" data-off="${off}">Errei</button></div>`
      : `<div class="row"><button class="pri" id="oralShow">Mostrar a regra</button></div>`}</div>`;
}

function viewPlano() {
  const t = NOW(); let x = t, rows = "";
  for (let i = 0; i < 12; ) { if (isWk(x)) { rows += `<tr><td>${fmt(x)}</td><td>${esc(discFor(x).nome)}</td></tr>`; i++; } x = addDays(x, 1); }
  const lost = S.perdidos.slice(-3).map((p) => `<li class="mut">${esc(p.date)} — ${esc(p.fato)} → ${esc(p.entao)}</li>`).join("");
  return `<h2>Próximos dias úteis (projeção)</h2><div class="card"><table>${rows}</table>
  <p class="mut">A projeção acompanha o que você cumpre. O Google Agenda mostra o plano original; se ficarem diferentes, vale o que o app mostra hoje.</p></div>
  <h2>Escada de horas</h2><div class="card"><table>${DEGRAUS.map((d) => `<tr><td>${d.n === S.step ? "▶" : ""} ${d.n}</td><td>${d.nome}</td><td class="mut">${d.texto}</td></tr>`).join("")}</table>
  <div class="row"><button id="down">− Descer</button><button id="up" class="pri">Subir +</button></div>
  <p class="mut">Só sobe com 5 de 6 manhãs cumpridas em duas semanas seguidas. Falhou duas semanas? Desce um degrau.</p></div>
  <h2>Calendário</h2><div class="card"><div class="row"><button id="ics">Baixar .ics (próximos 20 dias úteis)</button></div>
  <div class="row mut">Horário: <input id="hora" type="time" value="${S.hora}"></div>
  <p class="mut">Os blocos de 18/11 a 16/12 já estão no Google Agenda; importar este arquivo duplicaria. Use só para datas depois de 16/12.</p></div>
  <h2>Protocolo do dia perdido</h2><div class="card"><div class="row"><input id="pf" placeholder="1) O que aconteceu, sem enfeite" style="flex:1;min-width:200px"></div>
  <div class="row"><input id="pe" placeholder="3) Se-então de amanhã (ex.: se eu acordar, então abro o TEC antes do café)" style="flex:1;min-width:200px"></div>
  <div class="row"><button id="pad">Salvar</button><span class="mut">2) Me perdoo, e isso não muda a meta.</span></div><ul>${lost}</ul></div>
  <h2>Método aplicado</h2><div class="card"><ul>
  <li><b>Questões primeiro</b>, leitura só do que errou (recuperação ativa; Dunlosky et al., 2013).</li>
  <li><b>Estudo em camadas</b> (Estratégia): só avança de tema com ${GATE}% de acerto.</li>
  <li><b>Erros viram revisão</b> em 1, 7 e 30 dias, em voz alta, no máximo 5 por dia.</li>
  <li><b>Planos se-então</b> e placar diário (Gollwitzer &amp; Sheeran, 2006).</li></ul></div>`;
}

function viewDesempenho() {
  const p = perDisc(), t = NOW(), m = DEGRAUS[S.step - 1];
  const rows = DISCIPLINAS.map((d) => {
    const o = p[d.id] || { n: 0, h: 0 }, pc = o.n ? Math.round((o.h / o.n) * 100) : 0;
    return `<div class="row"><span style="width:120px">${d.nome}</span><div class="bar"><i class="${o.n ? (pc >= GATE ? "ok" : pc < 60 ? "bad" : "") : ""}" style="width:${pc}%"></i></div><span class="mut" style="width:96px;text-align:right">${o.n ? `${pc}% (${o.n})` : "—"}</span></div>`;
  }).join("");
  const tot = Object.values(p).reduce((a, o) => ({ n: a.n + o.n, h: a.h + o.h }), { n: 0, h: 0 });
  const fracas = DISCIPLINAS.filter((d) => (p[d.id] || { n: 0 }).n >= 20 && p[d.id].h / p[d.id].n < 0.6).map((d) => d.nome);
  const dom = DISCIPLINAS.filter((d) => (p[d.id] || { n: 0 }).n >= 30 && p[d.id].h / p[d.id].n >= GATE / 100).map((d) => d.nome);
  const causas = {}; S.errors.forEach((e) => { causas[e.causa] = (causas[e.causa] || 0) + 1; });
  const ne = S.errors.length, max = Math.max(1, ...Object.values(causas));
  const M = S.errors.filter((e) => e.tipo === "M").length, B = ne - M;
  return `<h2>Desempenho</h2><div class="card stat"><div><b>${tot.n}</b><span class="mut">questões</span></div><div><b>${tot.n ? Math.round((tot.h / tot.n) * 100) : 0}%</b><span class="mut">acerto geral</span></div><div><b>${streak(t)}</b><span class="mut">dias cumpridos</span></div></div>
  <div class="card"><div class="mut">Semana: ${weekQ(t)} de ${m.sem} questões</div><div class="bar"><i style="width:${Math.min(100, (weekQ(t) / m.sem) * 100)}%"></i></div></div>
  <h3>Acerto por disciplina (meta ${GATE}%)</h3><div class="card">${rows}</div>
  ${fracas.length ? `<div class="card warn"><b>Reforço:</b> abaixo de 60% em ${fracas.join(", ")}. Prefira esta(s) quando sobrar tempo.</div>` : ""}
  ${dom.length ? `<div class="card"><b>Dominadas (≥${GATE}% em 30+ questões):</b> ${dom.join(", ")}. Mantenha só com a revisão dos erros.</div>` : ""}
  <h3>Por que você erra</h3><div class="card">${ne ? Object.entries(CAUSAS).map(([c, n]) => `<div class="row"><span style="width:150px">${n}</span><div class="bar"><i style="width:${((causas[c] || 0) / max) * 100}%"></i></div><span class="mut" style="width:40px;text-align:right">${causas[c] || 0}</span></div>`).join("") : `<span class="mut">Registre erros na aba Hoje para ver o padrão.</span>`}
    ${ne >= 10 ? `<p class="mut">De ${ne} erros, ${M} seguiram a posição majoritária e ${B} a da banca. Com mais de 200 questões, isso diz se vale estudar pelo catálogo da banca.</p>` : ""}</div>`;
}

function viewFoco() {
  const t = NOW(), pend = isWk(t) && !dayComplete(iso(t));
  return `<h2>Bloqueio de apps</h2>
  <div class="card ${pend ? "warn" : ""}"><b>${pend ? "🔒 Meta de hoje pendente" : "🔓 Meta cumprida"}</b>
  <p class="mut">Um app web <b>não bloqueia</b> outros apps: isso é do Android e do iOS. O Eu Delegado avisa quando a meta fecha, e o sistema faz o bloqueio.</p>
  <h3>Android (Instagram, YouTube, Oi Tube, Chrome)</h3>
  <ol><li>Bem-estar digital → Modo Foco → marque os quatro apps e agende seg–sex.</li>
  <li>Para liberar ao cumprir a meta: MacroDroid com gatilho “Notificação recebida” contendo <code>META_OK</code> do Eu Delegado → ação “Desativar Modo Foco”. Não testado.</li>
  <li>Notificação exige https e permissão abaixo.</li></ol>
  <h3>iPhone</h3><ol><li>Tempo de Uso → Limites de App com 1 min nos quatro apps.</li><li>Deixe a senha do Tempo de Uso com a Damaris.</li></ol>
  <div class="row"><button id="perm">Permitir notificações</button><button id="test">Testar aviso META_OK</button></div></div>
  <h2>Sincronização</h2><div class="card">${syncOk === true ? "✅ Computador e celular compartilham os dados pelo servidor." : syncOk === false ? "⚠️ Sem servidor: os dados ficam só neste aparelho. Abra o app pelo endereço do seu computador." : "Verificando…"}</div>
  <h2>Dados</h2><div class="card"><div class="row"><button id="exp">Baixar backup</button><label class="btn">Restaurar<input id="imp" type="file" accept=".json" hidden></label></div>
  <p class="mut">Progresso do TEC lido em ${TEC_LIDO_EM}: ${TEC_CADERNOS.filter((c) => c.rj).length} cadernos PC-RJ no app.</p></div>`;
}

// ---------- Banco local e treino dentro do app ----------
const BK = {}; let PR = null;
async function loadBanco(d) {
  if (BK[d]) return BK[d];
  const r = await fetch(`banco/${d}.json`); if (!r.ok) throw new Error("banco indisponível");
  return (BK[d] = await r.json());
}
function bancoRestantes(d) {
  const feitas = Object.keys(S.banco.done).length;
  return feitas ? `${feitas} já respondidas no total; elas não se repetem.` : "Questões com gabarito, sem anuladas. As que citam leis revogadas ficam de fora.";
}
const pick = (arr, n) => arr.filter((q) => !S.banco.done[q.i] && q.r !== "rev").slice(0, n);
function recordQ(disc, q, ok) {
  const k = iso(NOW()), dd = day(k);
  let e = dd.entries.find((x) => x.bk && x.disc === disc);
  if (!e) { e = { disc, n: 0, h: 0, bk: true }; dd.entries.push(e); }
  e.n++; if (ok) e.h++;
  S.banco.done[q.i] = ok ? 1 : 0; save();
}
function viewTreino() {
  if (!PR) return `<div class="card">Nenhum treino aberto. <button id="sair">Voltar</button></div>`;
  if (PR.i >= PR.list.length) return `<h2>Treino concluído</h2><div class="card"><b>${PR.h} acertos em ${PR.list.length}</b> (${Math.round((PR.h / Math.max(1, PR.list.length)) * 100)}%).<p class="mut">Os resultados já entraram no placar do dia.</p><button class="pri" id="sair">Voltar ao dia</button></div>`;
  const q = PR.list[PR.i], opts = q.o.length ? q.o.map((t, j) => ["A", "B", "C", "D", "E"][j]) : ["Certo", "Errado"];
  const body = q.o.length ? q.o : ["Certo", "Errado"];
  const btns = opts.map((L, j) => {
    const cls = PR.sel ? (L === q.g ? "pri" : L === PR.sel ? "bad" : "") : "";
    return `<button class="opt ${cls}" data-opt="${L}" ${PR.sel ? "disabled" : ""}><b>${q.o.length ? L + ")" : ""}</b> ${esc(body[j])}</button>`;
  }).join("");
  const wrong = PR.sel && PR.sel !== q.g;
  return `<h2>Questão ${PR.i + 1} de ${PR.list.length}</h2>
  <div class="card"><div class="mut">${esc(q.b)} · ${q.a} · ${esc(q.m)}${q.s ? " — " + esc(q.s) : ""}${q.r === "old" ? " · <b>antiga: confira a norma</b>" : ""}</div>
  <p style="white-space:pre-wrap">${esc(q.e)}</p><div class="opts">${btns}</div>
  ${PR.sel ? `<p><b>${PR.sel === q.g ? "✅ Certo." : "❌ Errado."}</b> Gabarito: ${esc(q.g)}.</p>` : ""}
  ${wrong ? `<div class="row"><select id="pc">${Object.entries(CAUSAS).map(([a, b]) => `<option value="${a}">${b}</option>`).join("")}</select></div>
    <div class="row"><input id="pr" placeholder="Regra correta em 1 linha (vira revisão e áudio)" style="flex:1;min-width:200px"></div>` : ""}
  ${PR.sel ? `<div class="row"><button class="pri" id="prox">${wrong ? "Salvar erro e seguir" : "Próxima"}</button></div>` : ""}</div>
  <div class="mut"><button id="sair">Sair do treino</button> ID TEC ${q.i}: www.tecconcursos.com.br/questoes/${q.i}</div>`;
}
function imprimirLista(list, titulo) {
  const w = window.open("", "_blank"); if (!w) return alert("O navegador bloqueou a janela de impressão.");
  const L = ["a", "b", "c", "d", "e"];
  const h = list.map((q, n) => `<div style="break-inside:avoid;margin:0 0 14px"><b>${n + 1}.</b> <small>${esc(q.b)} ${q.a} · ${esc(q.s || q.m)}</small><p>${esc(q.e)}</p>${q.o.length ? q.o.map((t, j) => `<div>${L[j]}) ${esc(t)}</div>`).join("") : "<div>( ) Certo &nbsp; ( ) Errado</div>"}</div>`).join("");
  const g = list.map((q, n) => `${n + 1}) ${q.g}`).join(" &nbsp; ");
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(titulo)}</title><body style="font:14px/1.4 Georgia,serif;margin:24px"><h2>${esc(titulo)}</h2>${h}<hr><b>Gabarito</b><p>${g}</p>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}

function render() {
  $("#view").innerHTML = { hoje: viewHoje, plano: viewPlano, desempenho: viewDesempenho, foco: viewFoco, treino: viewTreino }[tab]();
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  renderLock(); bind();
}

function notify(msg) {
  try { if (Notification.permission === "granted") navigator.serviceWorker.ready.then((r) => r.showNotification("Eu Delegado", { body: msg, icon: "icon.svg" })); } catch (e) {}
}

function ics() {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Eu Delegado//PT", "CALSCALE:GREGORIAN"];
  const [hh, mm] = S.hora.split(":").map(Number), pad = (n) => String(n).padStart(2, "0");
  const st = (d, h, m) => `${iso(d).replace(/-/g, "")}T${pad(h)}${pad(m)}00`;
  const z = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  let x = addDays(parse("2026-12-17"), 0), n = 0;
  while (n < 20) {
    if (isWk(x)) {
      const dc = discFor(x), nx = DISCIPLINAS[(discIdxFor(x) + 1) % DISCIPLINAS.length], fim = hh * 60 + mm + 60;
      L.push("BEGIN:VEVENT", `UID:eudelegado-${iso(x)}@local`, `DTSTAMP:${z}`,
        `DTSTART;TZID=America/Sao_Paulo:${st(x, hh, mm)}`, `DTEND;TZID=America/Sao_Paulo:${st(x, Math.floor(fim / 60), fim % 60)}`,
        `SUMMARY:Bloco Delta — ${dc.nome}`,
        `DESCRIPTION:1) Questões TEC: ${tecUrl(dc.id)}\\n2) Resumo banca: ${dc.banca}\\n3) Áudio véspera (${nx.nome}): ${nx.audio}\\n4) Planilha: ${LINKS.planilha}`,
        "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:Bloco Delta", "END:VALARM", "END:VEVENT");
      n++;
    }
    x = addDays(x, 1);
  }
  L.push("END:VCALENDAR");
  return L.join("\r\n");
}
const download = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };

function bind() {
  const k = iso(NOW());
  document.querySelectorAll("[data-task]").forEach((c) => c.onchange = () => { day(k).tasks[c.dataset.task] = c.checked; save(); afterChange(); });
  document.querySelectorAll("[data-modo]").forEach((b) => b.onclick = () => { day(k).modo = b.dataset.modo; save(); render(); });
  document.querySelectorAll("[data-ju]").forEach((b) => b.onclick = () => {
    const e = S.errors.find((x) => String(x.id) === b.dataset.id); if (!e) return;
    if (b.dataset.ju === "ok") e.done[b.dataset.off] = true; else e.seen = k;
    if (b.dataset.ju === "ok") e.seen = k;
    oralShow = false; save(); afterChange();
  });
  const on = (id, fn) => { const el = $("#" + id); if (el) el.onclick = fn; };
  on("oralShow", () => { oralShow = true; render(); });
  const discHoje = () => DISCIPLINAS[peek(k).disc ?? S.ptr % DISCIPLINAS.length];
  on("treino", async () => {
    const d = discHoje();
    try { const arr = await loadBanco(d.id); const list = pick(arr, tempo(modoOf(k)).meta); if (!list.length) return alert("Você já respondeu todo o banco desta disciplina."); PR = { list, i: 0, sel: null, h: 0, disc: d.id }; tab = "treino"; render(); }
    catch (e) { alert("O banco local só abre pelo servidor do computador (não pelo GitHub)."); }
  });
  on("imprimir", async () => { const d = discHoje(); try { const arr = await loadBanco(d.id); imprimirLista(pick(arr, tempo(modoOf(k)).meta), `Bloco Delta — ${d.nome} — ${fmt(NOW())}`); } catch (e) { alert("O banco local só abre pelo servidor do computador."); } });
  on("sair", () => { PR = null; tab = "hoje"; afterChange(); });
  document.querySelectorAll("[data-opt]").forEach((b) => b.onclick = () => {
    const q = PR.list[PR.i]; PR.sel = b.dataset.opt; const ok = PR.sel === q.g; if (ok) PR.h++;
    recordQ(PR.disc, q, ok); render();
  });
  on("prox", () => {
    const q = PR.list[PR.i];
    if (PR.sel !== q.g) {
      const regra = ($("#pr") && $("#pr").value.trim()) || "(sem regra anotada)";
      S.errors.push({ id: Date.now(), date: k, disc: PR.disc, causa: ($("#pc") && $("#pc").value) || "atencao", tipo: "M", tema: q.s || q.m, regra, qid: q.i, done: {} }); save();
    }
    PR.i++; PR.sel = null; render();
  });
  on("qadd", () => {
    const n = +$("#qn").value, h = +$("#qh").value;
    if (!n || h < 0 || h > n) return alert("Informe questões feitas e acertos (acertos ≤ feitas).");
    day(k).entries.push({ disc: $("#qd").value, n, h }); save(); afterChange();
  });
  on("eadd", () => {
    const tema = $("#etm").value.trim(), regra = $("#er").value.trim();
    if (!tema || !regra) return alert("Preencha o tema e a regra correta.");
    S.errors.push({ id: Date.now(), date: k, disc: $("#ed").value, causa: $("#ec").value, tipo: $("#et").value, tema, regra, done: {} });
    save(); render();
  });
  on("aud", () => falar(roteiro(NOW()).texto || "Você ainda não registrou erros."));
  on("audStop", () => { try { speechSynthesis.cancel(); } catch (e) {} });
  on("audCopy", () => { const t = roteiro(NOW()).texto; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => alert("Roteiro copiado.")).catch(() => alert(t)); });
  on("perdi", () => { day(k).perdido = true; save(); tab = "plano"; render(); });
  on("pad", () => { const f = $("#pf").value.trim(), e = $("#pe").value.trim(); if (!f || !e) return alert("Preencha os dois campos."); S.perdidos.push({ date: k, fato: f, entao: e }); save(); render(); });
  on("ics", () => download("eu-delegado.ics", ics(), "text/calendar"));
  if ($("#hora")) $("#hora").onchange = (e) => { S.hora = e.target.value; save(); };
  on("up", () => { S.step = Math.min(4, S.step + 1); save(); render(); });
  on("down", () => { S.step = Math.max(1, S.step - 1); save(); render(); });
  on("perm", () => Notification.requestPermission().then(() => alert("Permissão: " + Notification.permission)));
  on("test", () => notify("META_OK"));
  on("exp", () => download("eu-delegado-backup.json", JSON.stringify(S), "application/json"));
  if ($("#imp")) $("#imp").onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((x) => { try { const s = JSON.parse(x); if (s.v !== 2) throw 0; S = s; save(); render(); } catch (err) { alert("Arquivo inválido."); } }); };
}

let notified = "";
function afterChange() {
  const t = NOW(), k = iso(t);
  if (isWk(t) && dayComplete(k)) {
    const dd = day(k);
    if (!dd.advanced) { dd.advanced = true; S.ptr = (S.ptr + 1) % DISCIPLINAS.length; save(); }
    if (notified !== k) { notified = k; notify("META_OK — meta do dia cumprida. Bloqueio pode ser liberado."); }
  }
  render();
}

if (typeof document !== "undefined" && document.querySelectorAll) {
  document.querySelectorAll("nav button").forEach((b) => b.onclick = () => { tab = b.dataset.tab; render(); });
  document.addEventListener && document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  render(); pull();
}
