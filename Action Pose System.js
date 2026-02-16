/*:
 * @plugindesc Visual sprite animation system for map characters.
 * 
 * @help  
 * =============================================================================
 * CHARACTER MOTION SYSTEM
 * =============================================================================
 * Adds visual effects to character sprites via event comments.
 * 
 * USAGE (Event Comments)
 * =============================================================================
 * Breath Mode : X          *(1..3) - Adds a breathing scaling effect.
 * Float Mode               - Character floats up and down.
 * Swing Mode               - Character swings side to side.
 * Ghost Mode : X           *(1..2) - Fades the character in and out.
 *
 * PLUGIN COMMANDS
 * =============================================================================
 * breath_mode_event : ID : EFFECT_TYPE (1-3)
 * float_mode_event : ID
 * swing_mode_event : ID
 * ghost_mode_event : ID : EFFECT_TYPE (1-2)
 * clear_motion_event : ID
 *
 * ID 0 refers to the player.
 */

var Imported = Imported || {};
Imported.SpriteMotion = true;
var MotionSystem = MotionSystem || {}; 

//=============================================================================
// ** Game Character Base
//=============================================================================

var _motion_cbase_initMembers = Game_CharacterBase.prototype.initMembers;
Game_CharacterBase.prototype.initMembers = function() {
	_motion_cbase_initMembers.call(this);
	this.clearMotionEffects();
};

Game_CharacterBase.prototype.clearMotionEffects = function() {
	this._motionChecked = false;
	this._motionZoom = { enabled: false, loop: true, mode: 0, zoom: 0 };
	this._motionData = {
		zoom: [1.00, 1.00, 1.00, 1.00],
		rotation: [0, 0],
		swing: [0, 0, 0, 0, 0, 0, false],
		float: [0, 0, 0, 0, 0, 0, false],
		breath: [0, 0, 0, 0, 0, 0, false],
		ghost: [0, 0, 0, 0, 0, 0, false],
		shake: [0, 0, 0, 0, 0, 0, false],
		collapse: [0, 0, 0, 0, 0, 0, false]
	};
};

Game_CharacterBase.prototype.setMotionParameters = function() {
    this._motionData.zoom[0] = this.updateMotionVal(this._motionData.zoom[0], this._motionData.zoom[2], 30);
	this._motionData.zoom[1] = this.updateMotionVal(this._motionData.zoom[1], this._motionData.zoom[3], 30);
	this._motionData.rotation[0] = this.updateMotionVal(this._motionData.rotation[0], this._motionData.rotation[1], 30);
};

Game_CharacterBase.prototype.updateMotionVal = function(value, target, speed) {
	if (value == target) return value;
	var dnspeed = 0.001 + (Math.abs(value - target) / speed);
	if (value > target) {
		value -= dnspeed;
	    if (value < target) value = target;
	} else if (value < target) {
		value += dnspeed;
    	if (value > target) value = target;		
    };
	return value;
};

// Movement offsets for the sprite
Game_CharacterBase.prototype.motionX = function() { return this._motionData.shake[1]; };
Game_CharacterBase.prototype.motionY = function() { return this._motionData.float[1]; };
Game_CharacterBase.prototype.motionR = function() { return this._motionData.rotation[0] + this._motionData.swing[1]; };
Game_CharacterBase.prototype.motionZX = function() { 
	return this._motionData.zoom[0] + this._motionData.breath[1] + this._motionData.collapse[1] + this._motionZoom.zoom; 
};
Game_CharacterBase.prototype.motionZY = function() { 
	return this._motionData.zoom[1] + this._motionData.breath[2] + this._motionData.collapse[2] + this._motionZoom.zoom; 
};
Game_CharacterBase.prototype.motionOP = function() { return -(this._motionData.ghost[1] + this._motionData.collapse[5]); };

//=============================================================================
// ** Game Event
//=============================================================================

var _motion_gevent_setupPage = Game_Event.prototype.setupPage;
Game_Event.prototype.setupPage = function() {
	_motion_gevent_setupPage.call(this);
    this.checkSpriteMotionComments();
};

Game_Event.prototype.checkSpriteMotionComments = function() {
	this.clearMotionEffects();
	if (!this._erased && this.page()) {
		this.list().forEach(function(l) {
			if (l.code === 108 || l.code === 408) {
				var comment = l.parameters[0].toLowerCase();
				if (comment.contains("float mode")) this._motionData.float[0] = 1;
				if (comment.contains("swing mode")) this._motionData.swing[0] = 1;
				if (comment.contains("breath mode")) {
					var parts = comment.split(':');
					this._motionData.breath[0] = parts[1] ? Number(parts[1]) : 1;
				}
				if (comment.contains("ghost mode")) {
					var parts = comment.split(':');
					this._motionData.ghost[0] = parts[1] ? Number(parts[1]) : 1;
				}
			};
		}, this);
	};
};

