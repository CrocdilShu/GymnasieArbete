/*:
 * @plugindesc Advanced AI for enemy events in real time combat.
 * @author Action System
 *
 * @param Debug Key
 * @desc The key used to cycle the nearest enemy's AI mode for testing.
 * @default k
 *
 * @help  
 * =============================================================================
 * ACTION ENEMY AI
 * =============================================================================
 * Adds behavior logic to enemy events via event comments.
 *
 * COMMENT TAGS (Enemy Events)
 * =============================================================================
 * 1. ACTIVATE AI
 * ai_active : true
 *
 * 2. SET MODE
 * ai_mode : MODE
 * (Modes: aggressive, neutral, flee, dummy)
 * - aggressive: Chases and attacks player on sight.
 * - neutral: Wanders peacefully. Becomes aggressive/flee if hit.
 * - flee: Always runs away from the player.
 * - dummy: Stands still and does nothing.
 *
 * 3. SET REACTION (For Neutral Mode)
 * ai_reaction : MODE
 * (Modes: aggressive, flee) - Behavior after taking damage.
 *
 * 4. SENSES
 * ai_sight : X              - Detection range in tiles.
 * ai_speed : X              - Movement speed while chasing.
 * ai_skill_range : ID : DIST - Use Tool ID when player is within DIST tiles.
 *
 * DEBUGGING
 * =============================================================================
 * Press the Debug Key (default 'K') while near an enemy to cycle their mode:
 * Aggressive -> Neutral -> Flee -> Dummy
 */

var Imported = Imported || {};
Imported.AbsAI = true;
var AbsEngine = AbsEngine || {}; 

AbsEngine.aiParams = PluginManager.parameters('ActionAI');
AbsEngine.ai_debugKey = String(AbsEngine.aiParams['Debug Key'] || 'k').toLowerCase();

// Map key character to code
AbsEngine.ai_keyCodeMap = { 'k': 75, 'j': 74, 'h': 72, 'l': 76 };
Input.keyMapper[AbsEngine.ai_keyCodeMap[AbsEngine.ai_debugKey] || 75] = 'abs_ai_debug';

//=============================================================================
// ** Game Event
//=============================================================================

var _abs_ai_gevent_initMembers = Game_Event.prototype.initMembers;
Game_Event.prototype.initMembers = function() {
    _abs_ai_gevent_initMembers.call(this);
    this._abs_ai = null; 
};

var _abs_ai_gevent_setupPage = Game_Event.prototype.setupPage;
Game_Event.prototype.setupPage = function() {
    _abs_ai_gevent_setupPage.call(this);
    this.parseAbsAIComments();
};

Game_Event.prototype.parseAbsAIComments = function() {
    this._abs_ai = null; 
    if (!this.page() || !this.list()) return;

    var active = false;
    this.list().forEach(function(l) {
        if ((l.code === 108 || l.code === 408) && l.parameters[0].toLowerCase().contains("ai_active : true")) {
            active = true;
        }
    });

    if (!active) return; 

    this._abs_ai = {
        enabled: true,
        mode: 'aggressive',
        reaction: 'aggressive',
        state: 'IDLE',
        sight: 5,
        speed: 4,
        skillRanges: {}, 
        cooldown: 0,
        homeX: this.x,
        homeY: this.y,
        lastHp: this.battler() ? this.battler().hp : 0
    };

    this.list().forEach(function(l) {
        if (l.code === 108 || l.code === 408) {
            var parts = l.parameters[0].split(':');
            var key = parts[0].trim().toLowerCase();
            var val1 = parts[1] ? parts[1].trim().toLowerCase() : "";
            var val2 = parts[2] ? parts[2].trim().toLowerCase() : "";

            if (key === "ai_sight") this._abs_ai.sight = Number(val1);
            if (key === "ai_speed") this._abs_ai.speed = Number(val1);
            if (key === "ai_mode") this._abs_ai.mode = val1;
            if (key === "ai_reaction") this._abs_ai.reaction = val1;
            if (key === "ai_skill_range") {
                this._abs_ai.skillRanges[Number(val1)] = Number(val2);
            }
        }
    }, this);
};

