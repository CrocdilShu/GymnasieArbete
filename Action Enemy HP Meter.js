/*:
 * @plugindesc Displays a health bar for enemies when hit in real-time combat.
 * @author Action System
 *
 * @param Duration
 * @desc How many frames the meter stays visible after the last hit.
 * @default 90
 *
 * @param Font Size
 * @desc Font size for the enemy name.
 * @default 20
 *
 * @param Layout X-Axis
 * @desc Horizontal position of the gauge.
 * @default 0
 *
 * @param Layout Y-Axis
 * @desc Vertical position of the gauge.
 * @default 400
 *
 * @param Meter X-Axis
 * @desc Horizontal offset for the HP bar relative to layout.
 * @default 27
 *
 * @param Meter Y-Axis
 * @desc Vertical offset for the HP bar relative to layout.
 * @default 29
 *
 * @param Name X-Axis
 * @desc Horizontal offset for the name text.
 * @default 80
 *
 * @param Name Y-Axis
 * @desc Vertical offset for the name text.
 * @default 0
 *   
 * @help  
 * =============================================================================
 * ACTION ENEMY HP METER
 * =============================================================================
 * Automatically displays an HP bar when an enemy event is damaged.
 * 
 * REQUIRED IMAGES (Save in /img/chrono/ or your system folder):
 * EnemyHP_A.png - Background / Frame
 * EnemyHP_B.png - The HP Bar (Top half is current HP, bottom half is damage lag)
 * 
 * NOTETAGS (Enemy Database):
 * Hide HP - Use this tag in the enemy's note box to disable their HP bar.
 */

var Imported = Imported || {};
Imported.AbsEnemyHP = true;
var AbsEngine = AbsEngine || {}; 

AbsEngine.enemyHP_params = PluginManager.parameters('ActionEnemyHP');
AbsEngine.enemyHP_duration = Number(AbsEngine.enemyHP_params['Duration'] || 90);
AbsEngine.enemyHP_fontSize = Number(AbsEngine.enemyHP_params['Font Size'] || 20);
AbsEngine.enemyHP_layoutX = Number(AbsEngine.enemyHP_params['Layout X-Axis'] || 0);
AbsEngine.enemyHP_layoutY = Number(AbsEngine.enemyHP_params['Layout Y-Axis'] || 400);
AbsEngine.enemyHP_meterX = Number(AbsEngine.enemyHP_params['Meter X-Axis'] || 27);
AbsEngine.enemyHP_meterY = Number(AbsEngine.enemyHP_params['Meter Y-Axis'] || 29);
AbsEngine.enemyHP_nameX = Number(AbsEngine.enemyHP_params['Name X-Axis'] || 80);
AbsEngine.enemyHP_nameY = Number(AbsEngine.enemyHP_params['Name Y-Axis'] || 0);

//=============================================================================
// ** Game Temp
//=============================================================================

var _abs_hp_gtemp_init = Game_Temp.prototype.initialize;
Game_Temp.prototype.initialize = function() {
	_abs_hp_gtemp_init.call(this);
    this._absEnemyHPData = {
        active: false,
        name: "",
        hp: 0,
        mhp: 0,
        timer: 0
    };
};

//=============================================================================
// ** Game Enemy
//=============================================================================

var _abs_hp_genemy_setup = Game_Enemy.prototype.setup;
Game_Enemy.prototype.setup = function(enemyId, x, y) {
	_abs_hp_genemy_setup.call(this, enemyId, x, y);
	this._showAbsHP = !this.enemy().note.contains("Hide HP");
};

//=============================================================================
// ** Game Action
//=============================================================================

