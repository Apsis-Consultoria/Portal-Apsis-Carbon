/**
 * FormularioCandidato - cadastro e edição de candidato do pipeline.
 *
 * POR QUE ELE EXISTE. A tela de Pipeline nasceu (26/08/2026) sabendo avaliar,
 * comparar, mover de etapa e promover a projeto - e sem nenhuma forma de CRIAR
 * um candidato. A rota `POST pipeline/candidatos` e o cliente `criarCandidato`
 * já existiam; faltava a tela. Na prática, candidato novo só entraria no banco
 * por SQL, e a tela seria um relatório de três linhas que ninguém consegue
 * aumentar.
 *
 * COMPONENTE PRÓPRIO, e não mais um trecho de Pipeline.jsx: aquela tela já
 * cuida de listagem, painel de avaliação por critério, comparação lado a lado e
 * promoção a projeto.
 *
 * O CONTRATO com o servidor, que este formulário respeita campo a campo (ver
 * `lerCamposCandidato` em rotas/pipeline.ts):
 *   nome                obrigatório
 *   segmento, etapa     enums fechados, NOT NULL com default
 *   uf                  duas letras, maiusculizado no servidor
 *   elegivel_corsia     TRÊS estados: sim, não e "ninguém avaliou" (null)
 *   preco_mercado_*     valor, moeda, data e fonte andam juntos
 */

import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { atualizarCandidato, criarCandidato } from '@/lib/api/pipeline';
import Campo from '@/components/ui/Campo';
import BotaoPrimario from '@/components/ui/BotaoPrimario';
import BotaoSecundario from '@/components/ui/BotaoSecundario';

/* Espelham os CHECK de carbon_candidatos. Rótulo em português, valor igual ao
   banco: traduzir na exibição e guardar o valor cru é o padrão da casa. */
const SEGMENTOS = [
  { valor: 'terra_indigena', rotulo: 'Terra indígena' },
  { valor: 'redd_privado', rotulo: 'REDD privado' },
  { valor: 'agro', rotulo: 'Agro' },
];

const ETAPAS = [
  { valor: 'triagem', rotulo: 'Triagem' },
  { valor: 'analise_preliminar', rotulo: 'Análise preliminar' },
  { valor: 'proposta_viabilidade', rotulo: 'Proposta de viabilidade' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'descartado', rotulo: 'Descartado' },
];

const MOEDAS = [
  { valor: 'USD', rotulo: 'USD' },
  { valor: 'BRL', rotulo: 'BRL' },
  { valor: 'EUR', rotulo: 'EUR' },
];

/* Três estados de verdade, e o vazio NÃO é "não".
   `null` é "ninguém avaliou ainda", e tratar isso como não elegível seria uma
   afirmação que ninguém fez - e que muda o preço esperado do crédito. */
const CORSIA = [
  { valor: '', rotulo: 'Ainda não avaliado' },
  { valor: 'sim', rotulo: 'Há indícios de elegibilidade' },
  { valor: 'nao', rotulo: 'Avaliado: não elegível' },
];

const FORM_VAZIO = {
  nome: '',
  segmento: 'redd_privado',
  etapa: 'triagem',
  metodologia: '',
  uf: '',
  municipio: '',
  area_estimada_ha: '',
  parceiro_id: '',
  premissas: '',
  virtudes: '',
  falhas: '',
  preco_mercado_ref: '',
  preco_mercado_moeda: 'USD',
  preco_mercado_data: '',
  preco_mercado_fonte: '',
  elegivel_corsia: '',
  observacoes: '',
};

function formDoCandidato(c) {
  if (!c) return FORM_VAZIO;
  return {
    ...FORM_VAZIO,
    ...Object.fromEntries(
      Object.keys(FORM_VAZIO).map((k) => [k, c[k] == null ? '' : String(c[k])]),
    ),
    segmento: c.segmento || 'redd_privado',
    etapa: c.etapa || 'triagem',
    preco_mercado_moeda: c.preco_mercado_moeda || 'USD',
    // Booleano de três estados vira string do seletor, e null continua vazio.
    elegivel_corsia: c.elegivel_corsia === true ? 'sim' : c.elegivel_corsia === false ? 'nao' : '',
  };
}

