import { shuffle } from './verbAnswers.js'

const TENSES = ['base', 'pastSimple', 'pastParticiple']

// Por debajo de este dominio (0-1) un verbo se considera "flojo".
export const WEAK_THRESHOLD = 0.8
// Entre el 50% y el 60% de cada ronda sale de los verbos flojos (si hay
// suficientes); el resto, al azar, para mantener la variedad y la cobertura.
const WEAK_SHARE_MIN = 0.5
const WEAK_SHARE_MAX = 0.6

// Dominio de un verbo = el de su forma más floja de entre las ya practicadas.
// Devuelve null si el verbo aún no se ha practicado nunca.
export function getVerbMastery(stats, base) {
  const verbStats = stats[base]
  if (!verbStats) return null
  let weakest = null
  for (const tense of TENSES) {
    const entry = verbStats[tense]
    if (!entry) continue
    if (!weakest || entry.mastery < weakest.mastery) {
      weakest = { tense, mastery: entry.mastery, seen: entry.seen }
    }
  }
  if (!weakest) return null
  const seen = TENSES.reduce((sum, tense) => sum + (verbStats[tense]?.seen ?? 0), 0)
  return { mastery: weakest.mastery, weakestTense: weakest.tense, seen }
}

// Verbos flojos en orden aleatorio ponderado: cuanto menor el dominio, más
// probable que salga antes, pero sin que sean siempre los mismos
// (muestreo ponderado de Efraimidis-Spirakis).
export function rankWeakVerbs(verbs, stats) {
  return verbs
    .map((verb) => ({ verb, info: getVerbMastery(stats, verb.base) }))
    .filter(({ info }) => info && info.mastery < WEAK_THRESHOLD)
    .map(({ verb, info }) => {
      const weight = 1 - info.mastery + 0.05
      return { verb, weakestTense: info.weakestTense, key: Math.random() ** (1 / weight) }
    })
    .sort((a, b) => b.key - a.key)
    .map(({ verb, weakestTense }) => ({ verb, weakestTense }))
}

export function weakTargetCount(count) {
  const share = WEAK_SHARE_MIN + Math.random() * (WEAK_SHARE_MAX - WEAK_SHARE_MIN)
  return Math.round(count * share)
}

// Elige `count` verbos distintos: una parte de los flojos y el resto al azar,
// devueltos en orden aleatorio. `weakestTense` es null en los elegidos al azar.
export function pickRoundVerbs(verbs, count, stats) {
  const weak = rankWeakVerbs(verbs, stats).slice(0, weakTargetCount(count))
  const weakBases = new Set(weak.map(({ verb }) => verb.base))
  const random = shuffle(verbs.filter((verb) => !weakBases.has(verb.base)))
    .slice(0, count - weak.length)
    .map((verb) => ({ verb, weakestTense: null }))
  return shuffle([...weak, ...random])
}

// Para la página de progreso: los verbos flojos, del más flojo al menos.
export function getHardestVerbs(verbs, stats, limit) {
  return verbs
    .map((verb) => ({ verb, ...getVerbMastery(stats, verb.base) }))
    .filter((entry) => entry.mastery != null && entry.mastery < WEAK_THRESHOLD)
    .sort((a, b) => a.mastery - b.mastery || b.seen - a.seen)
    .slice(0, limit)
}