// This overrides the action results to send data to the HUD
var _abs_hp_gaction_apply = Game_Action.prototype.apply;
Game_Action.prototype.apply = function(target) {
	_abs_hp_gaction_apply.call(this, target);
	if (target.isEnemy() && target._showAbsHP && this.subject().isActor()) {
		$gameTemp._absEnemyHPData.active = true;
		$gameTemp._absEnemyHPData.name = target.name();
		$gameTemp._absEnemyHPData.hp = target.hp;
		$gameTemp._absEnemyHPData.mhp = target.mhp;
		$gameTemp._absEnemyHPData.timer = AbsEngine.enemyHP_duration;
	}
};

//=============================================================================
// ** ActionEnemyHP
//=============================================================================

function ActionEnemyHP() { this.initialize.apply(this, arguments); }
ActionEnemyHP.prototype = Object.create(Sprite.prototype);
ActionEnemyHP.prototype.constructor = ActionEnemyHP;

ActionEnemyHP.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);
    this.opacity = 0;
    this._hpLag = 0;
    this.createSprites();
};

ActionEnemyHP.prototype.createSprites = function() {
    this._layout = new Sprite(ImageManager.loadBitmap("img/chrono/", "EnemyHP_A"));
    this._layout.x = AbsEngine.enemyHP_layoutX;
    this._layout.y = AbsEngine.enemyHP_layoutY;
    this.addChild(this._layout);

    this._barImg = ImageManager.loadBitmap("img/chrono/", "EnemyHP_B");
    
    // Lag/Red Bar
    this._barLag = new Sprite(this._barImg);
    this._barLag.x = this._layout.x + AbsEngine.enemyHP_meterX;
    this._barLag.y = this._layout.y + AbsEngine.enemyHP_meterY;
    this.addChild(this._barLag);

    // Main HP Bar
    this._barMain = new Sprite(this._barImg);
    this._barMain.x = this._barLag.x;
    this._barMain.y = this._barLag.y;
    this.addChild(this._barMain);

    this._nameText = new Sprite(new Bitmap(250, 48));
    this._nameText.x = this._layout.x + AbsEngine.enemyHP_nameX;
    this._nameText.y = this._layout.y + AbsEngine.enemyHP_nameY;
    this._nameText.bitmap.fontSize = AbsEngine.enemyHP_fontSize;
    this.addChild(this._nameText);
};

ActionEnemyHP.prototype.update = function() {
    Sprite.prototype.update.call(this);
    var data = $gameTemp._absEnemyHPData;
    if (data.timer > 0) {
        data.timer--;
        this.opacity += 20;
        this.refreshGauge(data);
    } else {
        this.opacity -= 10;
    }
    if (this.opacity > 0) this.updateLagBar(data);
};

ActionEnemyHP.prototype.refreshGauge = function(data) {
    if (this._lastName !== data.name) {
        this._lastName = data.name;
        this._nameText.bitmap.clear();
        this._nameText.bitmap.drawText(data.name, 0, 0, 250, 48, "left");
        this._hpLag = data.hp; // Reset lag bar on new target
    }
    
    var w = this._barImg.width;
    var h = this._barImg.height / 2;
    var rate = (data.hp / data.mhp) * w;
    this._barMain.setFrame(0, 0, rate, h);
};

ActionEnemyHP.prototype.updateLagBar = function(data) {
    if (this._hpLag > data.hp) {
        this._hpLag -= 0.5 + (this._hpLag - data.hp) / 20;
        if (this._hpLag < data.hp) this._hpLag = data.hp;
    } else {
        this._hpLag = data.hp;
    }
    
    var w = this._barImg.width;
    var h = this._barImg.height / 2;
    var rate = (this._hpLag / data.mhp) * w;
    this._barLag.setFrame(0, h, rate, h);
};

//=============================================================================
// ** Scene Map Addition
//=============================================================================

var _abs_hp_sceneMap_createDisplay = Scene_Map.prototype.createDisplayObjects;
Scene_Map.prototype.createDisplayObjects = function() {
    _abs_hp_sceneMap_createDisplay.call(this);
    this._absEnemyHP = new ActionEnemyHP();
    this.addChild(this._absEnemyHP);
};