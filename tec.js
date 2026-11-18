// Cadernos do TEC Concursos do Tiago, lidos em 18/11/2026. Só metadados; o texto das questões fica no TEC.
// "resolvidas" é o valor lido nessa data (o app não recebe o progresso do TEC sozinho).
// Prioridade na escolha do caderno do dia: multibancas (filtrado: sem anuladas e sem desatualizadas) > PC-PR 2026 > PC-RJ 2022 (antigo).
const TEC_BASE = "https://www.tecconcursos.com.br/questoes/cadernos/";
const TEC_LIDO_EM = "18/11/2026";
const TEC_CADERNOS = [
  // Pasta "Delegado de Polícia/2026" (multibancas), com "Remover anuladas" e "Remover desatualizadas"
  { prio: 1, disc: "const",  nome: "Constitucional — multibancas",             id: "109094314", total: 1867, resolvidas: 15 },
  { prio: 1, disc: "penal",  nome: "Penal — multibancas",                      id: "109094317", total: 1784, resolvidas: 0 },
  { prio: 1, disc: "ppenal", nome: "Processo Penal — multibancas",             id: "109094320", total: 1807, resolvidas: 0 },
  { prio: 1, disc: "adm",    nome: "Administrativo — multibancas",             id: "109094297", total: 1960, resolvidas: 0 },
  { prio: 1, disc: "leg",    nome: "Leg. Penal e Proc. Penal Especial — multibancas", id: "109094329", total: 1800, resolvidas: 0 },
  { prio: 1, disc: "crim",   nome: "Criminologia — multibancas",               id: "109094293", total: 531,  resolvidas: 0 },
  { prio: 1, disc: "civil",  nome: "Civil — multibancas",                      id: "109094307", total: 1531, resolvidas: 0 },
  { prio: 1, disc: "med",    nome: "Medicina Legal — multibancas",             id: "109094338", total: 1363, resolvidas: 0 },
  // Pasta "Delegado de Polícia (PC PR)/2026"
  { prio: 2, disc: "dh",     nome: "Direitos Humanos — PC-PR 2026",            id: "109071862", total: 1196, resolvidas: 0 },
  { prio: 2, disc: "penal",  nome: "Direito Penal — PC-PR 2026",               id: "109071819", total: 1822, resolvidas: 0 },
  { prio: 2, disc: "ppenal", nome: "Dir. Processual Penal — PC-PR 2026",       id: "109071833", total: 1376, resolvidas: 0 },
  { prio: 2, disc: "leg",    nome: "Leg. Penal Extravagante — PC-PR 2026",     id: "109071836", total: 1175, resolvidas: 0 },
  { prio: 2, disc: "const",  nome: "Direito Constitucional — PC-PR 2026",      id: "109071838", total: 1659, resolvidas: 0 },
  { prio: 2, disc: "adm",    nome: "Dir. Administrativo — PC-PR 2026",         id: "109071843", total: 1358, resolvidas: 0 },
  { prio: 2, disc: "med",    nome: "Ciências Forenses — PC-PR 2026",           id: "109071865", total: 1040, resolvidas: 0 },
  // PC-RJ 2022: antigo, sem questões depois dessa data. Só se faltar outro.
  { prio: 3, disc: "crim",   nome: "Criminologia — PC-RJ 2022",                id: "109072219", total: 517,  resolvidas: 0 },
  { prio: 3, disc: "civil",  nome: "Dir. Civil — PC-RJ 2022",                  id: "109072247", total: 1113, resolvidas: 0 },
  { prio: 3, disc: "const",  nome: "Constitucional PC RJ (Willer, 82 q.)",     id: "103406342", total: 82,   resolvidas: 0 },
];
function tecCaderno(discId) {
  return TEC_CADERNOS.filter((c) => c.disc === discId && c.resolvidas < c.total).sort((a, b) => a.prio - b.prio)[0] || null;
}
function tecUrl(discId) {
  const c = tecCaderno(discId);
  return c ? TEC_BASE + c.id : LINKS.tecQuestoes;
}
