#!/usr/bin/env bash
# Distribuição Flux — acompanha as releases do produto (melgarafael/DeskcommCRM)
# sem ninguém precisar lembrar.
#
# Roda pelo workflow `sincronizar-com-produto.yml`, várias vezes por dia, e cada
# rodada dá UM passo e sai. O estado mora no GitHub (branch, PR, issue, release),
# não aqui, então rodar de novo nunca repete efeito:
#
#   1. a main do fork já contém a última release do produto
#        → se ainda não existe release `<tag>-flux.N`, cria a `<tag>-flux.1`
#          (é ela que publica as imagens e acende o botão "Atualizar" da VPS);
#        → se já existe, não há nada a fazer.
#   2. existe PR aberto `sync/produto-<tag>`
#        → CI ainda rodando: espera a próxima rodada;
#        → algum check vermelho: abre (uma vez) uma issue pedindo ajuda;
#        → tudo verde: faz o merge e cai no passo 1 na mesma rodada.
#   3. não existe PR
#        → já há issue aberta de conflito para esta tag: espera a pessoa;
#        → senão, mescla a tag numa branch nova. Sem conflito: push + PR (o CI
#          roda nele). Com conflito: desfaz e abre a issue com os arquivos.
#
# Nada aqui faz merge sem o CI inteiro verde, e nada mexe na VPS: a VPS só
# atualiza quando alguém clica em "Atualizar".
set -euo pipefail

PRODUTO="${PRODUTO:-melgarafael/DeskcommCRM}"
FORK="${FORK:?FORK não definido (owner/repo do fork)}"
# Os checks que a branch protection do produto exige. Sem os cinco verdes
# (e nenhum vermelho ou pendente) o PR não é mesclado.
CHECKS_OBRIGATORIOS="verify invariants e2e build-and-size imagens-ok"

log() { printf '%s\n' "$*"; }

issue_aberta() {  # issue_aberta <título> → número ou vazio
  gh issue list --repo "$FORK" --state open --search "\"$1\" in:title" \
    --json number,title --jq ".[] | select(.title == \"$1\") | .number" | head -1
}

abrir_issue() {  # abrir_issue <título> <corpo>
  if [ -n "$(issue_aberta "$1")" ]; then
    log "Issue já aberta: $1"
    return 0
  fi
  gh issue create --repo "$FORK" --title "$1" --body "$2" >/dev/null
  log "Issue aberta: $1"
}

TAG="$(gh release view --repo "$PRODUTO" --json tagName --jq .tagName)"
[ -n "$TAG" ] || { log "Não consegui ler a última release do produto."; exit 1; }
log "Última release do produto: $TAG"

BRANCH="sync/produto-$TAG"
RELEASE="$TAG-flux.1"

git remote get-url produto >/dev/null 2>&1 || git remote add produto "https://github.com/$PRODUTO.git"
git fetch --quiet origin main
git fetch --quiet --no-tags produto "+refs/tags/$TAG:refs/tags/$TAG"

criar_release_se_faltar() {
  if gh release list --repo "$FORK" --limit 100 --json tagName --jq '.[].tagName' \
      | grep -qE "^${TAG//./\\.}-flux\.[0-9]+$"; then
    log "A main já contém $TAG e a release -flux dela existe. Nada a fazer."
    return 0
  fi
  gh release create "$RELEASE" --repo "$FORK" --target main --title "$RELEASE" \
    --notes "Distribuição Flux sobre o DeskcommCRM $TAG (sincronização automática). Notas do produto: https://github.com/$PRODUTO/releases/tag/$TAG" >/dev/null
  log "Release $RELEASE criada — o workflow de publicação gera as imagens a partir dela."
}

# ── 1. A main já contém a tag ────────────────────────────────────────────────
if git merge-base --is-ancestor "$TAG" origin/main; then
  criar_release_se_faltar
  exit 0
fi

