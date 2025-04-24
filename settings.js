import { HFBrowser } from "./HFBrowser.js";

class TokenSwapConfig extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
        title: "Token Model Swaps",
        id: "token-swap-config",
        template: "modules/swap-3d-tokens-on-combat/templates/settings.html",
        width: 800,
        height: "auto",
        closeOnSubmit: true
      });
    }
  
    getData() {
      const settings = game.settings.get("swap-3d-tokens-on-combat", "playerModels");
    
      const players = game.actors
      .filter(actor => actor.type === "character")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(actor => ({
        id: actor.id,
        name: actor.name,
        settings: settings[actor.id] || { normal: "", battle: "" }
      }));
    
      return { players };
    }
    
        
  
    activateListeners(html) {
      super.activateListeners(html);
  
      // File Picker
      html.find(".browse-file").click(ev => {
        const target = ev.currentTarget.dataset.target;
        new FilePicker({
          type: "image",
          callback: path => html.find(`input[name="${target}"]`).val(path)
        }).browse();
      });
  
      // Token Picker
      html.find(".select-token").click(ev => {
        const target = ev.currentTarget.dataset.target;
        const tokens = canvas.tokens.placeables.filter(t => t.actor);
  
        if (tokens.length === 0) {
          ui.notifications.warn("No tokens found on the scene.");
          return;
        }
  
        const options = tokens.map(t => {
          const model = t.document.flags["levels-3d-preview"]?.model3d || "";
          return `<option value="${model}">${t.name}</option>`;
        }).join("");
  
        new Dialog({
          title: "Choose a Token Model",
          content: `<select id="model-select">${options}</select>`,
          buttons: {
            confirm: {
              label: "Select",
              callback: dlg => {
                const selected = dlg.find("#model-select").val();
                html.find(`input[name="${target}"]`).val(selected);
              }
            },
            cancel: { label: "Cancel" }
          }
        }).render(true);
      });
  
      // HeroForge Browser
      html.on("click", ".heroforge-browser", ev => {
        const target = ev.currentTarget.dataset.target;
        const input = html.find(`input[name="${target}"]`);
        if (!input.length) {
          ui.notifications.warn("Could not find input field for HeroForge path.");
          return;
        }
      
        const authKey = game.settings.get("swap-3d-tokens-on-combat", "authKey") ?? "";
        const browser = new HFBrowser(input.parent(), authKey);
        browser.render(true);
      
        // ✅ Wait for user to hit "Select File"
        let lastValue = "";
        const interval = setInterval(() => {
          const fileInput = document.querySelector('input[name="file"]');
          if (!fileInput) return;

          const val = fileInput.value;
          if (val && val !== lastValue && val.includes("[HeroForge]")) {
            lastValue = val;

            input.val(val);
            input[0].value = val;
            input.trigger("change");

            console.log("✅ Synced HeroForge model to input:", val);
            clearInterval(interval); // stop checking after success
          }
        }, 200);

      });      
    
    }
  
    async _updateObject(_event, formData) {
        console.log("🧪 Raw formData received by _updateObject:", formData);
      
        const newSettings = {};
        for (const [key, value] of Object.entries(formData)) {
          const [actorId, mode] = key.split("-");
          if (!actorId || !mode) continue;
      
          if (!newSettings[actorId]) newSettings[actorId] = {};
          newSettings[actorId][mode] = value.trim();
        }
      
        console.log("💾 Processed settings to save:", newSettings);
        await game.settings.set("swap-3d-tokens-on-combat", "playerModels", newSettings);
      }
      
      
  }

Hooks.on("init", () => {
    console.log("Loaded Auto Swap 3D Tokens on Combat");
    const MODULE_ID = "swap-3d-tokens-on-combat";

  game.settings.register(MODULE_ID, "playerModels", {
    name: "3D Model Assignments",
    hint: "Stores 3D model paths for peace and battle mode.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });``

  game.settings.registerMenu(MODULE_ID, "configMenu", {
    name: "Configure Token Swap Models",
    label: "Open Token Model Settings",
    icon: "fas fa-users-cog",
    type: TokenSwapConfig,
    restricted: true
  });

  game.settings.register("swap-3d-tokens-on-combat", "authKey", {
    name: "HeroForge Auth Key",
    hint: "Paste your HeroForge authentication key here to access your models.",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

});


  


