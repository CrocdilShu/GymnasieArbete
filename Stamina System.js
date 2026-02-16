/*:
 * @plugindesc Adds a Stamina (Action Turn) system for real time combat.
 * 
 * @param Initial Visible
 * @desc Show the stamina hud at the beginning of the game.
 * @default true
 *
 * @param Dash Cost
 * @desc Enable a stamina cost for dashing.
 * @default true
 *
 * @param Full SE
 * @desc Sound effect to play when the bar is full.
 * @default 
 *
 * @param Smart Fade
 * @desc Makes the HUD semi-transparent when the character is near it.
 * @default true
 *
 * @param Slant Animation
 * @desc Enables a gradient animation on the meter.
 * @default true
 *
 * @param Hud X-Axis
 * @desc X-Axis position of the entire HUD group.
 * @default 70
 *
 * @param Hud Y-Axis
 * @desc Y-Axis position of the entire HUD group.
 * @default 460
 *
 * @param Layout X-Axis
 * @desc X offset of the layout image relative to the HUD group.
 * @default 0
 *
 * @param Layout Y-Axis
 * @desc Y offset of the layout image relative to the HUD group.
 * @default 0
 *
 * @param Meter X-Axis
 * @desc X offset of the meter relative to the HUD group.
 * @default 35
 *
 * @param Meter Y-Axis
 * @desc Y offset of the meter relative to the HUD group.
 * @default 25
 *
 * @param Number X-Axis
 * @desc X-Axis position of the value relative to the HUD group.
 * @default 85
 *
 * @param Number Y-Axis
 * @desc Y-Axis position of the value relative to the HUD group.
 * @default -20
 *
 * @help  
 * =============================================================================
 * STAMINA SYSTEM
 * =============================================================================
 * Adds a Stamina parameter. It regenerates every second and is used 
 * for actions like attacking, using items, and dashing.
 *
 * PLUGIN COMMANDS
 * =============================================================================
 * stamina_hud_visible : true/false
 * dash_stamina_cost : true/false
 * action_stamina_cost : true/false
 *
 * EVENT COMMENTS (TOOL EVENTS)
 * =============================================================================
 * tool_stamina_cost : VALUE
 */

var Imported = Imported || {};
Imported.AbsStamina = true;
var AbsEngine = AbsEngine || {}; 	

AbsEngine.staminaParams = PluginManager.parameters('StaminaSystem');
AbsEngine.stamina_hudVisible = String(AbsEngine.staminaParams['Initial Visible'] || "true") === "true";
AbsEngine.stamina_dashCost = String(AbsEngine.staminaParams['Dash Cost'] || "true") === "true";
AbsEngine.stamina_fullSE = String(AbsEngine.staminaParams['Full SE'] || '');
AbsEngine.stamina_smartFade = String(AbsEngine.staminaParams['Smart Fade'] || "true") === "true";
AbsEngine.stamina_slant = String(AbsEngine.staminaParams['Slant Animation'] || "true") === "true";
AbsEngine.stamina_hudX = Number(AbsEngine.staminaParams['Hud X-Axis'] || 70);	
AbsEngine.stamina_hudY = Number(AbsEngine.staminaParams['Hud Y-Axis'] || 460);	
AbsEngine.stamina_layoutX = Number(AbsEngine.staminaParams['Layout X-Axis'] || 0);	
AbsEngine.stamina_layoutY = Number(AbsEngine.staminaParams['Layout Y-Axis'] || 0);	
AbsEngine.stamina_meterX = Number(AbsEngine.staminaParams['Meter X-Axis'] || 35);	
AbsEngine.stamina_meterY = Number(AbsEngine.staminaParams['Meter Y-Axis'] || 25);	
AbsEngine.stamina_numberX = Number(AbsEngine.staminaParams['Number X-Axis'] || 85);	
AbsEngine.stamina_numberY = Number(AbsEngine.staminaParams['Number Y-Axis'] || -20);

//=============================================================================
// ** Game System
//=============================================================================

