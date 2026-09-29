"use client";

import { useTheme } from "@/lib/theme";
import { useHotkeys } from "react-hotkeys-hook";
import { Sun, Moon, MonitorPlay } from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/i18n/useT";

/**
 * ⚠️ O ATALHO `mod+shift+l` MORA AQUI DENTRO, e por isso ele só existe onde
 * este componente está montado. Até 20/09/2026 o `ThemeToggle` só era montado
 * pelo `components/shell/UserMenu.tsx` (a casca do tenant), o que deixava TODA a
 * superfície de Admin Plataforma sem botão e sem atalho: quem entrava direto
 * lá — e o `install.sh` cria o dono como platform admin, então é onde muita
 * gente cai primeiro — ficava preso ao tema que estivesse valendo, sem
 * descobrir que a troca existia numa outra casca.
 *
 * `className` existe para quem precisa apertar o alvo — a barra do tenant o usa
 * como está.
 */

/** O nome do estado ATUAL, para quem lê a tela em vez de decifrar o ícone. */
const NOME_DO_TEMA = {
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
} as const;

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  useHotkeys("mod+shift+l", cycle, { preventDefault: true }, [theme]);

  const Icon = theme === "dark" ? Moon : theme === "system" ? MonitorPlay : Sun;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={cycle}
      aria-label={t(`Tema: ${theme}. Cmd+Shift+L para alternar.`)}
      // O servidor não sabe a preferência salva no navegador do usuário --
      // renderiza um valor default e o cliente corrige pro valor real assim
      // que hidrata. É o mismatch ESPERADO de todo seletor de tema; React
      // "corrige" sozinho no primeiro render, só reclamava no console.
      suppressHydrationWarning
    >
      <Icon size={16} aria-hidden />
    </Button>
  );
}

/**
 * A MESMA capacidade, em forma de linha com PALAVRA — para rodapé de barra
 * lateral, onde há largura e o ícone sozinho não se explica.
 *
 * Por que existe, e por que não é um segundo componente de verdade: o ciclo e o
 * atalho continuam morando no `ThemeToggle` acima; isto aqui reaproveita os dois
 * por composição. Duplicar a ordem `claro → escuro → sistema` em dois lugares é
 * como as duas superfícies começam a discordar.
 *
 * O relato que motivou: na tarja do Modo Plataforma o controle era um ícone de
 * 28px sem rótulo, colado no canto superior direito da janela — onde extensão de
 * navegador também desenha —, e no estado `system` o ícone é um MONITOR, que não
 * lê como tema para quem procura sol ou lua. Resposta do dono do produto:
 * "ele ficou em cima do outro ícone, por isso não achei".
 */
export function ThemeRow({ className }: { className?: string }) {
  const t = useT();
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  // ⚠️ O ATALHO PRECISA SER REGISTRADO AQUI TAMBÉM. Ele mora dentro do
  // componente, então existe apenas onde o componente está montado — e o admin
  // monta esta linha, nunca o `ThemeToggle`. Ao mover o controle da tarja para
  // cá sem esta linha, o `mod+shift+l` sumiu do admin pela segunda vez.
  useHotkeys("mod+shift+l", cycle, { preventDefault: true }, [theme]);

  const Icon = theme === "dark" ? Moon : theme === "system" ? MonitorPlay : Sun;

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs",
        "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-accent-500/40",
        className,
      )}
      // Mesmo motivo do `ThemeToggle`: o servidor não conhece a preferência
      // salva no navegador, e o cliente corrige na hidratação.
      suppressHydrationWarning
    >
      <Icon size={14} aria-hidden />
      <span suppressHydrationWarning>{t(NOME_DO_TEMA[theme] ?? "Tema")}</span>
    </button>
  );
}
