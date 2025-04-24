let _hfData = {};

export class HFBrowser extends Application {
  constructor(element, authKey) {
    super();
    if(!ui._HFBrowserStyleLoaded) loadStyle();
    this.inputElement = $(element);
    this.authKey = authKey;
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "hf-browser",
      template: ``,
      resizable: true,
      width: 400,
      height: window.innerHeight > 600 ? 600 : window.innerHeight - 100,
      dragDrop: [{ dragSelector: null, dropSelector: null }],
    };
  }

  static getHeroList() {
    if (!_hfData?.goods) return [];
    return _hfData.goods.map((h) => {
      return {
          displayName: h.name,
          preview: "",
          output: `[HeroForge]{${h.name}}{${h.id}}`,
          search: h.name,
          isNew: false,
          slug: h.name.slugify({ strict: true}),
      };
    });
  }

  async getData() {
    const data = super.getData();
    data.config = {};
    const hfData = await this.getGoods();
    this.hfData = hfData;
    data.hfData = hfData;
    this._heroCount = hfData.miniatures.length;
    return data;
  }

  get title() {
    return "HeroForge® Browser: " + this._heroCount + " miniatures available";
  }

  static async fetchData(authToken) {
    const hfData = {
      goods: [],
    }
    const authKeys = authToken.split(",");
    try{
      for(let authKey of authKeys) {
        const response = await fetch(`https://api.heroforge.com/v1/user/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Token ${authKey}`,
          },
        });
        const data = await response.json();
        hfData.goods = hfData.goods.concat(data.goods);
      }
    } catch(e){
      this.fetchData(authToken);
      ui?.notifications?.error(`Error fetching data from HeroForge: API Key is Invalid or Heroforge servers are down.`);
      console.error(e);
    }

    _hfData = hfData;
    return hfData;
  }

  async getGoods(){
    const HFData = await HFBrowser.fetchData(this.authKey);
    const goods = HFData.goods;

    const data = {
      "miniatures": []
    }
    const packs = {};
    for (const good of goods) {
      const goodData = {
        "name": good.name,
        "id": good.id,
        "portrait": good.img_front,
        "token": good.img_top,
        "thumb": good.img_thumb,
        "perspective": good.img_perspective,
        "mesh": good.mesh,
        "isPack": good.source_type === "pack",
        "isUser": good.source_type === "user",
        "pack": good.source_type === "pack" ? good.source_name : null,
      }
      if (goodData.pack && !packs[goodData.pack]) {
        const h = Math.random() * 360;
        const packColorBG = `hsl(${h}deg 46% 42% / 14%)`;
        const packColorBorder = `hsl(${h}deg 46% 42% / 100%)`;
        packs[goodData.pack] = {packColorBG, packColorBorder};
      }
      if (goodData.pack) {
        goodData.packColorBG = packs[goodData.pack].packColorBG;
        goodData.packColorBorder = packs[goodData.pack].packColorBorder;
      }
      data.miniatures.push(goodData)
    }
    data.miniatures.sort((a, b) => a.name.localeCompare(b.name));
    //sort by pack
    data.miniatures.sort((a, b) => {
      if (a.pack && b.pack) {
        return a.pack.localeCompare(b.pack);
      } else if (a.pack) {
        return -1;
      } else if (b.pack) {
        return 1;
      } else {
        return 0;
      }
    });
    data.miniatures.sort((a, b) => a.isPack - b.isPack);
    //hsl(119deg 46% 42% / 48%)
    return data

  }

  activateListeners(html) {

    super.activateListeners(html);

    html.find("ol").css({
      height: `calc(100% - ${html.find("#three-actor-portrait-header").first().outerHeight()}px - ${html.find(".notes").first().outerHeight()*2}px)`,
    });

    html.on("keyup", `input[name="search"]`, (event) => {
      const query = event.target.value.toLowerCase();
      const ol = html.find("#hf-browser-miniature-list");
      for(const li of ol.find("li")){
        const name = li.dataset.name.toLowerCase();
        if(name.includes(query)){
          li.style.display = "";
        } else {
          li.style.display = "none";
        }
      }
    });

    html.on("click", "li", (event) => {
      const id = $(event.target).closest("li").data("goodid");
      const good = this.hfData.miniatures.find(h => h.id === id);
      html.find(`input[name="file"]`).val(`[HeroForge]{${good.name}}{${good.id}}`);
    })

    html.on("click", "#select-file", (event) => {
      event.preventDefault();
      const fileName = html.find(`input[name="file"]`).val();
      if(!fileName){
        ui.notifications.error("No file selected.");
        return;
      }
      this.inputElement.val(fileName);
      if(this.inputElement[0]?.closest("file-picker")) this.inputElement[0].closest("file-picker").value = fileName;
      this.close();
    });
  }

  close(){
    super.close();
  }

  async _renderInner(data){
    const compiledTemplate = game.threeportrait._compiledTemplate ?? Handlebars.compile(template);
    game.threeportrait._compiledTemplate = compiledTemplate;
    return $(compiledTemplate(data, {
      allowProtoMethodsByDefault: true,
      allowProtoPropertiesByDefault: true
    }));
  }

  static create(filepicker, authKey){
    const fpFG = filepicker.closest(".form-group").length ? filepicker.closest(".form-group") : filepicker;
    const button = $(`
    <button type="button" style="order: 99; height: calc(var(--form-field-height) + 2px); display: flex; align-items: center;justify-content: center;" data-tooltip="Open Heroforge Browser">
    ${HFLogoSvg}
    </button>
    `);
    const input = fpFG.find("input").first();
    const fpButton = fpFG.find("button").first();
    fpButton.before(button);
    button.on("click", (e) => {
      e.preventDefault();
      if(!authKey) return ui.notifications.error("No auth key provided. Please configure the auth key in the module settings.");
      new HFBrowser(input, authKey).render(true);
    })
  }

  static getModel(path){
    const originalPath = path;
    path = path.replace("[HeroForge]", "")
    path = path.split("}{");
    const name = path[0].replace("{", "");
    const id = path[1].replace("}", "");
    let good = _hfData.goods.find(h => h?.id == id) ?? _hfData.goods.find(h => h?.name == name);
    return good?.gltf || good?.mesh || originalPath;
  }

}


