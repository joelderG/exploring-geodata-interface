export const gestureConfig = {
  // How long touch history is retained for gesture recognition.
  historyWindowMs: 2000,
  swipeHorizontal: {
    // Maximum swipe duration; longer gestures are ignored.
    maxDurationMs: 1500,
    // Max allowed vertical movement to still be considered horizontal.
    maxVerticalDelta: 0.2,
    // Minimum horizontal movement required to trigger a swipe.
    minHorizontalDelta: 0.6,
    // Cooldown after a swipe is recognized to avoid repeated triggers.
    cooldownMs: 600
  },
  swipeVertical: {
    // Maximum swipe duration; longer gestures are ignored.
    maxDurationMs: 1500,
    // Max allowed horizontal movement to still be considered vertical.
    maxHorizontalDelta: 0.2,
    // Minimum vertical movement required to trigger a top-to-bottom swipe.
    minVerticalDelta: 0.6,
    // Cooldown after a swipe is recognized to avoid repeated triggers.
    cooldownMs: 400
  },
  contextMenuDrag: {
    // Maximum drag duration; longer gestures are ignored.
    maxDurationMs: 2000,
    // Max allowed vertical movement to still be considered a horizontal drag.
    maxVerticalDelta: 0.25,
    // Max allowed horizontal movement to still be considered a vertical drag.
    maxHorizontalDelta: 0.25,
    // Minimum horizontal movement required to trigger a drag.
    minHorizontalDelta: 0.10,
    // Minimum vertical movement required to trigger a downward drag.
    minVerticalDelta: 0.10,
    // Cooldown after a drag is recognized to avoid repeated triggers.
    cooldownMs: 500
  }
};
