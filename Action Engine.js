/*:
 * @plugindesc Core Action Battle System (ABS). Focuses purely on real time map combat.
 * @author Action System
 *
 * @param Tool Map ID
 * @desc Map ID where tool events (skills/items) are stored.
 * @default 1
 *
 * @param Battle Sensor Range
 * @desc Detection range for enemies to start chasing/attacking.
 * @default 3
 *   
 * @param Max Battle Members
 * @desc Maximum followers in combat (1-4).
 * @default 3
 *
 * @param Attack Button
 * @desc Button for primary attack (ok, c, shift, etc).
 * @default ok
 * 
 * @param Shield Button
 * @default d
 * 
 * @param Skill Button
 * @default s
 * 
 * @param Item Button
 * @default a
 * 
 * @param Shield Animation ID
 * @default 142
 * 
 * @param Level UP Animation ID
 * @default 143
 *
 * @help  
 * =============================================================================
 * CORE ACTION ENGINE
 * =============================================================================
 * Purely real-time combat. All turn-based functionality has been stripped.
 * 
 * SKILL / ITEM / WEAPON NOTETAGS
 * =============================================================================
 * Tool Id : X        - Link the item/skill to Tool Event ID X on the Tool Map.
 * Abs Mode           - Required for the item to appear in action-based menus.
 * 
 * ENEMY EVENT COMMENTS
 * =============================================================================
 * enemy_id : X       - Assigns Enemy ID X from the database to this event.
 * walk_nearby : X    - Constrains random movement to a range of X tiles.
 * 
 * TOOL EVENT COMMENTS (In Tool Map)
 * =============================================================================
 * tool_item_id : X   - Damage based on Item ID X.
 * tool_skill_id : X  - Damage based on Skill ID X. 
 * tool_duration : X  - How long the action lasts in frames.
 * tool_range : X     - Collision range in tiles.
 * tool_area : mode   - Area shape: square, rhombus, line, wall, cross.
 * tool_knockback_duration : X - Stun duration on hit.
 */

var Imported = Imported || {};
Imported.AbsCore = true;
var AbsSystem = AbsSystem || {}; 

AbsSystem.params = PluginManager.parameters('ActionEngine');
AbsSystem.toolMapId = Number(AbsSystem.params['Tool Map ID'] || 1);
AbsSystem.sensorRange = Number(AbsSystem.params['Battle Sensor Range'] || 3);
AbsSystem.btnAttack = String(AbsSystem.params['Attack Button'] || 'ok');
AbsSystem.btnShield = String(AbsSystem.params['Shield Button'] || 'd');
AbsSystem.btnSkill = String(AbsSystem.params['Skill Button'] || 's');
AbsSystem.btnItem = String(AbsSystem.params['Item Button'] || 'a');

var $dataMapTool = null;

//=============================================================================
// ** DataManager
//=============================================================================

DataManager.loadAbsToolMap = function() {
    var mapId = AbsSystem.toolMapId;
    var filename = 'Map%1.json'.format(mapId.padZero(3));
    this.loadDataFile('$dataMapTool', filename);
};
DataManager.loadAbsToolMap();

//=============================================================================
// ** Game System
//=============================================================================

var _abs_sys_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
    _abs_sys_initialize.call(this);
    this._absToolsOnMap = [];
    this._absModeActive = true;
};

//=============================================================================
// ** Game Battler
//=============================================================================

var _abs_battler_initMembers = Game_Battler.prototype.initMembers;
Game_Battler.prototype.initMembers = function() {
    _abs_battler_initMembers.call(this);
    this._abs = {
        poseDuration: 0,
        poseSuffix: "",
        collisionD: 0,
        knockback: [0, 0],
        guardActive: false,
        invulnerable: false,
        cast: { item: null, duration: 0 }
    };
};

Game_Battler.prototype.clearAbsActing = function() {
    this._abs.poseDuration = 0;
    this._abs.collisionD = 0;
    this._abs.guardActive = false;
    this._abs.cast.duration = 0;
};

//=============================================================================
// ** Game Player
//=============================================================================

