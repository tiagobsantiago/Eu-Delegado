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

// Pasta "Eu Delegado" no Drive e materiais exatos de cada dia (ordem de estudo da pasta BANCA DELEGADO).
const DOC = (id) => `https://docs.google.com/document/d/${id}/edit`;
const PASTA_EUD = "https://drive.google.com/drive/folders/1ctPmr4j4Kbtw05qeFsFSe2EKx3IgvioI";
const ERROS_DOC = {
  const: "1Ea9WmNUyUA0BHgEyT6s_n9q297zNfowm0Bk-mw0CKV8", penal: "1NSLtLFwXA01NFuxw22KQV82eoyqv4RkgY7oEJxZzKpU",
  ppenal: "1S9rwjg91dld53RGo9ZRnltNyv0k27Z2DSfWXEIQguhc", adm: "12ss1tP-gO-jiF7MgRXtRhk3-clJAGWPebqskCFoM0xQ",
  leg: "1oe8EF4lovapXSmBqQnvaWvG_Dn2aLRU4dqL8pIAnAns", dh: "1DYSZESVwsSw_FQ_aLNlUjeKTUuzXaLzYr-WMZW1AW7Q",
  crim: "1cXA0nbhHSna8GXrqNPjKtOmKOuF2M6FV0ElSca-ICrA", civil: "1sfQ3UvmqGMxLybMr1O75zJ_IU5EVkG1Bn8FILLnzVKw",
  med: "1hxID6O5j8rfMNLpBw0DJJXoBLgIpuFAZLPfAk5YJ44A",
};
const MATERIAL = {
  const: [["01 - S01 - Teoria constitucional e teoria do estado", "1I1T6MIEKwhjH1qMUMiCK5kx2VFOr1U7o-99dnorqao0"], ["02 - S02 - Tutela constitucional das liberdades", "15aMuPtxikY2q0DXuCotdsJICzluJF2tsfKo_CHDNuOY"], ["03 - S02 - Direitos políticos", "1KhreBvi1UmrXu6Ei9otlq72-5TNUwqA1KfBqc_-hrM0"], ["04 - S02 - Direitos da nacionalidade", "1Lm2ej3RLs7r5hZhgtZW6KVdHrUuxD8a38XLknLfXsqM"], ["05 - S03 - Direitos e garantias fundamentais", "1lvRDg-VscYcwVrgj5qr9vZa29-frmmLKDtsOoR_57lY"], ["06 - S05 - Organização do Estado", "1WcEvNlzLYTRlWriMyHnAY2OhZHXGlw8Yy4JRQhoYP-I"], ["07 - S06 - Estado de defesa, estado de sítio e segurança pública", "1lCc_gXfMZ3o0YM09xqQlUdp-pV6EndQ_yODngF5gN7w"], ["08 - S09 - Poder Legislativo e processo legislativo", "169WTCUw0q2Q-x7QsTm7hn2R1ihYJKEPUze5CzEfBGlY"], ["09 - S12 - Poder Judiciário", "1crRyd9790sMdO2zqWxD6Dt0Mssiz9oy9TjKfXgafQBM"], ["10 - S12 - Funções essenciais à Justiça", "16ou1HQ6uD1ergxPdo4mOFc8Ejxwb_Vy2aLMGWH0sGx8"]],
  penal: [["01 - S01 - Noções iniciais e princípios", "1wpn9diDxTgGyUr92pqLwBZ21rkZ89Npo4O4DhHVImgI"], ["02 - S02 - Aplicação da lei penal e conflito aparente de normas", "1L_tW5f1EEHoOgOOKmACK5uuNagnS0e3yn-1sR8o9Zv4"], ["03 - S03 - Teoria do crime - parte 1", "1Gl_ZjXAR66ioTNlWJnleijIvLVI97evPpRFFNZu6S8w"], ["04 - S03 - Teoria do crime - parte 2", "1qY62RFsDLUaz7Q7aFOc0AkUEQ2TRkdYxgNivOxFDJWQ"]],
  ppenal: [["01 - S01 - Noções iniciais e princípios", "1Y4TFVzBYtzrPjj0rld_FN_aUKcYQFgzdrNquzDuwpUw"], ["02 - S02 - Inquérito policial", "1z0_YAc4MDn5j8rybQftMPBvRsKUglxTiSO6thADpN1g"], ["03 - S03 - Ação penal", "1MMdfyHxZ4coKelZbhl40osX4W2c8SSoj2Uk1g4fhpMI"]],
  adm: [["01 - S01 - Noções iniciais e princípios", "119x2q5nCvRELCQKGAzTE2rkqndRpZJlnbCAo407sNQg"], ["02 - S04 - Entes da administração", "1MEtSK8jr09HRovflBtbQAn2IKnq97lj5BebvTPtxRe8"], ["03 - S06 - Atos administrativos", "1ZLJncX1zoADrxQL1zU59MyhQyUiMXfjkY3_d323CnKw"]],
  leg: [["01 - S02 - Lei de lavagem de capitais", "114jVPj8gigiVEzknu0b_Hk5_UIJi3Id8J2vSJkQbQsU"], ["02 - S03 - Lei do parcelamento do solo urbano", "1xL4Isw4qPImfSgJyBeJXKvXqYJdGro0infwzegvE1jM"], ["03 - S03 - Crimes no estatuto da pessoa com deficiência", "1_kFWesoXOddU9_rJmKVdpjVxR4pLWiUU4DMBU28smcA"]],
  dh: [["01 - S17 - Direito internacional dos direitos humanos", "1vssa-51lI2S8k3AN_yHASSnehW-CC9ruoJuLFhq9E0o"]],
  crim: [["01 - S10 - História da criminologia, escola clássica e positivista", "1gl7n8pjL-e9JgSCqeokQG1SIu79NxFkF9HkZVjhOZv0"], ["02 - S11 - Sociologia criminal", "1s5WNd5BGF8Yr0gBt8jd7wYSQjoRhGklsmUVyEB6txY4"], ["03 - S11 - Crime organizado, classificação dos criminosos e prevenção criminal", "1t7Cw2bTh-SlwXiBH6UC9eO1nTft5pEOAYHLHY1RqD-Y"], ["04 - S18 - Instâncias de controle", "1ncuxTYmUx-Y6ieI3LOo2D4eyo5WuSPji6FUCXbkjAVw"]],
  civil: [["01 - S02 - Constitucionalização do direito civil e LINDB", "14H3VDS55p7j1SpOQuZ3MqxcjuMq4G83NGhPT9NS910Q"], ["02 - S05 - Das pessoas", "15gb_mV-MadjmiBYshurDVNdKXXcyMHfutEItB5TsMcI"], ["03 - S05 - Dos bens", "1SoIaHr9z98QKYDwHjvmzCRkhQt5344C74tezo1k_twE"]],
  med: [["01 - S01 - Introdução, perícias, peritos, documentos médico-legais e infortunística", "1Ws0UszqxfDhaybcwxTPcZoaZCz0LVyPSfJFo26zGpek"], ["02 - S04 - Antropologia forense", "1dmTFhr03OUhpHaMgzz7dZZNlCSDMKS3pcaEQwmXcnbc"], ["03 - S04 - Energias físicas não mecânicas", "1GHcM_fJjTxfp76mSAPv7OnGOTMLfyl1O2IZ7nXPRLZU"]],
};
