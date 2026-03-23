const DEFAULT_MAX_FINGERPRINTS = 5000;

export function createTeamsWatcherState({ maxFingerprints = DEFAULT_MAX_FINGERPRINTS } = {}) {
  const seenFingerprints = new Map();
  let initialized = false;
  let lastPageUrl = null;

  function rememberFingerprint(fingerprint) {
    if (!fingerprint) {
      return;
    }

    seenFingerprints.delete(fingerprint);
    seenFingerprints.set(fingerprint, Date.now());

    while (seenFingerprints.size > maxFingerprints) {
      const oldestFingerprint = seenFingerprints.keys().next().value;
      seenFingerprints.delete(oldestFingerprint);
    }
  }

  return {
    ingestCandidates(candidates, pageUrl) {
      const normalizedCandidates = (candidates || []).filter((candidate) => candidate?.fingerprint);

      if (!initialized || pageUrl !== lastPageUrl) {
        seenFingerprints.clear();
        normalizedCandidates.forEach((candidate) => rememberFingerprint(candidate.fingerprint));
        initialized = true;
        lastPageUrl = pageUrl;

        return {
          isBaseline: true,
          newCandidates: [],
        };
      }

      const newCandidates = [];

      for (const candidate of normalizedCandidates) {
        if (seenFingerprints.has(candidate.fingerprint)) {
          continue;
        }

        rememberFingerprint(candidate.fingerprint);
        newCandidates.push(candidate);
      }

      return {
        isBaseline: false,
        newCandidates,
      };
    },
  };
}
