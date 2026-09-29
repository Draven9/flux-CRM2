/**
 * O Admin Plataforma tem como trocar de tema, e o controle é ALCANÇÁVEL.
 *
 * ── Histórico, porque este controle já se perdeu DUAS vezes ──────────────────
 *
 * Até 20/09/2026 o `ThemeToggle` só era montado por `components/shell/UserMenu.tsx`,
 * a casca do TENANT. Medido na época, a superfície inteira de admin
 * (`app/(admin)`, `app/admin`, `components/admin`) tinha ZERO ocorrência de
 * `ThemeToggle`, `useTheme`, `setTheme` ou `data-theme`. E não faltava só o
 * botão: o atalho `mod+shift+l` é registrado DENTRO do componente, então sem ele
 * montado não havia botão NEM atalho. Quem cai no admin primeiro não é caso
 * raro — o `install.sh` cria o dono da instalação como platform admin.
 *
 * 20/09: posto na tarja do Modo Plataforma como ÍCONE de 28px, sem rótulo.
 *        Não foi achado na produção — no estado `system` o ícone é um MONITOR,
 *        que não lê como tema para quem procura sol ou lua, e ele fica colado
 *        no canto superior direito da JANELA, onde extensão de navegador
 *        também desenha. Relato: "ele ficou em cima do outro ícone".
 *
 * 29/09: movido para o rodapé do `AdminSidebar`. PIOR: aquele `<aside>` não
 *        trava altura — não tem `h-screen` nem `sticky`, ao contrário do
 *        `components/shell/Sidebar.tsx:395` do tenant —, então a lista de
 *        navegação cresce, o `overflow-y-auto` do `<nav>` nunca age e o rodapé
 *        inteiro cai para FORA da janela. Relato: "agora não estou vendo".
 *
 * 29/09, versão final: de volta à tarja, que é `sticky top-0` e portanto está
 *        sempre na tela, mas agora como `ThemeRow` — ícone + a PALAVRA do tema
 *        atual. O erro original nunca foi o lugar; era o ícone mudo.
 *
 * ── O que cada caso guarda ──────────────────────────────────────────────────
 *
 * Os três primeiros cobrem as três formas já vistas de perder o controle:
 * não existir, existir mudo, e existir fora da tela. O quarto cobre o atalho,
 * que sumiu sozinho quando o controle mudou de casca sem levar o `useHotkeys`.
 *
 * LIMITE DECLARADO: isto prova que o controle existe na tarja, tem palavra,
 * cicla e responde ao atalho. NÃO prova que a tarja está montada em toda tela
 * de admin — quem monta é `app/admin/(protected)/layout.tsx`, pelo `AdminShell`,
 * e guardar esse elo exigiria um layout async que chama `requirePlatformAdmin`.
 * Mesmo limite que `admin-shell-tooltip.test.tsx` declara.
 *
 * Sabotagens que confirmam que a guarda vigia, com a previsão ao lado:
 *  - remover `<ThemeRow />` da tarja           → 4 vermelhos
 *  - trocar `ThemeRow` por `ThemeToggle` (mudo) → 1 vermelho (o da palavra)
 *    (foram 3 até `nomeDoControle` existir; ver o comentário dele)
 *  - remover o `useHotkeys` do `ThemeRow`       → 1 vermelho (o do atalho)
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlatformModeBanner } from "@/components/admin/PlatformModeBanner";
import { ThemeProvider } from "@/lib/theme";

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

const tarja = () =>
  render(
    <ThemeProvider>
      <PlatformModeBanner />
    </ThemeProvider>,
  );

/** O controle, achado como o usuário o acha: pela palavra visível. */
const controle = () => screen.getByRole("button", { name: /^Tema\b/i });

/**
 * O nome ACESSÍVEL do controle — venha ele de onde vier.
 *
 * Os casos de ciclo e de atalho precisam de um sinal que exista nas DUAS formas
 * possíveis do controle: com texto, como hoje, ou só com `aria-label`, como na
 * versão muda de 20/09. Comparar `textContent` direto deixava esses dois casos
 * vermelhos num controle mudo — falhando pelo motivo do caso "tem PALAVRA", e
 * não pelo seu. Caso que reprova por motivo alheio mente no relatório: medido
 * ao sabotar `ThemeRow` → `ThemeToggle`, quando a previsão era 1 vermelho e
 * vieram 3.
 */
const nomeDoControle = () => {
  const el = controle();
  return el.getAttribute("aria-label") ?? el.textContent ?? "";
};

describe("Admin Plataforma — troca de tema", () => {
  it("existe um controle de tema", () => {
    tarja();
    expect(controle()).toBeInTheDocument();
  });

  it("ele tem PALAVRA, não só ícone", () => {
    // `getByRole` com `name` já casa o nome acessível, que um `aria-label`
    // sozinho satisfaria — e foi exatamente a versão que não foi achada. Por
    // isso a asserção é sobre o TEXTO renderizado: o que os olhos leem.
    tarja();
    expect(controle().textContent?.trim()).toMatch(/^Tema\b/i);
  });

  it("ele está DENTRO da tarja fixa, não num container que rola para fora", () => {
    // A guarda que faltava em 29/09. O rodapé do `AdminSidebar` satisfazia
    // "existe" e "tem palavra" e mesmo assim era invisível, porque aquele
    // `<aside>` não trava altura. A tarja é `sticky top-0`: o que está dentro
    // dela está sempre na tela.
    tarja();
    const regiao = controle().closest('[role="region"]');
    expect(regiao).not.toBeNull();
    expect(regiao?.getAttribute("aria-label")).toBe("Modo Plataforma");
    expect(regiao?.className).toContain("sticky");
  });

  it("o atalho Ctrl+Shift+L responde no admin", async () => {
    // Esta guarda existe porque o defeito VOLTOU: o atalho é registrado dentro
    // do componente, então mover o controle de casca sem levar o `useHotkeys`
    // junto o apaga em silêncio. Um teste que só olha o clique não veria.
    const usuario = userEvent.setup();
    tarja();

    const antes = nomeDoControle();
    await usuario.keyboard("{Control>}{Shift>}L{/Shift}{/Control}");
    expect(nomeDoControle()).not.toBe(antes);
  });

  it("o controle CICLA ao clique — não é decorativo", async () => {
    const usuario = userEvent.setup();
    tarja();

    const antes = nomeDoControle();
    await usuario.click(controle());
    expect(nomeDoControle()).not.toBe(antes);
  });
});