var _abs_player_update = Game_Player.prototype.update;
Game_Player.prototype.update = function(sceneActive) {
    _abs_player_update.call(this, sceneActive);
    if (sceneActive) this.updateAbsInput();
};

Game_Player.prototype.updateAbsInput = function() {
    if ($gameMessage.isBusy()) return;
    this._abs.guardActive = false;

    if (Input.isPressed(AbsSystem.btnShield)) {
        this._abs.guardActive = true;
    } else if (Input.isTriggered(AbsSystem.btnAttack)) {
        this.executeAbsAttack();
    } else if (Input.isTriggered(AbsSystem.btnSkill)) {
        this.executeAbsSkill();
    } else if (Input.isTriggered(AbsSystem.btnItem)) {
        this.executeAbsItem();
    }
};

Game_Player.prototype.executeAbsAttack = function() {
    var weapon = this.battler().equips()[0];
    if (weapon) {
        var toolId = this.battler().checkActionID(weapon);
        if (toolId) this.actAbs(toolId);
    }
};

//=============================================================================
// ** Game Character Base
//=============================================================================

Game_CharacterBase.prototype.actAbs = function(toolId) {
    if (!toolId || !$dataMapTool) return;
    if (!this._abs_events) this._abs_events = [];
    
    var mapId = AbsSystem.toolMapId;
    var ev = new ToolEvent(mapId, toolId, this);
    $gameMap._events.push(ev);
    SceneManager._scene._spriteset.addAbsToolSprite(ev);
};

//=============================================================================
// ** Tool Event
//=============================================================================

function ToolEvent() { this.initialize.apply(this, arguments); }
ToolEvent.prototype = Object.create(Game_Event.prototype);
ToolEvent.prototype.constructor = ToolEvent;

ToolEvent.prototype.initialize = function(mapId, eventId, user) {
    Game_Event.prototype.initialize.call(this, mapId, eventId);
    this._toolUser = user;
    this._toolData = {
        duration: 30,
        range: 1,
        hitAnimation: 0,
        area: "square"
    };
    this.parseToolComments();
    this.locate(user.x, user.y);
    this.setDirection(user.direction());
};

ToolEvent.prototype.parseToolComments = function() {
    if (!this.page()) return;
    this.list().forEach(function(l) {
        if (l.code === 108 || l.code === 408) {
            var comment = l.parameters[0].split(':');
            var key = comment[0].trim().toLowerCase();
            var val = comment[1] ? comment[1].trim() : "";
            
            if (key === "tool_duration") this._toolData.duration = Number(val);
            if (key === "tool_range") this._toolData.range = Number(val);
            if (key === "tool_hit_animation") this._toolData.hitAnimation = Number(val);
        }
    }, this);
};

ToolEvent.prototype.update = function() {
    Game_Event.prototype.update.call(this);
    this.updateAbsCollision();
    this._toolData.duration--;
    if (this._toolData.duration <= 0) this.erase();
};

ToolEvent.prototype.updateAbsCollision = function() {
    var targets = $gameMap.events().concat([$gamePlayer]);
    targets.forEach(function(target) {
        if (target === this._toolUser) return;
        if (this.isCollidingWith(target)) {
            this.executeAbsHit(target);
        }
    }, this);
};

ToolEvent.prototype.isCollidingWith = function(target) {
    var dist = Math.abs(this.x - target.x) + Math.abs(this.y - target.y);
    return dist <= this._toolData.range;
};

ToolEvent.prototype.executeAbsHit = function(target) {
    if (!target.battler() || target.battler().isDead()) return;
    if (target.battler()._abs.collisionD > 0) return;
    
    // Simple damage calculation logic
    var action = new Game_Action(this._toolUser.battler());
    action.setAttack(); // Placeholder for specific skill logic
    action.apply(target.battler());
    target.battler().startDamagePopup();
    target.battler()._abs.collisionD = 20;
    
    if (this._toolData.hitAnimation > 0) target.requestAnimation(this._toolData.hitAnimation);
};

//=============================================================================
// ** Spriteset Map
//=============================================================================

Spriteset_Map.prototype.addAbsToolSprite = function(event) {
    var sprite = new Sprite_Character(event);
    this._tilemap.addChild(sprite);
    this._characterSprites.push(sprite);
};