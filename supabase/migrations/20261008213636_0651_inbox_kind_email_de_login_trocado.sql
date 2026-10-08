-- manifest: **Distribuição Flux — a lista de `agent_inbox_items.kind` volta a ter `email_de_login_trocado` na cadeia de migrations.** A 0556 (gestão de tenants, PR #1967 do produto, carimbo 05/10) acrescenta o kind; a 0589 do produto (carimbo 07/10) reconstrói a constraint com a lista dela, sem ele — quem aplica as migrations em ordem perderia o valor, e o aviso de troca de e-mail falharia com 23514. O `baseline.sql` já tem a lista completa; esta migration repete a da 0589 mais `email_de_login_trocado`, só CRESCE e é idempotente (drop/re-add). Quando o #1967 entrar no produto com o próprio conserto, esta passa a ser uma reconstrução redundante e inofensiva.

alter table public.agent_inbox_items
  drop constraint if exists agent_inbox_items_kind_check;

alter table public.agent_inbox_items
  add constraint agent_inbox_items_kind_check check (kind in (
    'appointment_outcome_required',
    'appointment_recovery_review',
    'qr_rescan',
    'routing_unassigned',
    'job_dead',
    'event_dead',
    'budget_exceeded',
    'handoff',
    'promotion_review',
    'judge_unaligned',
    'followup_dead',
    'snooze_expired',
    'next_action_ambiguous',
    'risk_backlog_seeded',
    'reactivation_expired',
    'capabilities_missing',
    'message_send_stuck',
    'midia_nao_lida',
    'channel_template_review',
    'channel_number_alert',
    'promise_unfulfilled',
    'contact_proposal_expired',
    'budget_warning',
    'conhecimento_nao_indexado',
    'voice_call_missed',
    'case_stale',
    'aviso_de_caso_nao_entregue',
    'followup_sem_agente',
    'canal_mudo_sem_numero',
    'proposal_expired_notice',
    'proposal_acceptance_rate_drop',
    'proposal_promised_not_created',
    'proposta_travada',
    'proposta_pronta_para_revisao',
    'org_reativada',
    'jev_pedido_de_humano',
    'jev_parar_de_receber',
    'canal_pausado',
    -- (migration 0556) o admin da plataforma trocou o e-mail de login de uma
    -- pessoa da equipe: a empresa fica sabendo pela Central, sem o endereço.
    'email_de_login_trocado',
    'other'
  ));
