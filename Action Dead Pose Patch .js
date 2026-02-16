/*:
 * @plugindesc Advanced pose overrides and movement timing for the Action System.
 * @author Action System
 *
 * @help  
 * =============================================================================
 * ACTION POSE & MOVEMENT PATCH
 * =============================================================================
 * This patch adds advanced control over combat sprites and timing.
 * 
 * TOOL EVENT COMMENTS (In Tool Map)
 * =============================================================================
 * 1. action_pose_file : FILENAME
 * Forces a specific character file to be used for the action pose.
 * Useful for skills that use unique animations (e.g. Actor1_Spin(F8)(S2)).
 *
 * 2. tool_move_delay : X
 * Waits X frames before executing "this.user().moveForward()" script commands.
 * This allows a weapon to swing before the character lunges forward.
 *
 * -----------------------------------------------------------------------------
 * Place this script BELOW the Action Engine and Action Pose scripts.
 * =============================================================================
 */

(function() {

// Ensure core systems are loaded
if (!Imported.AbsCore || !Imported.AbsPoses) {
    return;
}

//=============================================================================
// ** Game Battler
//=============================================================================

var _abs_force_battler_init = Game_Battler.prototype.initMembers;
Game_Battler.prototype.initMembers = function() {	
    _abs_force_battler_init.call(this);
    if (this._abs) {
        this._abs.poseFileOverride = null; 
    }
};

//=============================================================================
// ** Tool Event
//=============================================================================

var _abs_force_tool_checkNotes = ToolEvent.prototype.parseToolComments;
ToolEvent.prototype.parseToolComments = function() {
    this._moveDelay = 0; 
    _abs_force_tool_checkNotes.call(this);
    
    if (this.page()) {
        this.list().forEach(function(l) {
            if (l.code === 108 || l.code === 408) {
                var comment = l.parameters[0].split(':');
                var key = comment[0].trim().toLowerCase();
                var val = comment[1] ? comment[1].trim() : "";

                if (this._toolUser && this._toolUser.battler()) { 
                    if (key === "action_pose_file") {
                        this._toolUser.battler()._abs.poseFileOverride = val;
                    }
                    else if (key === "tool_move_delay") {
                        this._moveDelay = Number(val || 0);
                    }
                }
            }
        }, this);
    }
};

var _abs_force_cbase_clearActing = Game_CharacterBase.prototype.clearAbsActing;
Game_CharacterBase.prototype.clearAbsActing = function() {
    if (this.battler() && this.battler()._abs) {
        this.battler()._abs.poseFileOverride = null;
    }
    if (_abs_force_cbase_clearActing) {
        _abs_force_cbase_clearActing.call(this);
    }
};

//=============================================================================
// ** Action Pose Integration
//=============================================================================

var _abs_force_cbase_setPose = Game_CharacterBase.prototype.setAbsPose;
Game_CharacterBase.prototype.setAbsPose = function() {
     if (this.battler() && this.battler()._abs && this.battler()._abs.poseFileOverride) {
         if (this.battler()._abs.poseDuration > 0) {
            this._stepAnime = true;
            return this.battler()._abs.poseFileOverride;
         }
     }
     return _abs_force_cbase_setPose.call(this);
};

//=============================================================================
// ** Frame Fixes 
//=============================================================================

Game_CharacterBase.prototype.updatePattern = function() {
    if (this._abs_frames && this._abs_frames.enabled) {
        this._pattern = (this._pattern + 1) % this._abs_frames.max;
    } else {
        Game_Character.prototype.updatePattern.call(this);
    }
};

//=============================================================================
// ** Move Delay Logic
//=============================================================================

var _abs_force_tool_init = ToolEvent.prototype.initialize;
ToolEvent.prototype.initialize = function(mapId, eventId, user) {
    _abs_force_tool_init.call(this, mapId, eventId, user);
    this._moveDelayCounter = this._moveDelay || 0;
};

var _abs_force_tool_update = ToolEvent.prototype.update;
ToolEvent.prototype.update = function() {
    _abs_force_tool_update.call(this);
    if (this._moveDelayCounter > 0) {
        this._moveDelayCounter--;
    }
};

/**
 * Intercepts movement script calls within Tool Events.
 * If a move delay is active, the movement is skipped until the timer hits 0.
 */
var _abs_force_interpreter_command355 = Game_Interpreter.prototype.command355;
Game_Interpreter.prototype.command355 = function() {
    if (this._eventTool && this._eventTool[1]) { 
        var script = this.currentCommand().parameters[0];
        if (script.contains(".moveForward()")) {
            if (this._eventTool[1]._moveDelayCounter > 0) {
                return true; 
            }
        }
    }
    return _abs_force_interpreter_command355.call(this);
};

})();