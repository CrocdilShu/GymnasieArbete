/*:
 * @plugindesc Displays Action HUDs for items, skills, weapons, and shields.
 * 
 * @param Hud Start Visible
 * @desc Show the HUD at the start of the game.
 * @default true
 *
 * @param Hud Font Size
 * @desc Font size for cost text.
 * @default 18
 *
 * @param Hud Item Color
 * @desc Text color for item counts (0-31).
 * @default 0
 *
 * @param Hud Mp Color
 * @desc Text color for MP costs (0-31).
 * @default 3
 *
 * @param Hud Tp Color
 * @desc Text color for TP costs (0-31).
 * @default 5
 *
 * @param Item Hud X-Axis
 * @default 350
 *
 * @param Item Hud Y-Axis
 * @default 560
 *
 * @param Skill Hud X-Axis
 * @default 392
 *
 * @param Skill Hud Y-Axis
 * @default 560
 *
 * @param Weapon Hud X-Axis
 * @default 434
 *
 * @param Weapon Hud Y-Axis
 * @default 560
 *
 * @param Shield Hud X-Axis
 * @default 480
 *
 * @param Shield Hud Y-Axis
 * @default 560
 *
 * @help  
 * =============================================================================
 * ACTION TOOL HUD
 * =============================================================================
 * Displays HUD icons and costs for your current action equipment.
 * 
 * Images must be placed in /img/chrono/ (or renamed folder):
 * Tool_Item.png, Tool_Skill.png, Tool_Weapon.png, Tool_Shield.png
 *
 * PLUGIN COMMANDS
 * =============================================================================
 * tool_item_visible : true/false
 * tool_skill_visible : true/false
 * tool_weapon_visible : true/false
 * tool_shield_visible : true/false
 * tool_hud_visible : true/false (Toggles all)
 */

var Imported = Imported || {};
Imported.AbsToolHud = true;
var AbsEngine = AbsEngine || {}; 

AbsEngine.hudParams = PluginManager.parameters('ActionToolHud');
AbsEngine.hud_startVisible = String(AbsEngine.hudParams['Hud Start Visible'] || 'true') === 'true';
AbsEngine.hud_fontSize = Number(AbsEngine.hudParams['Hud Font Size'] || 18);
AbsEngine.hud_itemCol = Number(AbsEngine.hudParams['Hud Item Color'] || 0);
AbsEngine.hud_mpCol = Number(AbsEngine.hudParams['Hud Mp Color'] || 3);
AbsEngine.hud_tpCol = Number(AbsEngine.hudParams['Hud Tp Color'] || 5);

AbsEngine.hud_pos = [
    [Number(AbsEngine.hudParams['Item Hud X-Axis'] || 350), Number(AbsEngine.hudParams['Item Hud Y-Axis'] || 560)],
    [Number(AbsEngine.hudParams['Skill Hud X-Axis'] || 392), Number(AbsEngine.hudParams['Skill Hud Y-Axis'] || 560)],
    [Number(AbsEngine.hudParams['Weapon Hud X-Axis'] || 434), Number(AbsEngine.hudParams['Weapon Hud Y-Axis'] || 560)],
    [Number(AbsEngine.hudParams['Shield Hud X-Axis'] || 480), Number(AbsEngine.hudParams['Shield Hud Y-Axis'] || 560)]
];

//=============================================================================
// ** Game System
//=============================================================================	

var _abs_hud_sys_init = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	_abs_hud_sys_init.call(this);
	this._absHudVisible = [
        AbsEngine.hud_startVisible, 
        AbsEngine.hud_startVisible, 
        AbsEngine.hud_startVisible, 
        AbsEngine.hud_startVisible
    ];
};

//=============================================================================
// ** Game Interpreter
//=============================================================================	

