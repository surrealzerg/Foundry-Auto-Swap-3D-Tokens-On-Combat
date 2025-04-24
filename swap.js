console.log("Auto Swap 3D Tokens on Combat Module Loaded");

const MODULE_ID = "swap-3d-tokens-on-combat";
const FLAG_KEY = "flags.levels-3d-preview.model3d";

/**
 * Swaps the 3D model for each configured token based on mode.
 * @param {string} mode - "normal" or "battle"
 */
async function swapAllTokens(mode) {
  const settings = game.settings.get(MODULE_ID, "playerModels");

  for (const [actorId, models] of Object.entries(settings)) {
    const modelPath = models?.[mode];
    if (!modelPath) {
      console.warn(`[${MODULE_ID}] No model path defined for actor ${actorId} in mode: ${mode}`);
      continue;
    }

    // Find the active token on the canvas for this actor
    const token = canvas.tokens.placeables.find(t => t.actor?.id === actorId);
    if (!token) {
      console.warn(`[${MODULE_ID}] Could not find token for actor ${actorId} on the canvas.`);
      continue;
    }

    // Update the model
    await token.document.update({
      [FLAG_KEY]: modelPath
    });

    console.log(`[${MODULE_ID}] Updated ${token.name}'s model to: ${modelPath}`);
  }
}

// Swap to battle model when combat starts
Hooks.on("createCombat", () => {
  console.log(`[${MODULE_ID}] Combat started – swapping to battle models.`);
  swapAllTokens("battle");
});

// Swap to normal model when combat ends
Hooks.on("deleteCombat", () => {
  console.log(`[${MODULE_ID}] Combat ended – swapping to normal models.`);
  swapAllTokens("normal");
});
