/**
 * dj-selector.js
 *
 * Isolated song-selection logic for the DJ module.
 *
 * == Overview ==
 * The DJ module maintains a "target mood": a set of target values for each
 * custom attribute (0–1 range), plus an optional target style set.  It also
 * tracks the "current mood" as the rolling average of custom attributes of
 * the last N songs played (the mood window).
 *
 * When choosing the next song, every eligible candidate track receives a
 * score.  Lower is better.  The candidate with the lowest score is selected.
 *
 * == Scoring algorithm (per candidate) ==
 *
 *  Step 1 – Mood distance
 *    Sum the absolute differences in every custom attribute between the
 *    current mood vector and the candidate track's attributes.
 *
 *  Step 2 – Current-style penalty
 *    If the candidate does not share any style with the currently-playing
 *    song, add the configured stylePenalty.
 *
 *  Step 3 – Liked adjustment
 *    Subtract the candidate's liked score multiplied by the configured
 *    likedBonus.  Liked tracks become "closer" (lower score = preferred).
 *    Disliked tracks become "further" (higher score = avoided).
 *
 *  ─── The above three steps produce distance_A: proximity to current mood ───
 *
 *  Step 4 – Target distance
 *    Sum the absolute differences between the candidate's attributes and
 *    the configured DJ target attributes.  Also add the stylePenalty if
 *    the candidate shares no style with the target style set.
 *
 *  ─── Step 4 produces distance_B: proximity to target mood ───
 *
 *  Step 5 – Final score
 *    score = (distance_A + distance_B) / 2
 *
 *  Steps 1–5 are repeated for every eligible candidate.
 *  The candidate with the lowest final score is played next.
 *
 * == Inputs ==
 * All functions are pure (no side-effects, no imports from server state).
 * Callers are responsible for passing the correct data structures.
 *
 * Types used throughout (informal):
 *   Track       – { id: string, audioPath: string, ... }
 *   AttrValues  – { [attrId: string]: number }   (decayed, ready-to-use values)
 *   StyleSet    – string[]
 *   DJConfig    – { likedBonus, stylePenalty, moodWindow, targetStyles, targetAttributes }
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** The attribute id reserved for the "liked" signal. */
const LIKED_ATTRIBUTE_ID = 'liked'

// ─── Mood vector ─────────────────────────────────────────────────────────────

/**
 * Compute the current mood vector from the last N recently-played tracks.
 *
 * The mood vector is the component-wise average of every *custom* attribute
 * (i.e., all attributes except "liked") across the last `moodWindow` songs.
 *
 * If fewer than `moodWindow` songs have been played the entire history is
 * used.  If the history is empty the returned object is empty ({}).
 *
 * @param {string[]}                   recentlyPlayedIds  Ordered list of track IDs (oldest first).
 * @param {number}                     moodWindow         Number of recent songs to include (>= 1).
 * @param {string[]}                   customAttrIds      IDs of custom (non-liked) attributes.
 * @param {(id: string) => AttrValues} getAttrValues      Callback: returns attribute values for a track.
 * @returns {AttrValues} Component-wise average of custom attributes.
 */
