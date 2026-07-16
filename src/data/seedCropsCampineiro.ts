import type { Crop, PersistedCropState } from '@/types/session'

const EDITION_ID = 'campineiro-campinas-2025-05-24'

/** Dados fixos de demonstração até a API de clientes por notícia estar disponível. */
export const SEED_CROPS_CAMPINEIRO: PersistedCropState = {
  crops: {
    'crop-f20beba8': {
      id: 'crop-f20beba8',
      rect: {
        x: 49.38886095175542,
        y: 41.07345344588636,
        width: 48.106033394566964,
        height: 18.310864726386963,
      },
      title:
        'Dom Pedro, pelo valor de R$ 401,7 milhões. Fundo paga R$ 401 Segundo o comunicado, a operação milhões por participação',
      text: 'constituiu na compra de 4 milhões de\ncotas do HPDP11 e 13,4 mil cotas do PQDP11 no shopping Parque\n— fundos de investimento imobiliário Dom Pedro\nligados ao ativo. Com a conclusão\ndessas aquisições, a fatia do HGBS11 no\nMenos de dois meses após ter vendido empreendimento passou de 7% para\numa participação de 12,086% do shopping aproximadamente 20%, consolidando o\nParque Dom Pedro para um fundo shopping como o ativo mais representativo\nimobiliário, por R$ 292 milhões, o fundo da sua carteira. O shopping Parque Dom\nimobiliário que administra o centro de Pedro conta com 448 lojas em operação\ncompras de Campinas fechou um novo em uma área bruta locável (ABL) de 126\nnegócio. O fundo imobiliário Hedge Brasil mil metros quadrados (m²). Em 2025, o\nShopping anunciou, por meio de fato centro de compras registrou cerca de R$\nrelevante, que adquiriu uma participação 2,3 bilhões em vendas e recebe em torno\nindireta adicional no Shopping Parque de 1,6 milhão de visitantes ao mês.',
      groupId: null,
      finalized: false,
      displayIndex: 1,
      pdfId: 'pdf-campineiro-campinas',
      pageNumber: 3,
      editionId: EDITION_ID,
      clientKeywordsFound: ['campinas'],
    },
    'crop-36ac52d8': {
      id: 'crop-36ac52d8',
      rect: {
        x: 68.11814328670683,
        y: 59.55230775691908,
        width: 29.889882082490942,
        height: 14.279114694888918,
      },
      title: 'Viracopos tem alta de 12,3% em movimentação de cargas',
      text: 'Puxado pelos setores farmacêutico, tecnológico\ne metalmecânico, o Aeroporto Internacional de\nViracopos, em Campinas, encerrou o primeiro\ntrimestre de 2026 com um aumento de 12,3% no\nmovimento de cargas. De acordo com a concessionária\nque administra o espaço, passaram pelo Aeroporto\nentre janeiro e março deste ano 70,1 mil toneladas.\nO volume representa cerca de um terço de toda a\ncarga internacional que circulou pelos aeroportos\nbrasileiros nos três primeiros meses do ano.',
      groupId: null,
      finalized: false,
      displayIndex: 2,
      pdfId: 'pdf-campineiro-campinas',
      pageNumber: 3,
      editionId: EDITION_ID,
      clientKeywordsFound: ['campinas'],
    },
    'crop-75498052': {
      id: 'crop-75498052',
      rect: {
        x: 68.24642604242567,
        y: 73.91541724413086,
        width: 29.633316571053253,
        height: 22.846583511822267,
      },
      title: 'Multinacional vai investir R$ 280 milhões em Indaiatuba',
      text: 'Pesquisa recente divulgada pelo Centro das\nIndústrias do Estado de São Paulo (Ciesp) – Regional\nCampinas aponta cautela do setor industrial para\nnovos investimentos. No entanto, muitas empresas\nseguem investindo na região de Campinas. Segundo\nmatéria publicada pelo portal CompreRural, a\nsubsidiária brasileira Yanmar vai investir R$ 280\nmilhões, até o final deste ano, para construção de\numa nova fábrica na cidade de Indaiatuba, onde está\ninstalada.\nO investimento, de acordo com Wagner Santaniello,\ngerente de inovação e marketing da Yanmar América\ndo Sul, tem como objetivo a expansão da produção de\nmáquinas para atender a demanda da mecanização\nentre pequenos produtores. A multinacional japonesa\nYanmar é uma das maiores fornecedoras de tratores\ncompactos e soluções voltadas para o campo.',
      groupId: null,
      finalized: false,
      displayIndex: 3,
      pdfId: 'pdf-campineiro-campinas',
      pageNumber: 3,
      editionId: EDITION_ID,
      clientKeywordsFound: ['campinas', 'empreendedorismo'],
    },
    'crop-939636f3': {
      id: 'crop-939636f3',
      rect: {
        x: 2.052524091501524,
        y: 59.468312964596194,
        width: 65.42420541661109,
        height: 37.377682583679814,
      },
      title:
        'Guerra no Oriente Médio impacta indústrias da região; 65% das empresas já apontam reflexos',
      text: 'A região de Campinas já apontam reflexos em suas operações.\nPara 35% das respondentes até o momento não há impacto\nperceptível. Com pouco mais de um mês de conflito e sem perspectivas\nde final, o conflito no Irã, deflagrado no dia 28 de fevereiro,\nimpacta a cadeia produtiva local. Na sondagem, 50% das empresas que\nresponderam indicam impacto moderado, com a necessidade de ajustes\npreventivos. No conjunto, 65% das indústrias da região relatam algum\ntipo de efeito sobre custos, prazos de entrega ou disponibilidade de\ninsumos, reforçando a cautela do setor diante do cenário econômico\ninternacional.',
      groupId: null,
      finalized: false,
      displayIndex: 4,
      pdfId: 'pdf-campineiro-campinas',
      pageNumber: 3,
      editionId: EDITION_ID,
      clientKeywordsFound: ['campinas', 'economia'],
    },
  },
  groups: {},
}

export function getSeedCropsForEdition(editionId: string): PersistedCropState | null {
  if (editionId === EDITION_ID) return SEED_CROPS_CAMPINEIRO
  return null
}

export function normalizeSeedCrop(crop: Crop): Crop {
  return {
    ...crop,
    finalized: crop.finalized ?? false,
    displayIndex: crop.displayIndex ?? 0,
    clientKeywordsFound: crop.clientKeywordsFound ?? [],
    newsItemId: crop.newsItemId ?? null,
  }
}