function loadStyle(){
  if(ui._HFBrowserStyleLoaded) return;
  ui._HFBrowserStyleLoaded = true;
  $('head').append(`<style>
  #hf-browser form{
    height: 100%;
    overflow: hidden;
}

#hf-browser ol{
    list-style-type: none;
    margin: 0;
    padding: 0;
    margin-top: 0.5rem;
    overflow-y: auto;
    overflow-x: hidden;
    display: grid;
    grid-template-columns: repeat( auto-fit, minmax(100px, 1fr) );
    align-items: end;
    gap: 0.3rem;
}

#hf-browser li{
    padding: 0.5rem;
    display: flex;
    align-items: center;
    border: 1px solid var(--color-border-dark-5);
    border-radius: 5px;
    background: #00000042;
}

#hf-browser li.hf-user{
  background: #759b3a24;
  border-color: #759b3a;
}

#hf-browser li:hover{
  text-shadow: 0 0 8px var(--color-shadow-primary);
  cursor: pointer;
}

#hf-browser img{
    border: none;
    max-height: 100px;
    margin-right: 1rem;
}

#hf-browser .hf-browser-text-container{
    display: flex;
    flex-direction: column;
    width: 100%;
    font-size: 0.6rem;
    text-align: center;
    white-space: nowrap;
}

#hf-browser .hf-browser-text-container h2{
  text-overflow: ellipsis;
  overflow: hidden;
}

#hf-browser .hf-browser-image-container{
    display: flex;
    justify-content: center;
    align-items: center;
    aspect-ratio: 1;
    background-position: center !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
}

#hf-browser-enable-portrait-label{
    text-align: right;
}


  </style>`);
}