var _abs_hud_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_abs_hud_pluginCommand.call(this, command, args);
	if (command === "tool_item_visible") this.$gameSystem._absHudVisible[0] = (String(args[0]) === "true");
	if (command === "tool_skill_visible") this.$gameSystem._absHudVisible[1] = (String(args[0]) === "true");
	if (command === "tool_weapon_visible") this.$gameSystem._absHudVisible[2] = (String(args[0]) === "true");
	if (command === "tool_shield_visible") this.$gameSystem._absHudVisible[3] = (String(args[0]) === "true");
	if (command === "tool_hud_visible") {
		var val = (String(args[0]) === "true");
		for (var i = 0; i < 4; i++) { this.$gameSystem._absHudVisible[i] = val; }
	}
};

//=============================================================================
// ** ToolHud Class
//=============================================================================

function ToolHud() { this.initialize.apply(this, arguments); }
ToolHud.prototype = Object.create(Sprite.prototype);
ToolHud.prototype.constructor = ToolHud;

ToolHud.prototype.initialize = function(index) {
    Sprite.prototype.initialize.call(this);
	this._index = index;
	this.x = AbsEngine.hud_pos[index][0];
	this.y = AbsEngine.hud_pos[index][1];
	this._iconImg = ImageManager.loadSystem("IconSet");
	this.createSprites();
};

ToolHud.prototype.createSprites = function() {
    var bitmaps = ["Tool_Item", "Tool_Skill", "Tool_Weapon", "Tool_Shield"];
    this._layout = new Sprite(ImageManager.loadBitmap("img/chrono/", bitmaps[this._index]));
    this.addChild(this._layout);

    this._icon = new Sprite(this._iconImg);
    this._icon.x = 3;
    this._icon.y = 19;
    this.addChild(this._icon);

    this._costText = new Sprite(new Bitmap(64, 32));
    this._costText.x = -12;
    this._costText.y = 38;
    this._costText.bitmap.fontSize = AbsEngine.hud_fontSize;
    this.addChild(this._costText);
};

ToolHud.prototype.update = function() {
    Sprite.prototype.update.call(this);
    var actor = $gameParty.leader();
    if (!actor || !$gameSystem._absHudVisible[this._index] || $gameMessage.isBusy()) {
        this.opacity -= 15;
        return;
    }
    this.opacity += 15;
    this.refreshIfNeeded(actor);
};

ToolHud.prototype.refreshIfNeeded = function(actor) {
    var item = this.getItem(actor);
    if (this._currentItem !== item) {
        this._currentItem = item;
        this.refreshHud(item);
    }
    this.updateCost(actor);
};

ToolHud.prototype.getItem = function(actor) {
    if (this._index === 0) return $dataItems[actor._toolItemId];
    if (this._index === 1) return $dataSkills[actor._toolSkillId];
    if (this._index === 2) return actor.equips()[0];
    if (this._index === 3) return actor.equips()[1];
    return null;
};

ToolHud.prototype.refreshHud = function(item) {
    if (!item) {
        this._icon.visible = false;
        this._costText.visible = false;
        return;
    }
    this._icon.visible = true;
    var sx = item.iconIndex % 16 * 32;
    var sy = Math.floor(item.iconIndex / 16) * 32;
    this._icon.setFrame(sx, sy, 32, 32);
};

ToolHud.prototype.updateCost = function(actor) {
    if (!this._currentItem) return;
    var value = "";
    if (this._index === 0 && this._currentItem.consumable) {
        value = $gameParty.numItems(this._currentItem);
    } else if (this._index === 1) {
        value = this._currentItem.mpCost > 0 ? this._currentItem.mpCost : (this._currentItem.tpCost > 0 ? this._currentItem.tpCost : "");
    }
    
    if (this._lastValue !== value) {
        this._lastValue = value;
        this._costText.bitmap.clear();
        this._costText.visible = (value !== "");
        this._costText.bitmap.drawText(value, 0, 0, 64, 32, "center");
    }
};

//=============================================================================
// ** Scene Map
//=============================================================================

var _abs_hud_sceneMap_createDisplay = Scene_Map.prototype.createDisplayObjects;
Scene_Map.prototype.createDisplayObjects = function() {
    _abs_hud_sceneMap_createDisplay.call(this);
    this._absToolHuds = [];
    for (var i = 0; i < 4; i++) {
        this._absToolHuds[i] = new ToolHud(i);
        this.addChild(this._absToolHuds[i]);
    }
};