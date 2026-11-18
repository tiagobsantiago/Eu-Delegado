# Eu Delegado

App de estudos para o concurso de Delegado da PC-RJ. Funciona no computador e no celular (PWA).

- **Hoje:** bloco diário de 30, 45 ou 60 minutos (questões, registro de erros, leitura só do que errou, arguição oral).
- **Erros viram revisão** em 1, 7 e 30 dias, e viram áudio para ouvir fora da mesa.
- **Desempenho** por disciplina, causas de erro e meta de 80% por tema.
- **Banco local de questões:** fica só no computador do aluno (pasta `banco/`, fora deste repositório).

Para rodar no computador: `node serve.js` e abrir http://localhost:8765.
O servidor também sincroniza o estado entre computador e celular na rede local.
