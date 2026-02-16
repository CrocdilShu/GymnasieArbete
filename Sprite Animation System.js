/*:
 * @plugindesc Real time sprite pose system (Dash, Idle, Jump, Attack).
 * 
 * @param Dash Pose
 * @desc Enable dashing pose suffix (_DASH).
 * @default true
 *
 * @param Jump Pose
 * @desc Enable jumping pose suffix (_JUMP).
 * @default true
 *
 * @param Idle Pose
 * @desc Enable idle pose suffix (_IDLE).
 * @default true
 *
 * @param Idle Start Time
 * @desc Frames of inactivity before the idle pose starts.
 * @default 60
 *
 * @help  
 * =============================================================================
 * ACTION POSE SYSTEM
 * =============================================================================
 * Automatically switches character sprites based on actions.
 * 
 * FILENAME CONVENTIONS
 * ============================================================================= 
 * Save images in /img/characters/ with these suffixes:
 *
 * (IDLE)  -> FILENAME + _IDLE.png
 * (DASH)  -> FILENAME + _DASH.png
 * (JUMP)  -> FILENAME + _JUMP.png
 * (ACTION)-> FILENAME + _ATTACK.png (or any custom suffix defined in tools)
 *
 * MULTI-FRAME SUPPORT
 * ============================================================================= 
 * To use more than 3 frames, name the file: FILENAME(F + Number)
 * Example: Actor1_DASH(F8).png  -> Uses 8 frames.
 *
 * PLUGIN COMMANDS
 * =============================================================================
 * enable_action_poses
 * disable_action_poses
 */

var Imported = Imported || {};
Imported.AbsPoses = true;
var AbsEngine = AbsEngine || {}; 

AbsEngine.poseParams = PluginManager.parameters('ActionPoses');
AbsEngine.poses_dashEnabled = String(AbsEngine.poseParams['Dash Pose'] || 'true') === 'true';
AbsEngine.poses_jumpEnabled = String(AbsEngine.poseParams['Jump Pose'] || 'true') === 'true';
AbsEngine.poses_idleEnabled = String(AbsEngine.poseParams['Idle Pose'] || 'true') === 'true';
AbsEngine.poses_idleTime = Number(AbsEngine.poseParams['Idle Start Time'] || 60);

//=============================================================================
// ** Game System
//=============================================================================

var _abs_poses_sys_init = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	_abs_poses_sys_init.call(this);
	this._absPosesEnabled = true;
};

//=============================================================================
// ** Game Interpreter
//=============================================================================	

var _abs_poses_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_abs_poses_pluginCommand.call(this, command, args);
	if (command === "enable_action_poses") this.$gameSystem._absPosesEnabled = true;
	if (command === "disable_action_poses") this.$gameSystem._absPosesEnabled = false;
};

//=============================================================================
// ** Game Battler
//=============================================================================

var _abs_poses_battler_init = Game_Battler.prototype.initMembers;
Game_Battler.prototype.initMembers = function() {
	_abs_poses_battler_init.call(this);
	this._abs_originalSprite = { name: "", index: 0 };
};

//=============================================================================
// ** Game Character Base
//=============================================================================

var _abs_poses_cbase_init = Game_CharacterBase.prototype.initMembers;
Game_CharacterBase.prototype.initMembers = function() {
	_abs_poses_cbase_init.call(this);
	this._abs_pose = {
		activeName: "",
		idleTimer: AbsEngine.poses_idleTime,
		isAction: false,
		suffix: ""
	};
	this._abs_frames = { enabled: false, max: 3, speed: 0 };
};

Game_CharacterBase.prototype.setAbsPose = function() {
	if (!this._abs_originalSprite) return this._characterName;
	
	// 1. Action Pose (Attacking/Using Tool)
	if (this.battler() && this.battler()._abs && this.battler()._abs.poseDuration > 0) {
		this._abs_pose.idleTimer = AbsEngine.poses_idleTime;
		return this._abs_originalSprite.name + (this.battler()._abs.poseSuffix || "_ATTACK");
	}

	// 2. Dash Pose
	if (this.isDashing() && this.isMoving() && AbsEngine.poses_dashEnabled) {
		this._abs_pose.idleTimer = AbsEngine.poses_idleTime;
		return this._abs_originalSprite.name + "_DASH";
	}

	// 3. Jump Pose
	if (this.isJumping() && AbsEngine.poses_jumpEnabled) {
		this._abs_pose.idleTimer = AbsEngine.poses_idleTime;
		return this._abs_originalSprite.name + "_JUMP";
	}

	// 4. Idle Pose
	if (!this.isMoving() && !this.isJumping() && AbsEngine.poses_idleEnabled) {
		if (this._abs_pose.idleTimer > 0) {
			this._abs_pose.idleTimer--;
		} else {
			this._stepAnime = true;
			return this._abs_originalSprite.name + "_IDLE";
		}
	} else {
		this._abs_pose.idleTimer = AbsEngine.poses_idleTime;
	}

	return this._abs_originalSprite.name;
};

var _abs_poses_cbase_update = Game_CharacterBase.prototype.update;
Game_CharacterBase.prototype.update = function() {
	_abs_poses_cbase_update.call(this);
	if (this._characterName !== "" && $gameSystem._absPosesEnabled) {
		if (!this._abs_originalSprite || this._abs_originalSprite.name === "") {
			this._abs_originalSprite = { name: this._characterName, index: this._characterIndex };
		}
		var newName = this.setAbsPose();
		if (this._characterName !== newName) {
			this._characterName = newName;
			this.refreshAbsFrames();
		}
	}
};

Game_CharacterBase.prototype.refreshAbsFrames = function() {
	var frames = this._characterName.match(/\(F(\d+)\)/i);
	if (frames) {
		this._abs_frames.enabled = true;
		this._abs_frames.max = Number(frames[1]);
	} else {
		this._abs_frames.enabled = false;
		this._abs_frames.max = 3;
	}
};

//=============================================================================
// ** Sprite Character
//=============================================================================

var _abs_poses_sprchar_updateBitmap = Sprite_Character.prototype.updateBitmap;
Sprite_Character.prototype.updateBitmap = function() {
	if (this.isAbsImageChanged()) {
		this._abs_bitmapName = this._character.characterName();
		this.setCharacterBitmap();
	}
	_abs_poses_sprchar_updateBitmap.call(this);
};

Sprite_Character.prototype.isAbsImageChanged = function() {
	return this._abs_bitmapName !== this._character.characterName();
};

Sprite_Character.prototype.patternWidth = function() {
    if (this._character._abs_frames && this._character._abs_frames.enabled) {
        return this.bitmap.width / this._character._abs_frames.max;
    }
    return this.bitmap.width / (this._isBigCharacter ? 3 : 12);
};