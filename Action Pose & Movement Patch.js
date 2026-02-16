/*:
 * @plugindesc Adds a specific dead pose and delay before enemies fade out in ABS.
 * @author Action System
 *
 * @help  
 * =============================================================================
 * ACTION DEAD POSE PATCH
 * =============================================================================
 * This patch adds a "_dead" suffix pose for enemies.
 *
 * 1. When an enemy's HP reaches 0, the plugin looks for:
 *    FILENAME_dead.png
 *
 * 2. The enemy will display this pose for 60 frames (1 second) before 
 *    starting the fade-out collapse animation.
 *
 * 3. If the file does not exist, the enemy reverts to its base sprite 
 *    before fading.
 * 
 * Place this script BELOW the Action Engine and Action Pose scripts.
 */

(function() {

//=============================================================================
// ** Action Pose System Patches
//=============================================================================
if (Imported.AbsPoses) {

    /**
     * Fixes a bug to ensure battlers (enemies) can use state-based poses.
     */
    Game_CharacterBase.prototype.battlerPoses = function() {
        return !!this.battler();
    };

    /**
     * Checks if the dead pose should be active.
     */
    Game_CharacterBase.prototype.isDeadPose = function() {
        if (this.battlerPoses()) {
            return this.battler().isDead();
        }
        return false;
    };
    
    /**
     * Returns the filename for the dead pose.
     */
    Game_CharacterBase.prototype.setDeadPose = function() {
         this._stepAnime = true;
         if (this._abs_originalSprite && this._abs_originalSprite.name) {
             return this._abs_originalSprite.name + "_dead";
         }
         return this._characterName;
    };

    /**
     * Alias the setAbsPose logic to prioritize the dead pose.
     */
    var _abs_dead_pose_setAbsPose = Game_CharacterBase.prototype.setAbsPose;
    Game_CharacterBase.prototype.setAbsPose = function() {
        if (this.isDeadPose()) {
            return this.setDeadPose();
        }
        return _abs_dead_pose_setAbsPose.call(this);
    };

    /**
     * Fallback mechanism: If the _dead pose file doesn't exist, use the base sprite.
     */
    var _abs_dead_pose_updateBitmap = Sprite_Character.prototype.updateBitmap;
    Sprite_Character.prototype.updateBitmap = function() {
        if (this.bitmap && this.bitmap.isError()) {
            if (this._character && this._character._abs_originalSprite) {
                this._character._characterName = this._character._abs_originalSprite.name;
            }
        }
        _abs_dead_pose_updateBitmap.call(this);
    };

} 

//=============================================================================
// ** Action Engine Patches
//=============================================================================
if (Imported.AbsCore) {

    /**
     * Overrides the dead enemy setup to add a delay before fading.
     */
    var _abs_dead_engine_setDeadEnemy = Game_CharacterBase.prototype.setDeadEnemy;
    Game_CharacterBase.prototype.setDeadEnemy = function(char, battler) {
        // Run original setup
        if (typeof _abs_dead_engine_setDeadEnemy === 'function') {
            _abs_dead_engine_setDeadEnemy.call(this, char, battler);
        }
        
        // Override collapse logic: [IsFading, DelayTimer]
        if (char._abs_ai || char.battler().isEnemy()) {
            char._abs_collapseData = [false, 60]; 
        }
    };

    /**
     * Handles the collapse delay timer in the sprite update loop.
     */
    var _abs_dead_sprite_updateBattler = Sprite_Character.prototype.updateBattler;
    Sprite_Character.prototype.updateBattler = function() {
        if (_abs_dead_sprite_updateBattler) {
            _abs_dead_sprite_updateBattler.call(this);
        }
    	 
    	 if (this._character && this._character._abs_collapseData && this._character._abs_collapseData[1] > 0) {
             if (this._character._abs_collapseData[0]) { 
                 // Logic for fading
                 this.opacity -= 5;
                 if (this.opacity <= 0) {
                     this._character._abs_collapseData[1] = 0;
                     this._character.erase();
                 }
             } else {
                 // Countdown delay
                 this._character._abs_collapseData[1]--;
                 if (this._character._abs_collapseData[1] === 0) {
                     this._character._abs_collapseData[0] = true; // Start fading
                     this._character._abs_collapseData[1] = 90;   // Reset timer for fade duration
                 }
             }
         }
    };
}

})();