var _abs_stamina_sys_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _abs_stamina_sys_initialize.call(this);
	this._staminaHud_visible = AbsEngine.stamina_hudVisible;
	this._staminaHud_smartFade = AbsEngine.stamina_smartFade;
	this._staminaDashEnabled = AbsEngine.stamina_dashCost;
	this._staminaHud_CostEnabled = true;
};

//=============================================================================
// ** Game Interpreter
//=============================================================================	

var _abs_stamina_setInterpreter = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_abs_stamina_setInterpreter.call(this, command, args);
	if (command === "stamina_hud_visible")  {
		$gameSystem._staminaHud_visible = (String(args[0]) === "true");
	} else if (command === "dash_stamina_cost")  {
		$gameSystem._staminaDashEnabled = (String(args[0]) === "true");
	} else if (command === "action_stamina_cost")  {
		$gameSystem._staminaHud_CostEnabled = (String(args[0]) === "true");
	};	
};

//=============================================================================
// ** Game Battler
//=============================================================================	

var _abs_stamina_battler_init = Game_Battler.prototype.initMembers;
Game_Battler.prototype.initMembers = function() {	
    _abs_stamina_battler_init.call(this);
	this._abs_stamina = {
		value: 100,
		max: 100,
		fd: 0,
		speed: 1,
		dashLimit: 30,
		dashCount: 0,
		wait: 0,
		waitDash: 0,
		isDashing: false
	};
};	

Game_CharacterBase.prototype.updateAbsStaminaBattler = function() {
	if (this.battler()._abs_stamina.isDashing != this.isDashing()) {
	    if (!this.battler().canActionAbsBase() && !this.isDashing()) {
			this.battler()._abs_stamina.wait = 10;
		} else if (!this.battler()._abs_stamina.isDashing && this.isDashing()) {
			this.battler()._abs_stamina.waitDash = 20;
		};
	};
	this.battler()._abs_stamina.isDashing = this.isDashing();
};	

Game_Battler.prototype.staminaValue = function() { return this._abs_stamina.value; };
Game_Battler.prototype.staminaMax = function() { return this._abs_stamina.max; };
Game_Battler.prototype.staminaSpeed = function() { return this._abs_stamina.speed; };
Game_Battler.prototype.staminaDashLimit = function() { return this._abs_stamina.dashLimit; };
Game_Battler.prototype.isStaminaMax = function() { return this.staminaValue() >= this.staminaMax(); };
Game_Battler.prototype.staminaPercentage = function() { return Math.floor((this.staminaValue() / this.staminaMax()) * 100); };

Game_Battler.prototype.canActionAbsBase = function() {
	return this.staminaPercentage() >= this.staminaDashLimit();
};	

//=============================================================================
// ** Tool Event 
//=============================================================================

var _abs_stamina_canPayCost = ToolEvent.prototype.canPayCTCost;
ToolEvent.prototype.canPayCTCost = function() {
	if (this._tool.staminaCost === 0 || !$gameSystem._staminaHud_CostEnabled) return true;
	if (this.user().battler().isEnemy()) return true;
	if (this.user().battler().staminaValue() < this._tool.staminaCost) return false;
	if (!this.user().battler().canActionAbsBase()) return false;
	return true;
};

var _abs_stamina_payCost = ToolEvent.prototype.payCTCost;
ToolEvent.prototype.payCTCost = function() {
   this.user().battler()._abs_stamina.value -= (this._tool.staminaCost || 0);
   if (this.user().battler()._abs_stamina.value < 0) this.user().battler()._abs_stamina.value = 0;
   if (!this.user().battler().canActionAbsBase()) this.user().battler()._abs_stamina.wait = 15;
};

//=============================================================================
// ** Movement Logic
//=============================================================================

var _abs_stamina_player_moveInput = Game_Player.prototype.moveByInput;
Game_Player.prototype.moveByInput = function() {
	_abs_stamina_player_moveInput.call(this);
	if (this.battler()) this.updateAbsStaminaLogic();
};