/** Número em pt-BR, aceitando vírgula decimal. Vazio vira null, não zero. */
function numeroOuNulo(valor, rotulo) {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;

  // Mesma regra de Credito.jsx, e pelo mesmo motivo: decidir pela ESTRUTURA e
  // não pela quantidade de dígitos. Com vírgula, todo ponto é milhar; mais de um
  // ponto, idem; um ponto só e sem vírgula é decimal. Área em hectares tem casa
  // decimal legítima, e recusá-la impediria de salvar o valor real.
  const pontos = (texto.match(/\./g) ?? []).length;
  let normalizado;
  if (texto.includes(',')) normalizado = texto.replace(/\./g, '').replace(',', '.');
  else if (pontos > 1) normalizado = texto.replace(/\./g, '');
  else normalizado = texto;

  const n = Number(normalizado);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Informe um número válido em ${rotulo}.`);
  return n;
}

/**
 * Monta o corpo.
 *
 * Na EDIÇÃO os campos vazios vão como `null`, e não omitidos: a Edge Function
 * usa "a chave veio no corpo?" para decidir o que tocar, então omitir significa
 * "mantenha o valor atual" e apagar um campo seria impossível, com a tela ainda
 * dizendo que salvou.
 */
function montarPayload(form, editando) {
  const nome = String(form.nome ?? '').trim();
  if (!nome) throw new Error('Informe o nome do candidato.');

  const uf = String(form.uf ?? '').trim().toUpperCase();
  if (uf && !/^[A-Z]{2}$/.test(uf)) {
    throw new Error('A UF precisa ter duas letras. Escreva PA, não Pará.');
  }

  const payload = { nome, segmento: form.segmento, etapa: form.etapa };

  const texto = (campo) => {
    const v = String(form[campo] ?? '').trim();
    if (v) payload[campo] = v;
    else if (editando) payload[campo] = null;
  };
  ['metodologia', 'municipio', 'premissas', 'virtudes', 'falhas', 'observacoes',
    'preco_mercado_fonte'].forEach(texto);

  if (uf) payload.uf = uf;
  else if (editando) payload.uf = null;

  payload.area_estimada_ha = numeroOuNulo(form.area_estimada_ha, 'área estimada');
  payload.preco_mercado_ref = numeroOuNulo(form.preco_mercado_ref, 'preço de referência');
  payload.preco_mercado_moeda = form.preco_mercado_moeda || 'USD';
  payload.preco_mercado_data = String(form.preco_mercado_data ?? '').trim() || null;
  payload.parceiro_id = String(form.parceiro_id ?? '').trim() || null;

  payload.elegivel_corsia =
    form.elegivel_corsia === 'sim' ? true : form.elegivel_corsia === 'nao' ? false : null;

  return payload;
}

export default function FormularioCandidato({ candidato, parceiros = [], aoConcluir, aoCancelar }) {
  const msal = useMsal();
  const clienteQuery = useQueryClient();
  const editando = Boolean(candidato?.id);
  const [form, setForm] = useState(() => formDoCandidato(candidato));

  const alterar = (campo) => (valor) => setForm((a) => ({ ...a, [campo]: valor }));

  const salvar = useMutation({
    mutationFn: (payload) =>
      editando ? atualizarCandidato(msal, candidato.id, payload) : criarCandidato(msal, payload),
    onSuccess: () => {
      toast.success(editando ? 'Candidato atualizado.' : 'Candidato cadastrado.');
      clienteQuery.invalidateQueries({ queryKey: ['carbon', 'pipeline'] });
      aoConcluir?.();
    },
    onError: (e) => toast.error(e?.message ?? 'Não foi possível salvar o candidato.'),
  });

  const enviar = () => {
    let payload;
    try {
      payload = montarPayload(form, editando);
    } catch (e) {
      toast.error(e?.message ?? 'Revise os campos do formulário.');
      return;
    }
    salvar.mutate(payload);
  };

  const opcoesParceiro = [
    { valor: '', rotulo: 'Sem parceiro' },
    ...parceiros.map((p) => ({ valor: p.id, rotulo: p.nome })),
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Campo rotulo="Nome" obrigatorio valor={form.nome} onChange={alterar('nome')}
            placeholder="TI Pimentel Barbosa" extras={{ maxLength: 500 }} />
        </div>

        <Campo rotulo="Segmento" tipo="select" opcoes={SEGMENTOS}
          valor={form.segmento} onChange={alterar('segmento')}
          dica="Floresta Nacional e outras unidades de conservação ainda não têm categoria própria." />

        <Campo rotulo="Etapa" tipo="select" opcoes={ETAPAS}
          valor={form.etapa} onChange={alterar('etapa')} />

        <Campo rotulo="UF" valor={form.uf} onChange={alterar('uf')}
          placeholder="PA" extras={{ maxLength: 2 }} dica="Sigla de duas letras." />

        <Campo rotulo="Município" valor={form.municipio} onChange={alterar('municipio')} />

        <Campo rotulo="Área estimada (ha)" valor={form.area_estimada_ha}
          onChange={alterar('area_estimada_ha')} placeholder="643250,5" />

        <Campo rotulo="Metodologia" valor={form.metodologia} onChange={alterar('metodologia')}
          placeholder="VM0048" />

        <Campo rotulo="Parceiro" tipo="select" opcoes={opcoesParceiro}
          valor={form.parceiro_id} onChange={alterar('parceiro_id')} />

        <Campo rotulo="Elegível ao CORSIA" tipo="select" opcoes={CORSIA}
          valor={form.elegivel_corsia} onChange={alterar('elegivel_corsia')}
          dica="Vazio é 'ninguém avaliou', que é diferente de 'não elegível'." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Campo rotulo="Preço de referência" valor={form.preco_mercado_ref}
          onChange={alterar('preco_mercado_ref')} placeholder="12,50" />
        <Campo rotulo="Moeda" tipo="select" opcoes={MOEDAS}
          valor={form.preco_mercado_moeda} onChange={alterar('preco_mercado_moeda')} />
        <Campo rotulo="Data da cotação" tipo="date" valor={form.preco_mercado_data}
          onChange={alterar('preco_mercado_data')} />
        <div className="sm:col-span-3">
          <Campo rotulo="Fonte do preço" valor={form.preco_mercado_fonte}
            onChange={alterar('preco_mercado_fonte')}
            placeholder="MSCI, relatório de mercado, cotação de comprador"
            dica="Preço sem fonte não sustenta decisão de investimento." />
        </div>
      </div>

      {/* Premissas, virtudes e falhas são as três perguntas do checklist de
          viabilidade que o Notion registrava como texto solto. Campos próprios
          para poderem ser lidos lado a lado na comparação de candidatos. */}
      <Campo rotulo="Premissas da viabilidade" tipo="textarea" linhas={3}
        valor={form.premissas} onChange={alterar('premissas')} />
      <Campo rotulo="Virtudes" tipo="textarea" linhas={2}
        valor={form.virtudes} onChange={alterar('virtudes')} />
      <Campo rotulo="Falhas e riscos" tipo="textarea" linhas={2}
        valor={form.falhas} onChange={alterar('falhas')} />
      <Campo rotulo="Observações" tipo="textarea" linhas={2}
        valor={form.observacoes} onChange={alterar('observacoes')} />

      <div className="flex items-center justify-end gap-2 pt-1">
        <BotaoSecundario variante="fantasma" onClick={aoCancelar}>
          Cancelar
        </BotaoSecundario>
        <BotaoPrimario
          onClick={enviar}
          /* `carregando`, e nao `disabled`: BaseBotao nao tem rest props, entao
             `disabled` nunca chegava ao <button> e o botao continuava clicavel
             durante o salvamento, permitindo cadastrar o mesmo candidato duas
             vezes. `carregando` ja troca o icone pelo spinner e poe aria-busy. */
          carregando={salvar.isPending}
        >
          {salvar.isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar candidato'}
        </BotaoPrimario>
      </div>
    </div>
  );
}
