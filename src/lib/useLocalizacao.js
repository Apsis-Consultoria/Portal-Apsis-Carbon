/**
 * useLocalizacao - lê o GPS do aparelho para a capa do questionário de campo.
 *
 * POR QUE NÃO É `getCurrentPosition` E PRONTO. A primeira leitura que o
 * navegador entrega quase nunca é do GPS: é a estimativa por rede ou wi-fi, com
 * precisão de centenas de metros a quilômetros. Ela chega em um segundo e parece
 * ótima. Gravar essa é registrar o ponto de alerta no lugar errado.
 *
 * O formulário da ronda diz isto em português: "aguarde até que o GPS tenha a
 * melhor precisão possível". Então aqui se usa `watchPosition` e se guarda a
 * MELHOR leitura vista até agora - a de menor `accuracy`. A pessoa caminha até o
 * ponto, o número cai de 1500 m para 8 m, e é o 8 que fica.
 *
 * QUANDO PARA. Três saídas, e as três importam num aparelho de campo com bateria
 * contada:
 *   1. precisão chegou a BOA_O_BASTANTE - não há o que melhorar;
 *   2. passou TETO_MS procurando - GPS que não fixou em três minutos não vai
 *      fixar, e continuar tentando só consome bateria;
 *   3. a tela fechou.
 *
 * SEM SINAL DE INTERNET O GPS FUNCIONA, mas devagar. Sem assistência da rede
 * (A-GPS) uma fixação fria leva de 30 a 90 segundos, às vezes mais sob copa
 * fechada. Por isso `timeout` alto e por isso um timeout NÃO é tratado como
 * fracasso: é "ainda procurando".
 *
 * PRECISA DE CONTEXTO SEGURO (https ou localhost) e do cabeçalho
 * Permissions-Policy liberando `geolocation=(self)`. Ver o bloco de headers do
 * amplify.yml: com a lista vazia, nem o nosso próprio código consegue chamar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Precisão em metros a partir da qual não vale continuar procurando. */
const BOA_O_BASTANTE = 10;

/** Quanto tempo procurar antes de desistir sozinho. */
const TETO_MS = 3 * 60 * 1000;

/** Tempo que o navegador tem para entregar cada leitura. */
const ESPERA_MS = 60 * 1000;

/**
 * @returns {{
 *   situacao: 'indisponivel'|'procurando'|'obtida'|'negada'|'erro',
 *   leitura: {latitude:number, longitude:number, altitude_m:number|null, precisao_m:number|null}|null,
 *   mensagem: string|null,
 *   demorando: boolean,
 *   procurarDeNovo: () => void,
 * }}
 */
export function useLocalizacao({ ligado = true } = {}) {
  const suportado =
    typeof navigator !== 'undefined' && typeof navigator.geolocation?.watchPosition === 'function';

  const [situacao, setSituacao] = useState(suportado ? 'procurando' : 'indisponivel');
  const [leitura, setLeitura] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [demorando, setDemorando] = useState(false);
  /* Muda para forçar o efeito a rodar de novo quando a pessoa toca em "tentar
     de novo" depois de negar a permissão e liberar nas configurações. */
  const [tentativa, setTentativa] = useState(0);

  /* A melhor precisão vista fica em ref, e não em estado: o callback do
     watchPosition é criado uma vez e leria um valor congelado do closure. */
  const melhorRef = useRef(Infinity);

  const procurarDeNovo = useCallback(() => {
    melhorRef.current = Infinity;
    setLeitura(null);
    setMensagem(null);
    setDemorando(false);
    setSituacao(suportado ? 'procurando' : 'indisponivel');
    setTentativa((t) => t + 1);
  }, [suportado]);

  useEffect(() => {
    if (!ligado || !suportado) return undefined;

    let vigia = null;
    let vivo = true;

    const encerrar = () => {
      if (vigia !== null) {
        navigator.geolocation.clearWatch(vigia);
        vigia = null;
      }
    };

    const aoLer = (pos) => {
      if (!vivo) return;
      const c = pos.coords;
      const precisao = Number.isFinite(c.accuracy) ? c.accuracy : null;

      /* Só substitui se melhorou. Sem esta comparação, uma leitura ruim que
         chegue depois de uma boa apagaria a boa - e é comum o aparelho oscilar
         entre a fixação de satélite e a estimativa de rede. */
      const melhorouOuPrimeira = precisao === null
        ? melhorRef.current === Infinity
        : precisao <= melhorRef.current;
      if (!melhorouOuPrimeira) return;

      melhorRef.current = precisao ?? melhorRef.current;
      setLeitura({
        latitude: c.latitude,
        longitude: c.longitude,
        altitude_m: Number.isFinite(c.altitude) ? c.altitude : null,
        precisao_m: precisao,
      });
      setSituacao('obtida');
      setMensagem(null);
      setDemorando(false);

      if (precisao !== null && precisao <= BOA_O_BASTANTE) encerrar();
    };

    const aoFalhar = (e) => {
      if (!vivo) return;

      // 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT
      if (e.code === 1) {
        encerrar();
        setSituacao('negada');
        setMensagem(
          'O aparelho não autorizou o acesso à localização. Preencha à mão, ou libere nas ' +
          'permissões do navegador para este site.',
        );
        return;
      }

      /* Timeout não é fracasso: sem internet, uma fixação fria leva minutos.
         Só avisa que está demorando e deixa o watch seguir. */
      if (e.code === 3) {
        setDemorando(true);
        return;
      }

      // Posição indisponível com alguma leitura no bolso não apaga a leitura.
      if (melhorRef.current !== Infinity) {
        setDemorando(true);
        return;
      }
      setSituacao('erro');
      setMensagem('O aparelho não conseguiu obter a posição. Preencha à mão.');
    };

    vigia = navigator.geolocation.watchPosition(aoLer, aoFalhar, {
      enableHighAccuracy: true,
      timeout: ESPERA_MS,
      // Zero de propósito: o que interessa é onde a pessoa está AGORA, e não uma
      // posição em cache de quando ela saiu do acampamento.
      maximumAge: 0,
    });

    const teto = setTimeout(() => {
      if (!vivo) return;
      encerrar();
      setDemorando(false);
      if (melhorRef.current === Infinity) {
        setSituacao('erro');
        setMensagem('O GPS não fixou em três minutos. Preencha à mão ou tente de novo a céu aberto.');
      }
    }, TETO_MS);

    return () => {
      vivo = false;
      clearTimeout(teto);
      encerrar();
    };
  }, [ligado, suportado, tentativa]);

  return { situacao, leitura, mensagem, demorando, procurarDeNovo };
}

export default useLocalizacao;
