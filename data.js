// Dados-base do Eu Delegado. IDs de pastas vêm do Drive do Tiago (indexados em 17/11/2026).
// Onde o ID da subpasta ainda não foi indexado, o link cai na pasta-mãe.
const D = (id) => `https://drive.google.com/drive/folders/${id}`;

const ROOT = {
  audio: D("1w_aysNnEiTw84nchrYTzmDPs8o5UI_au"),   // resumos mp3 delegado
  banca: D("1nkOkM9WuwXI0-zTh6btiDXcdct_nCVce"),   // BANCA DELEGADO
  foraCaixa: D("1MtfuHixVEWgSEsuua0it8NxWeCtow9c3"),
  preEdital: D("18iwUbvu02NRVNTcu1s7U6M6Ny8GIm9PI"),
};

// Ordem do ciclo de disciplinas (uma por dia útil, retomando de onde parou).
const DISCIPLINAS = [
  { id: "const", nome: "Constitucional",   audio: D("1ur8S8CnrXGMW9qTIOvQz4yGyUiyWDtKG"), banca: ROOT.banca },
  { id: "penal", nome: "Penal",            audio: D("1PREfU5IGYAqokJISvub7MCqspJgQnJII"), banca: ROOT.banca },
  { id: "ppenal", nome: "Proc. Penal",     audio: D("1ZkrVKXWzx_B6VEw6khGVLHVtNiu1dP5l"), banca: ROOT.banca },
  { id: "adm",  nome: "Administrativo",   audio: D("1FfFyRg91Lbn4rIqKmrO6XhSZlG4sFM_e"), banca: D("19k9O2vZW7FeQYMLNMarLuATo9yJFbptk") },
  { id: "leg",  nome: "Leg. Especial",    audio: ROOT.audio,                               banca: D("1YH7Qox8e_hFOzH-t-1WBULUS7BK05OgN") },
  { id: "dh",   nome: "Dir. Humanos",     audio: ROOT.audio,                               banca: D("138MAlbyopB0FtrFTMln56KJHCL8Es1Ig") },
  { id: "crim", nome: "Criminologia",     audio: ROOT.audio,                               banca: D("1TYF_Ftyp74AGH0mrMO-Bf2cBCO9RpC3B") },
  { id: "civil", nome: "Civil",           audio: ROOT.audio,                               banca: ROOT.banca },
  { id: "med",  nome: "Med. Legal",       audio: D("1QwZdt7MnquRbOjmr9I9rAQG3JpoaaaFX"), banca: ROOT.banca },
];

// Escada de horas do Plano Delta: sobe com 5/6 manhãs em 2 semanas seguidas.
const PLANO_INICIO = "2026-11-18"; // alinha o app com os 21 blocos já lançados no Google Agenda
// Degraus: meta = mínimo de questões para fechar o dia; sem = meta semanal (5 dias úteis, alvo de 15/dia no degrau 1).
const DEGRAUS = [
  { n: 1, nome: "Ritmo",      meta: 12, sem: 75,  extra: 0,   texto: "60 min, 12–15 questões/dia" },
  { n: 2, nome: "Volume",     meta: 25, sem: 125, extra: 30,  texto: "+30 min de questões nos dias de home office" },
  { n: 3, nome: "Pré-edital", meta: 35, sem: 175, extra: 60,  texto: "+60 min; simulado de 100 questões a cada 15 dias" },
  { n: 4, nome: "Edital saiu", meta: 50, sem: 250, extra: 120, texto: "2–3 h/dia útil + revisão total" },
];

// Orçamento de tempo do bloco (minutos). O dia só pede o que cabe no tempo escolhido.
const TEMPO = {
  curto: { label: "30 min", quest: 12, erros: 5, ler: 0,  oral: 13, meta: 8 },
  medio: { label: "45 min", quest: 18, erros: 6, ler: 6,  oral: 15, meta: 10 },
  cheio: { label: "60 min", quest: 25, erros: 8, ler: 12, oral: 15, meta: null }, // meta vem do degrau
};
const CAUSAS = { lei: "Lei seca", excecao: "Exceção / pegadinha", juris: "Jurisprudência", conceito: "Conceito", atencao: "Atenção / leitura", chute: "Chute" };

const LINKS = {
  tec: "https://www.tecconcursos.com.br/",
  tecQuestoes: "https://www.tecconcursos.com.br/questoes/cadernos",
  planilha: "https://drive.google.com/drive/search?q=ESTUDO%20DELEGADO%20PC%20RJ",
};

const GATE = 80; // % mínimo para avançar de tema (método em camadas, Estratégia)

// Banco local de questões (importado dos PDFs do TEC no Drive). Os arquivos ficam em banco/, fora do repositório público.
const BANCO = {"const":655,"adm":601,"penal":260,"ppenal":269};
