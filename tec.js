// Cadernos do TEC Concursos do Tiago, lidos em 17/11/2026. Só metadados; o texto das questões fica no TEC.
// "resolvidas" é o valor lido nessa data (o app não recebe o progresso do TEC sozinho).
const TEC_BASE = "https://www.tecconcursos.com.br/questoes/cadernos/";
const TEC_LIDO_EM = "17/11/2026";
const TEC_CADERNOS = [
  // Guia PC-RJ 2021 (prioridade)
  { disc: "crim",   rj: true, nome: "Criminologia — PC-RJ",                     id: "109072219", total: 517,  resolvidas: 0 },
  { disc: "adm",    rj: true, nome: "Dir. Administrativo — PC-RJ",              id: "109072230", total: 1138, resolvidas: 0 },
  { disc: "civil",  rj: true, nome: "Dir. Civil — PC-RJ",                       id: "109072247", total: 1113, resolvidas: 0 },
  { disc: "const",  rj: true, nome: "Dir. Constitucional — PC-RJ",              id: "109072248", total: 1106, resolvidas: 0 },
  { disc: "penal",  rj: true, nome: "Dir. Penal — PC-RJ",                       id: "109072253", total: 1178, resolvidas: 0 },
  { disc: "ppenal", rj: true, nome: "Dir. Processual Penal — PC-RJ",            id: "109072254", total: 1207, resolvidas: 0 },
  { disc: "adm",    rj: true, nome: "Legislação Administrativa Estadual — PC-RJ", id: "109072256", total: 178, resolvidas: 0 },
  { disc: "leg",    rj: true, nome: "Legislação Especial — PC-RJ",              id: "109072257", total: 839,  resolvidas: 0 },
  { disc: "leg",    rj: true, nome: "Leg. Penal e Proc. Penal Especial — PC-RJ", id: "109072258", total: 9999, resolvidas: 0 }, // total não lido
  // Guia PC-PR 2026 (complemento)
  { disc: "penal",  nome: "Direito Penal — PC-PR 2026",                 id: "109071819", total: 1822, resolvidas: 0 },
  { disc: "ppenal", nome: "Dir. Processual Penal — PC-PR 2026",         id: "109071833", total: 1376, resolvidas: 0 },
  { disc: "leg",    nome: "Leg. Penal Extravagante — PC-PR 2026",       id: "109071836", total: 1175, resolvidas: 0 },
  { disc: "const",  nome: "Direito Constitucional — PC-PR 2026",        id: "109071838", total: 1659, resolvidas: 0 },
  { disc: "adm",    nome: "Dir. Administrativo — PC-PR 2026",           id: "109071843", total: 1358, resolvidas: 0 },
  { disc: "dh",     nome: "Direitos Humanos — PC-PR 2026",              id: "109071862", total: 1196, resolvidas: 0 },
  { disc: "med",    nome: "Ciências Forenses — PC-PR 2026",             id: "109071865", total: 1040, resolvidas: 0 },
  // Pasta "Dr Delegado Willer"
  { disc: "const",  rj: true, nome: "Constitucional PC RJ (Willer, 82 q.)", id: "103406342", total: 82, resolvidas: 0 },
];
// Caderno do dia: PC-RJ primeiro, depois PC-PR; ignora os já esgotados.
function tecCaderno(discId) {
  const l = TEC_CADERNOS.filter((c) => c.disc === discId && c.resolvidas < c.total);
  return l.find((c) => c.rj) || l[0] || null;
}
function tecUrl(discId) {
  const c = tecCaderno(discId);
  return c ? TEC_BASE + c.id : LINKS.tecQuestoes;
}
