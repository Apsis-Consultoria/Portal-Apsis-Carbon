/**
 * useSalvamentoContinuo - salva o questionário sozinho, e não perde nada quando
 * o sinal cai.
 *
 * O PROBLEMA QUE ELE RESOLVE. O formulário mais longo tem 61 perguntas e é
 * aplicado em aldeia, onde o sinal cai no meio. Com um botão "Salvar" no fim, a
 * pessoa responde quarenta perguntas, a rede falha e some tudo - e ela descobre
 * quando já saiu de campo. A visita não se repete.
 *
 * A ORDEM DAS COISAS, que é o ponto do arquivo:
 *   1. grava no APARELHO (rascunhoOffline), sempre, antes de qualquer rede;
 *   2. tenta o servidor;
 *   3. se o servidor confirma, apaga a cópia do aparelho;
 *   4. se falhou por REDE, a cópia fica e é reenviada quando o sinal voltar.
 *
 * Fazer na ordem inversa - tentar a rede e só guardar se falhar - perde o dado
 * quando o navegador é fechado durante a tentativa, que num aparelho de campo
 * com bateria acabando não é hipótese remota.
 *
 * FALHA DE REGRA NÃO VIRA PENDÊNCIA. Se o servidor recusou por conteúdo (400,
 * 409), reenviar repetiria para sempre uma requisição que nunca vai passar. Só
 * falha de rede entra na fila. Ver `ehFalhaDeRede`.
 *
 * O RASCUNHO NASCE NA ABERTURA, e não na primeira resposta: quem abriu um
 * questionário e saiu no meio precisa encontrá-lo na lista, marcado como
 * rascunho, em vez de descobrir que nada foi registrado.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { atualizarQuestionario, criarQuestionario } from '@/lib/api/questionarios';
import { confirmar, ehFalhaDeRede, guardar, ler } from '@/lib/rascunhoOffline';

/** Espera entre a última tecla e o envio. */
const ESPERA_MS = 1200;

/**
 * @param {object} p
 * @param {object} p.msal
 * @param {string|null} p.id            id do questionário; null quando ainda não nasceu
 * @param {(novoId: string) => void} p.aoNascer  chamado quando o registro é criado
 * @returns {{ situacao: string, salvarAgora: Function, agendar: Function, pendencia: object|null }}
 */
export function useSalvamentoContinuo({ msal, id, aoNascer }) {
  /** 'ocioso' | 'salvando' | 'salvo' | 'pendente' | 'erro' */
  const [situacao, setSituacao] = useState('ocioso');
  const [erro, setErro] = useState(null);

  const timer = useRef(null);
  const ultimoEnviado = useRef(null);
  /* O payload mais recente fica numa ref, e não em estado: o temporizador
     precisa ler o valor do momento em que dispara, e um estado capturado no
     closure entregaria o valor de quando o timer foi agendado - ou seja, sem a
     última resposta digitada, que é justamente a que motivou o envio. */
  const pendenteRef = useRef(null);
  const idRef = useRef(id);
  useEffect(() => { idRef.current = id; }, [id]);

  const enviar = useCallback(async () => {
    const payload = pendenteRef.current;
    if (!payload) return;

    const idAtual = idRef.current;

    // Nada mudou desde o último envio confirmado: não gasta requisição.
    const assinatura = JSON.stringify(payload);
    if (idAtual && assinatura === ultimoEnviado.current) {
      setSituacao('salvo');
      return;
    }

    // 1. O aparelho primeiro. Sempre.
    if (idAtual) guardar(idAtual, payload);

    setSituacao('salvando');
    setErro(null);

    try {
      if (!idAtual) {
        const r = await criarQuestionario(msal, payload);
        const novoId = r?.questionario?.id;
        if (novoId) {
          idRef.current = novoId;
          aoNascer?.(novoId);
          confirmar(novoId);
        }
      } else {
        await atualizarQuestionario(msal, idAtual, payload);
        confirmar(idAtual);
      }
      ultimoEnviado.current = assinatura;
      setSituacao('salvo');
    } catch (e) {
      if (ehFalhaDeRede(e)) {
        // Fica guardado no aparelho; a tela avisa e o reenvio acontece sozinho.
        setSituacao('pendente');
      } else {
        setSituacao('erro');
        setErro(e);
      }
    }
  }, [msal, aoNascer]);

  /** Agenda o envio. Cada nova resposta reinicia a espera. */
  const agendar = useCallback((payload) => {
    pendenteRef.current = payload;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(enviar, ESPERA_MS);
  }, [enviar]);

  /** Envia já, sem esperar. Usado ao trocar de passo e ao concluir. */
  const salvarAgora = useCallback(async (payload) => {
    if (payload) pendenteRef.current = payload;
    if (timer.current) clearTimeout(timer.current);
    await enviar();
  }, [enviar]);

  /* Reenvia sozinho quando o sinal volta. É o que transforma "perdi a conexão"
     em "vai sair quando der", sem a pessoa precisar lembrar de nada. */
  useEffect(() => {
    const aoVoltar = () => {
      if (pendenteRef.current) enviar();
    };
    window.addEventListener('online', aoVoltar);
    return () => window.removeEventListener('online', aoVoltar);
  }, [enviar]);

  /* Última tentativa quando a aba está sendo escondida ou fechada. Não há
     garantia de que uma requisição assíncrona termine aqui, e por isso ela não
     é a rede de segurança - a cópia no aparelho é. Mas quando dá tempo, evita
     uma pendência que ficaria para a próxima abertura. */
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden' && pendenteRef.current) enviar();
    };
    document.addEventListener('visibilitychange', aoEsconder);
    return () => document.removeEventListener('visibilitychange', aoEsconder);
  }, [enviar]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return {
    situacao,
    erro,
    agendar,
    salvarAgora,
    /** O que ficou guardado no aparelho para este id, se houver. */
    pendencia: id ? ler(id) : null,
  };
}

export default useSalvamentoContinuo;
