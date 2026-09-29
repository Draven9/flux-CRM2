---
impacto: nada_mudou
secao: corrigido
titulo: A agenda desenha no fuso da organização, não no do navegador
---

A agenda aberta fora do fuso da empresa desenhava as horas no relógio de quem
abriu a tela: um compromisso às 09:00 da clínica aparecia às 09:00 do relógio
de quem estava viajando ou com a máquina em outro fuso, a régua do "agora"
subia para a hora local, e a chave de dia dos horários livres era a do navegador.

A âncora da semana já vinha do relógio da organização; faltava a grade. Os
blocos, os rótulos de hora, a linha do "agora" e a chave de dia agora saem de
`partesNoFuso` e `diaLocalISO` (`lib/agenda/fuso.ts`) sobre o fuso resolvido em
`page.tsx` — a mesma fonte que o servidor usa para a primeira pintura.

Para quem tem navegador e organização no mesmo fuso — a maioria das
instalações — a conversão é a identidade e nada muda de lugar. Um teste novo
escolhe de propósito um fuso diferente do ambiente, fixa o instante e mede a
posição da régua e o rótulo do card contra a hora de parede esperada; ele
reprova se a grade voltar a ler o relógio local.

Refs #1362

Contribuição de @webtecnica (#1831).