var _abs_stamina_player_isDashing = Game_Player.prototype.isDashing;
Game_Player.prototype.isDashing = function() {
	if (!$gameSystem._staminaDashEnabled || !this.battler()) return _abs_stamina_player_isDashing.call(this);
	if (this.battler()._abs_stamina.waitDash > 0 && this._dashing) return true;
	if (!this.battler().canActionAbsBase() || this.battler()._abs_stamina.wait > 0) return false;
    return _abs_stamina_player_isDashing.call(this);
};

Game_CharacterBase.prototype.updateAbsStaminaLogic = function() {
	this.battler()._abs_stamina.fd++;
	if (this.battler()._abs_stamina.dashCount > 0) this.battler()._abs_stamina.dashCount--;
	if (this.battler()._abs_stamina.waitDash > 0) this.battler()._abs_stamina.waitDash--;
	if (this.battler()._abs_stamina.fd > 1) this.updateStaminaRegen();
};

Game_CharacterBase.prototype.updateStaminaRegen = function() {	
    this.battler()._abs_stamina.fd = 0;
	if (this.isDashing() && this.isMoving() && $gameSystem._staminaDashEnabled) {
	    this.battler()._abs_stamina.value -= 1;
	} else if (!this.battler().isStaminaMax() && this.battler()._abs_stamina.wait <= 0) {
        this.battler()._abs_stamina.value += this.battler().staminaSpeed();
        if (this.battler().isStaminaMax() && AbsEngine.stamina_fullSE) {
            SoundManager.playSoundMX(AbsEngine.stamina_fullSE);
        };
	};
	this.battler()._abs_stamina.value = this.battler()._abs_stamina.value.clamp(0, this.battler().staminaMax());
	if (this.battler()._abs_stamina.wait > 0) this.battler()._abs_stamina.wait--;
};

//=============================================================================
// ** Stamina HUD
//=============================================================================

function StaminaHud() { this.initialize.apply(this, arguments); };
StaminaHud.prototype = Object.create(Sprite.prototype);
StaminaHud.prototype.constructor = StaminaHud;

StaminaHud.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);	
    this.x = AbsEngine.stamina_hudX;
	this.y = AbsEngine.stamina_hudY;
	this._fadeLimit = $gameSystem._staminaHud_smartFade ? 90 : 255;
	this._layoutImg = ImageManager.loadBitmap("img/chrono/", "CT_Layout"); 
	this._gaugeImg = ImageManager.loadBitmap("img/chrono/", "CT_Meter"); 
	this._numberImg = ImageManager.loadBitmap("img/chrono/", "CT_Number"); 
	this.createSprites();
};

StaminaHud.prototype.createSprites = function() {
   this._layout = new Sprite(this._layoutImg);
   this._layout.x = AbsEngine.stamina_layoutX;
   this._layout.y = AbsEngine.stamina_layoutY;
   this.addChild(this._layout);
   
   this._gauge = new Sprite(this._gaugeImg);
   this._gauge.x = AbsEngine.stamina_meterX;
   this._gauge.y = AbsEngine.stamina_meterY;
   this.addChild(this._gauge);

   this._numbers = [];
   for (var i = 0; i < 3; i++) {
	   this._numbers.push(new Sprite(this._numberImg));
	   this._numbers[i].x = AbsEngine.stamina_numberX;
	   this._numbers[i].y = AbsEngine.stamina_numberY;	   
	   this.addChild(this._numbers[i]);
   };
};

StaminaHud.prototype.update = function() {
    Sprite.prototype.update.call(this);
	var battler = $gameParty.leader();
	if (!battler || !$gameSystem._staminaHud_visible) {
		this.opacity -= 15;
		return;
	};
	this.opacity += 15;
	var rate = battler.staminaValue() / battler.staminaMax();
	this._gauge.setFrame(0, 0, this._gaugeImg.width * rate, this._gaugeImg.height);
};

// Add to Scene
var _abs_stamina_sceneMap_createDisplay = Scene_Map.prototype.createDisplayObjects;
Scene_Map.prototype.createDisplayObjects = function() {
    _abs_stamina_sceneMap_createDisplay.call(this);
    this._staminaHud = new StaminaHud();
    this.addChild(this._staminaHud);
};