// Shared leaderboard rules for the POD screen and the HQ ticker so both rank
// the pod the same way.

// Order the pod by kebab count, then float the current player (`you`) to the
// top of their tie group — among equals, you always see yourself first. Ties
// are otherwise left level (decided by count alone, no streak/rating tiebreak).
export function rankCrew(crew) {
  return [...crew].sort(
    (a, b) => b.kebabs - a.kebabs || (a.you ? -1 : b.you ? 1 : 0),
  );
}

// Standard competition ranking on kebab count alone: a player's place is the
// number of players with strictly more kebabs, plus one. So 10/10/7 → 1, 1, 3
// and tied players genuinely share a place rather than one sorting above.
// `ranked` must include the whole pod so the count is complete.
export function placeOf(ranked, i) {
  return ranked.filter(p => p.kebabs > ranked[i].kebabs).length + 1;
}