export function computeMoodVector(recentlyPlayedIds, moodWindow, customAttrIds, getAttrValues) {
  if (!Array.isArray(recentlyPlayedIds) || recentlyPlayedIds.length === 0) return {}
  if (!Array.isArray(customAttrIds) || customAttrIds.length === 0) return {}

  // Take the last `moodWindow` entries from the history.
  const window = recentlyPlayedIds.slice(-moodWindow)
  if (window.length === 0) return {}

  // Accumulate sums for each custom attribute.
  const sums = Object.create(null)
  for (const attrId of customAttrIds) sums[attrId] = 0

  for (const trackId of window) {
    const values = getAttrValues(trackId)
    for (const attrId of customAttrIds) {
      const v = typeof values[attrId] === 'number' ? values[attrId] : 0.5
      sums[attrId] += v
    }
  }

  // Divide by window size to get the average.
  const mood = Object.create(null)
  for (const attrId of customAttrIds) {
    mood[attrId] = sums[attrId] / window.length
  }
  return mood
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Compute the sum of absolute differences in custom attributes between
 * `vectorA` and `vectorB`.  Only keys present in `customAttrIds` are
 * considered; missing values default to 0.5.
 *
 * @param {AttrValues} vectorA
 * @param {AttrValues} vectorB
 * @param {string[]}   customAttrIds
 * @returns {number}
 */
function attributeDistance(vectorA, vectorB, customAttrIds) {
  let distance = 0
  for (const attrId of customAttrIds) {
    const a = typeof vectorA[attrId] === 'number' ? vectorA[attrId] : 0.5
    const b = typeof vectorB[attrId] === 'number' ? vectorB[attrId] : 0.5
    distance += Math.abs(a - b)
  }
  return distance
}

/**
 * Return true when the two style arrays share at least one style.
 *
 * @param {StyleSet} stylesA
 * @param {StyleSet} stylesB
 * @returns {boolean}
 */
function sharesStyle(stylesA, stylesB) {
  if (!Array.isArray(stylesA) || !Array.isArray(stylesB)) return false
  const setA = new Set(stylesA)
  return stylesB.some(style => setA.has(style))
}

/**
 * Score a single candidate track against the current mood and DJ target.
 *
 * Lower scores are better.
 *
 * Steps performed (see module-level documentation for full description):
 *   1. Mood distance:       |candidate attrs – currentMood| per attribute (sum)
 *   2. Style penalty A:     +stylePenalty if candidate shares no style with current song
 *   3. Liked adjustment:    –(likedValue × likedBonus)
 *   4. Target distance:     |candidate attrs – targetAttributes| per attribute (sum)
 *                           +stylePenalty if candidate shares no style with targetStyles
 *   5. Final score:         (distanceA + distanceB) / 2
 *
 * @param {Track}      candidate        The track being evaluated.
 * @param {AttrValues} candidateAttrs   Pre-computed attribute values for the candidate.
 * @param {StyleSet}   candidateStyles  Styles assigned to the candidate.
 * @param {AttrValues} currentMood      Rolling average of the last N played tracks' attributes.
 * @param {StyleSet}   currentStyles    Styles of the currently-playing track.
 * @param {object}     djConfig         DJ module settings.
 * @param {number}     djConfig.likedBonus    Scalar multiplier for the liked signal.
 * @param {number}     djConfig.stylePenalty  Point penalty when styles don't match.
 * @param {StyleSet}   djConfig.targetStyles  Target style set from the DJ module.
 * @param {AttrValues} djConfig.targetAttributes  Target attribute vector from the DJ module.
 * @param {string[]}   customAttrIds    IDs of custom (non-liked) attributes.
 * @returns {number} The final score for this candidate (lower = preferred).
 */
export function scoreCandidateTrack(
  candidate,
  candidateAttrs,
  candidateStyles,
  currentMood,
  currentStyles,
  djConfig,
  customAttrIds,
) {
  const { likedBonus = 1, stylePenalty = 0.1, targetStyles = [], targetAttributes = {} } = djConfig

  // ── Step 1: distance from current mood vector ──────────────────────────
  let distanceA = attributeDistance(candidateAttrs, currentMood, customAttrIds)

  // ── Step 2: penalty if candidate doesn't match current song's styles ───
  if (!sharesStyle(candidateStyles, currentStyles)) {
    distanceA += stylePenalty
  }

  // ── Step 3: subtract liked score × bonus (liked tracks score lower) ────
  const likedValue = typeof candidateAttrs[LIKED_ATTRIBUTE_ID] === 'number'
    ? candidateAttrs[LIKED_ATTRIBUTE_ID]
    : 0
  distanceA -= likedValue * likedBonus

  // ── Step 4: distance from DJ target ────────────────────────────────────
  let distanceB = attributeDistance(candidateAttrs, targetAttributes, customAttrIds)
  if (targetStyles.length > 0 && !sharesStyle(candidateStyles, targetStyles)) {
    distanceB += stylePenalty
  }

  // ── Step 5: final score = average of the two distances ─────────────────
  return (distanceA + distanceB) / 2
}

// ─── Next-track selection ────────────────────────────────────────────────────

/**
 * Select the next track to play using the DJ scoring algorithm.
 *
 * Algorithm:
 *  1. Compute the current mood vector from the last `djConfig.moodWindow` songs.
 *  2. Filter out the current song (and optionally recently-played songs within
 *     `djConfig.minRepeats`) from the candidate pool.  If filtering leaves an
 *     empty pool, fall back to the full list to avoid silence.
 *  3. Score every remaining candidate.
 *  4. Return the candidate with the lowest score.
 *
 * All callbacks are synchronous.  The function never mutates any argument.
 *
 * @param {Track[]}                    candidates         All tracks eligible for this overlay.
 * @param {string | null}              currentTrackId     ID of the currently-playing track (may be null).
 * @param {string[]}                   recentlyPlayedIds  Ordered history of played track IDs (oldest first).
 * @param {object}                     djConfig           DJ module settings (see scoreCandidateTrack).
 * @param {string[]}                   customAttrIds      IDs of custom (non-liked) attributes.
 * @param {(id: string) => AttrValues} getAttrValues      Returns decayed attribute values for a track.
 * @param {(id: string) => StyleSet}   getStyles          Returns the style array for a track.
 * @returns {Track | null} The selected track, or null when the candidate list is empty.
 */
export function selectNextTrack(
  candidates,
  currentTrackId,
  recentlyPlayedIds,
  djConfig,
  customAttrIds,
  getAttrValues,
  getStyles,
) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  const { moodWindow = 5, minRepeats = 0 } = djConfig

  // ── Step 1: Compute current mood vector ────────────────────────────────
  const moodVector = computeMoodVector(recentlyPlayedIds, moodWindow, customAttrIds, getAttrValues)

  // ── Step 2: Build candidate pool, honouring minRepeats ─────────────────
  // Collect the IDs of songs that were played within the last `minRepeats`
  // slots.  These are temporarily excluded from the pool.
  const recentlyPlayedSet = new Set(
    minRepeats > 0 ? recentlyPlayedIds.slice(-minRepeats) : [],
  )
  // Always exclude the currently-playing song so we don't immediately repeat.
  if (currentTrackId) recentlyPlayedSet.add(currentTrackId)

  let pool = candidates.filter(track => !recentlyPlayedSet.has(track.id))

  // If every candidate is in the exclusion set (e.g. tiny library), fall back
  // to the full candidate list so playback never stalls.
  if (pool.length === 0) pool = candidates

  // ── Step 3 & 4: Score every candidate and pick the lowest ──────────────
  const currentStyles = currentTrackId ? getStyles(currentTrackId) : []

  let bestTrack = null
  let bestScore = Infinity

  for (const candidate of pool) {
    const attrs  = getAttrValues(candidate.id)
    const styles = getStyles(candidate.id)
    const score  = scoreCandidateTrack(
      candidate,
      attrs,
      styles,
      moodVector,
      currentStyles,
      djConfig,
      customAttrIds,
    )
    if (score < bestScore) {
      bestScore = score
      bestTrack = candidate
    }
  }

  return bestTrack
}