//=============================================================================
// ** Sprite Character
//=============================================================================

var _motion_sprchar_update = Sprite_Character.prototype.update;
Sprite_Character.prototype.update = function() {
	_motion_sprchar_update.call(this);
	if (this._character) this.updateMotionEffects();
};

Sprite_Character.prototype.updateMotionEffects = function() {   
	var char = this._character;
	if (char._motionData.collapse[0] > 0) {
		this.updateMotionCollapse();
	} else {
		if (char._motionData.swing[0] > 0) this.updateMotionSwing();
		if (char._motionData.float[0] > 0) this.updateMotionFloat();
		if (char._motionData.breath[0] > 0) this.updateMotionBreath();
		if (char._motionData.ghost[0] > 0) this.updateMotionGhost();
	}
	this.applyMotionTransforms();
};

Sprite_Character.prototype.applyMotionTransforms = function() {
	this._character.setMotionParameters();
	this.x += this._character.motionX();
	this.y += this._character.motionY();
	this.opacity += this._character.motionOP();
	this.rotation = this._character.motionR();
	this.scale.x = this._character.motionZX();
	this.scale.y = this._character.motionZY();
};

Sprite_Character.prototype.updateMotionBreath = function() {
	var char = this._character;
	if (!char._motionData.breath[6]) {
		char._motionData.breath[6] = true;
		char._motionData.breath[3] = 0.05;
		char._motionData.breath[5] = 0.0015;
	}
	if (char._motionData.breath[4] === 0) {
		char._motionData.breath[2] += char._motionData.breath[5];
		if (char._motionData.breath[2] >= char._motionData.breath[3]) char._motionData.breath[4] = 1;
	} else {
		char._motionData.breath[2] -= char._motionData.breath[5];
		if (char._motionData.breath[2] <= 0) char._motionData.breath[4] = 0;
	}
};

Sprite_Character.prototype.updateMotionFloat = function() {
	var char = this._character;
	if (!char._motionData.float[6]) {
		char._motionData.float[6] = true;
		char._motionData.float[3] = 20;
		char._motionData.float[5] = 0.2;
		char._motionData.float[4] = 1;
	}
	if (char._motionData.float[4] === 0) {
		char._motionData.float[1] += char._motionData.float[5];
		if (char._motionData.float[1] >= 0) char._motionData.float[4] = 1;
	} else {
		char._motionData.float[1] -= char._motionData.float[5];
		if (char._motionData.float[1] <= -char._motionData.float[3]) char._motionData.float[4] = 0;
	}
};

Sprite_Character.prototype.updateMotionSwing = function() {
	var char = this._character;
	if (!char._motionData.swing[6]) {
		char._motionData.swing[6] = true;
		char._motionData.swing[3] = 0.15;
		char._motionData.swing[5] = 0.005;
	}
	if (char._motionData.swing[4] === 0) {
		char._motionData.swing[1] += char._motionData.swing[5];
		if (char._motionData.swing[1] >= char._motionData.swing[3]) char._motionData.swing[4] = 1;
	} else {
		char._motionData.swing[1] -= char._motionData.swing[5];
		if (char._motionData.swing[1] <= -char._motionData.swing[3]) char._motionData.swing[4] = 0;
	}
};

Sprite_Character.prototype.updateMotionGhost = function() {
	var char = this._character;
	if (!char._motionData.ghost[6]) {
		char._motionData.ghost[6] = true;
		char._motionData.ghost[1] = 255;
		char._motionData.ghost[5] = char._motionData.ghost[0] === 1 ? 0 : 120;
	}
	if (char._motionData.ghost[4] === 0) {
		char._motionData.ghost[1] -= 3;
		if (char._motionData.ghost[1] <= char._motionData.ghost[5]) char._motionData.ghost[4] = 1;
	} else {
		char._motionData.ghost[1] += 3;
		if (char._motionData.ghost[1] >= 255) char._motionData.ghost[4] = 0;
	}
};

Sprite_Character.prototype.updateMotionCollapse = function() {
	var char = this._character;
	char._motionData.collapse[1] += 0.1;
	char._motionData.collapse[5] += 5;
};

//=============================================================================
// ** Game Interpreter
//=============================================================================

var _motion_interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_motion_interpreter_pluginCommand.call(this, command, args);
	var id = Number(args[1]);
	var type = Number(args[3]) || 1;
	var char = (id === 0) ? $gamePlayer : $gameMap.event(id);
	if (!char) return;

	if (command === "breath_mode_event") char._motionData.breath[0] = type;
	if (command === "float_mode_event") char._motionData.float[0] = 1;
	if (command === "swing_mode_event") char._motionData.swing[0] = 1;
	if (command === "ghost_mode_event") char._motionData.ghost[0] = type;
	if (command === "clear_motion_event") char.clearMotionEffects();
};