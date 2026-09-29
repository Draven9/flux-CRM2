/**
 * O Admin Plataforma tem como trocar de tema — e por que isso merece catraca.
 *
 * Até 20/09/2026 o `ThemeToggle` só era montado por `components/shell/UserMenu.tsx`,
 * a casca do TENANT. Medido na época, a superfície inteira de admin
 * (`app/(admin)`, `app/admin`, `components/admin`) tinha ZERO ocorrência de
 * `ThemeToggle`, `useTheme`, `setTheme` ou `data-theme`.
 *
 * O efeito não era "falta um botão". O atalho `mod+shift+l` é registrado DENTRO
 * do componente, então sem ele montado não havia botão NEM atalho: o único
 * caminho era sair para `/app`, trocar lá, e voltar. E quem cai no admin
 * primeiro não é caso raro — o `install.sh` cria o dono da instalação como
 * platform admin, então é a primeira tela de muita gente numa VPS nova.
 *
 * ── Por que o controle mudou de lugar em 29/09/2026 ──────────────────────────
 *
 * A primeira versão o pôs na tarja do Modo Plataforma, por ser o único elemento
 * persistente do topo em todas as larguras. Na prática não foi achado: 28px sem
 * rótulo, colado no canto superior direito da janela — o mesmo canto em que
 * extensão de navegador desenha — e, no estado `system`, com um ícone de MONITOR,
 * que não lê como tema para quem procura sol ou lua. Relato do dono do produto,
 * na produção: "ele ficou em cima do outro ícone, por isso não achei".
 *
 * Agora mora no rodapé do `AdminSidebar`, no mesmo formato das outras linhas de
 * lá: ícone + PALAVRA, alvo da largura inteira. Daí o caso abaixo cobrar o nome
 * acessível vindo do TEXTO, e não de um `aria-label` — a diferença é justamente
 * o que o usuário consegue ler na tela.
 *
 * LIMITE DECLARADO: isto prova que o controle EXISTE, que ele CICLA e que o
 * ATALHO responde. NÃO prova que a barra lateral está montada em toda tela de
 * admin — quem monta é `app/admin/(protected)/layout.tsx`, pelo `AdminShell`, e
 * guardar esse elo exigiria um layout async que chama `requirePlatformAdmin`.
 * Mesmo limite que `admin-shell-tooltip.test.tsx` declara.
 *
 * Sabotagem que confirma que a guarda vigia: remover `<ThemeRow />` do rodapé de
 * `components/admin/AdminSidebar.tsx` deixa os três casos vermelhos.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ThemeProvider } from "@/lib/theme";

// O `AdminSidebar` é client component e chama `usePathname` para marcar o item
// ativo. Mesmo mock de `admin-shell-tooltip.test.tsx`.
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
}));

// Mesmo stub local de `lib/theme.test.tsx`: o jsdom não implementa matchMedia,
// e o `ThemeProvider` o consulta para resolver o tema "system".
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as unknown as typeof window.matchMedia;

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    // localStorage indisponível no ambiente — o provider já degrada sozinho.
  }
});

const rodape = () =>
  render(
    <ThemeProvider>
      <AdminSidebar userEmail="dono@exemplo.com" />
    </ThemeProvider>,
  );

/** O controle, achado como o usuário o acha: pela palavra visível. */
const controle = () => screen.getByRole("button", { name: /^Tema\b/i });

describe("Admin Plataforma — troca de tema", () => {
  it("o rodapé da barra lateral oferece o controle, com PALAVRA visível", () => {
    rodape();
    // `getByRole` com `name` casa o nome ACESSÍVEL, que aqui vem do texto do
    // `<span>` — é o mesmo que os olhos leem. Um ícone sem rótulo não passaria,
    // e foi exatamente o que não foi achado na produção.
    const botao = controle();
    expect(botao).toBeInTheDocument();
    expect(botao.textContent?.trim()).toMatch(/^Tema\b/i);
  });

  it("o controle CICLA de fato — não é um botão decorativo", async () => {
    // Sem isto, um botão sem `onClick` passaria no caso acima: a guarda mediria
    // a presença de um elemento, não a existência da capacidade.
    const usuario = userEvent.setup();
    rodape();

    const antes = controle().textContent;
    await usuario.click(controle());
    expect(controle().textContent).not.toBe(antes);
  });

  it("o atalho Ctrl+Shift+L responde no admin", async () => {
    // Esta guarda existe porque o defeito VOLTOU. O atalho é registrado dentro
    // do componente, então mover o controle de casca sem levar o `useHotkeys`
    // junto o apaga em silêncio — aconteceu em 29/09/2026, ao tirar o controle
    // da tarja. Um teste que só olha o clique não teria visto.
    const usuario = userEvent.setup();
    rodape();

    const antes = controle().textContent;
    await usuario.keyboard("{Control>}{Shift>}L{/Shift}{/Control}");
    expect(controle().textContent).not.toBe(antes);
  });
});