const template = `
<form>
    <div id="three-actor-portrait-header">
        <div class="form-group">
            <input type="text" name="search" placeholder="Search for a hero..." value="">
        </div>
        <div class="form-group selected-file">
            <label><i class="fas fa-file fa-fw"></i> Selected</label>
            <input type="text" name="file" value="">

        </div>
        <div class="form-group">
            <button id="select-file">
                <i class="far fa-save"></i> Select File
            </button>
        </div>
    </div>
    <ol id="hf-browser-miniature-list">
        {{#each hfData.miniatures}}
        <li data-goodid="{{id}}" data-name="{{name}}" {{#if isPack}}style="background: {{packColorBG}}; border-color: {{packColorBorder}};"{{/if}} class="hf-browser-miniature {{#if isUser}}hf-user{{/if}}">
            <div class="hf-browser-text-container">
                <h2 id="name" data-tooltip="{{name}}">
                    {{name}}
                </h2>
                <div class="hf-browser-image-container" style="background: url({{portrait}})"></div>
            </div>

        </li>
        {{/each}}
    </ol>
    <p class="notes" style="text-align: center;">3D Portraits is not an officially HeroForge® supported module</p>
</form>
`

const HFLogoSvg = `<svg style="filter: grayscale(1); width: 1rem" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
viewBox="0 0 122.6 121.6" style="enable-background:new 0 0 122.6 121.6;" xml:space="preserve">
<style type="text/css">
.st0{fill-rule:evenodd;clip-rule:evenodd;fill:#8F1831;}
.st1{fill:#F1F0F0;}
</style>
<path class="st0" d="M61.3,0H0v96.9c0,2.2,0.7,4.6,2.1,6.3c1.6,2.1,3.4,3.3,6,3.9l53.2,14.4l53.2-14.4c2.6-0.7,4.4-1.9,6-3.9
c1.4-1.7,2.1-4.1,2.1-6.3V0H61.3z"/>
<g>
<path class="st1" d="M48.6,91.2l7.4-7.9c11.2-12,25.8-12.5,33.9-19.3c-1.4,3.8-3.5,6.3-6.6,8.6c-5.1,3.7-11.6,5.9-15.7,10.6
 c8.1-3.6,18.8-3.1,27.9-7.8c-7.5,11-16.8,8.6-26.2,14.7c8-1.1,15.6-0.5,22.6,4.4C84,93.9,80.1,95,71.9,97.9
 c-10.7,3.8-20.3,2.7-30.3-2.6c7.5,1.1,16.5,0.8,22.3-3.8C59.2,92.7,52.9,92.5,48.6,91.2z"/>
<path class="st1" d="M91.5,89.5c4.1-1.7,6.6-4.4,11.2-0.2C97.7,90.5,97.4,92.4,91.5,89.5z"/>
<path class="st1" d="M96.4,79c4.5-3.2,4.5-8.4,13-7.1C105,75.7,104.3,79.2,96.4,79z"/>
<path class="st1" d="M65.7,24.2l3.8-3.7c1.6-1.6,3.9-1.6,5.5,0l7.9,8.2C87.1,25.9,94,19.5,97,15.3l-2.1-2.2
 c1.3-1.3,3.1-2.1,5.1-2.1c4,0,7.2,3.2,7.2,7.2c0,1-0.2,2-0.6,2.9c-0.4,0.9-1,1.7-1.7,2.4l-3.8-3.9c0.2,0.9,0.4,1.8,0.5,2.6
 c-4.2,3.1-10,9-12.8,12.7l8,8.3c1.4,1.5,1.3,3.9-0.1,5.3l-4,3.8c-2.3-6-5.7-11.7-10.1-16.3c0.7,1.7,1.2,4.1,1.3,5.9L36.6,92.7
 c-4.4,1.9-12.3,3.1-17.4,3.1c0.3-5.1,1.8-12.7,3.9-17.2l54.8-47C74.6,28.7,69.8,25.9,65.7,24.2z"/>
<path class="st1" d="M32.3,11.3c2,7.6-2.4,12.1-4.5,17.2C24.9,18.4,29.3,16.3,32.3,11.3z"/>
<path class="st1" d="M17.9,45.5c2.3-5.7,4.9-9,3.5-18c4.7,5.8,5.6,12.4,4.5,19.7c5.3-10.9,6.4-22.5,17.6-31.5
 c-5.9,11.1-6.8,24-10.5,33.2c8-6.2,8.3-18.3,21.2-22.3c-3.5,3.4-4.8,6.1-6.1,9.2c-4.5,11.2-8.7,18.7-18.2,26.8l-5.6,4.8
 c-1-3.6-1.1-9.5,0-15.1c-4.5,7.1-5,16.4-3.7,22.4C16.6,66.5,13.3,56.7,17.9,45.5z"/>
</g>
</svg>`