# ── 2. Já existe PR aberto para esta tag ─────────────────────────────────────
PR="$(gh pr list --repo "$FORK" --head "$BRANCH" --state open --json number --jq '.[0].number // empty')"
if [ -n "$PR" ]; then
  CHECKS="$(gh pr checks "$PR" --repo "$FORK" --json name,bucket --jq '.[] | "\(.name)\t\(.bucket)"' || true)"
  if printf '%s\n' "$CHECKS" | awk -F'\t' '$2=="fail"||$2=="cancel"' | grep -q .; then
    VERMELHOS="$(printf '%s\n' "$CHECKS" | awk -F'\t' '$2=="fail"||$2=="cancel"{print "- `"$1"`"}')"
    abrir_issue "Sincronização com o produto $TAG: CI vermelho no PR #$PR" \
"A sincronização automática mesclou o produto **$TAG** sem conflito, mas o CI do PR #$PR ficou vermelho:

$VERMELHOS

Nada foi mesclado na \`main\` e a VPS não foi tocada. Alguém precisa olhar o PR: corrigir na própria branch \`$BRANCH\` (o CI roda de novo e a automação faz o merge sozinha quando ficar verde) ou fechar o PR para recomeçar."
    exit 0
  fi
  if printf '%s\n' "$CHECKS" | awk -F'\t' '$2=="pending"' | grep -q .; then
    log "PR #$PR com CI em andamento. Volto na próxima rodada."
    exit 0
  fi
  for c in $CHECKS_OBRIGATORIOS; do
    if ! printf '%s\n' "$CHECKS" | awk -F'\t' -v n="$c" '$1==n && $2=="pass"' | grep -q .; then
      log "PR #$PR ainda não tem o check obrigatório '$c' verde. Volto na próxima rodada."
      exit 0
    fi
  done
  gh pr merge "$PR" --repo "$FORK" --merge
  log "PR #$PR mesclado."
  git fetch --quiet origin main
  criar_release_se_faltar
  exit 0
fi

# ── 3. Sem PR: mesclar agora ─────────────────────────────────────────────────
TITULO_CONFLITO="Sincronização com o produto $TAG: conflito precisa de ajuda"
if [ -n "$(issue_aberta "$TITULO_CONFLITO")" ]; then
  log "Há issue de conflito aberta para $TAG. Esperando alguém resolver."
  exit 0
fi

git switch --quiet -C "$BRANCH" origin/main
if ! git merge --no-edit -m "Merge do produto $TAG na distribuição Flux" "$TAG" >/tmp/merge.log 2>&1; then
  CONFLITOS="$(git diff --name-only --diff-filter=U | sed 's/^/- `/; s/$/`/')"
  git merge --abort
  abrir_issue "$TITULO_CONFLITO" \
"O produto publicou **$TAG** e a mescla automática na \`main\` do fork deu conflito em:

$CONFLITOS

Nada foi mesclado e a VPS não foi tocada. Para resolver: crie a branch \`$BRANCH\` a partir da \`main\`, rode \`git merge $TAG\` (do remoto do produto), resolva, abra o PR para a \`main\` do fork e feche esta issue. Com o PR aberto, a automação acompanha o CI, faz o merge quando ficar verde e cria a release \`$RELEASE\`."
  exit 0
fi

git push --quiet --force-with-lease origin "$BRANCH"
gh pr create --repo "$FORK" --base main --head "$BRANCH" \
  --title "sync: produto $TAG na distribuição Flux" \
  --body "Sincronização automática (\`scripts/flux/sincronizar-com-produto.sh\`): o produto publicou [$TAG](https://github.com/$PRODUTO/releases/tag/$TAG) e a mescla na \`main\` do fork não teve conflito.

Quando os checks obrigatórios ($CHECKS_OBRIGATORIOS) ficarem verdes, a automação faz o merge e cria a release \`$RELEASE\`, que publica as imagens. A VPS só atualiza quando alguém clicar em **Atualizar**.

Se o CI ficar vermelho, a automação abre uma issue e não mescla nada." >/dev/null
log "PR aberto para $TAG."