var _abs_ai_gevent_updateSelfMovement = Game_Event.prototype.updateSelfMovement;
Game_Event.prototype.updateSelfMovement = function() {
    if (!this._abs_ai || !this._abs_ai.enabled || !this.battler() || this.battler().isDead()) {
        _abs_ai_gevent_updateSelfMovement.call(this);
        return;
    }

    if (this.isActing() || this.isKnockbacking()) {
        this._abs_ai.lastHp = this.battler().hp; 
        return;
    }

    if (this._abs_ai.cooldown > 0) this._abs_ai.cooldown--;

    this.updateAbsAIReaction();
    this.updateAbsAILogic();
};

Game_Event.prototype.updateAbsAIReaction = function() {
    if (this.battler().hp < this._abs_ai.lastHp) {
        if (this._abs_ai.mode === 'neutral') {
            this._abs_ai.mode = this._abs_ai.reaction;
            this.requestBalloon(1); // Exclamation mark
        }
        this._abs_ai.lastHp = this.battler().hp;
    } else if (this.battler().hp > this._abs_ai.lastHp) {
        this._abs_ai.lastHp = this.battler().hp;
    }
};

Game_Event.prototype.updateAbsAILogic = function() {
    var dist = Math.abs($gamePlayer.x - this.x) + Math.abs($gamePlayer.y - this.y);

    if (this._abs_ai.mode === 'dummy') return;

    if (this._abs_ai.mode === 'flee') {
        this.setMoveSpeed(this._abs_ai.speed + 1);
        if (dist < this._abs_ai.sight + 2) this.moveAwayFromPlayer();
        else this.moveRandom();
        return;
    }

    if (this._abs_ai.mode === 'neutral') {
        this.setMoveSpeed(3);
        if (Math.randomInt(60) === 0) this.moveRandom();
        return;
    }

    if (this._abs_ai.mode === 'aggressive') {
        if (dist <= this._abs_ai.sight) {
            this.setMoveSpeed(this._abs_ai.speed);
            var toolId = 0;
            var range = 1;
            
            for (var id in this._abs_ai.skillRanges) {
                toolId = Number(id);
                range = this._abs_ai.skillRanges[id];
                break; 
            }

            if (dist <= range && this._abs_ai.cooldown <= 0) {
                this.turnTowardPlayer();
                if (typeof this.actAbs === 'function') {
                    this.actAbs(toolId);
                    this._abs_ai.cooldown = 60;
                }
            } else {
                this.moveTowardPlayer();
            }
        } else {
            this.setMoveSpeed(3);
            if (this.x !== this._abs_ai.homeX || this.y !== this._abs_ai.homeY) {
                this.moveTowardCharacter({x: this._abs_ai.homeX, y: this._abs_ai.homeY});
            } else {
                this.moveRandom();
            }
        }
    }
};

//=============================================================================
// ** Scene Map 
//=============================================================================

var _abs_ai_scenemap_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _abs_ai_scenemap_update.call(this);
    if (Input.isTriggered('abs_ai_debug')) this.cycleNearestAbsAI();
};

Scene_Map.prototype.cycleNearestAbsAI = function() {
    var p = $gamePlayer;
    var closest = null;
    var minDst = 10;

    $gameMap.events().forEach(function(e) {
        if (e._abs_ai && !e._erased) {
            var d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
            if (d < minDst) {
                minDst = d;
                closest = e;
            }
        }
    });

    if (closest) {
        var modes = ['aggressive', 'neutral', 'flee', 'dummy'];
        var nextIdx = (modes.indexOf(closest._abs_ai.mode) + 1) % modes.length;
        closest._abs_ai.mode = modes[nextIdx];
        closest.requestBalloon(10); // Musical note / check
        SoundManager.playCursor();
    }
};