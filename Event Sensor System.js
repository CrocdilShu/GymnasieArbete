/*:
 * @plugindesc (v1.0) Automatically activates event pages based on player proximity.
 * @author Action System
 *
 * @param Self Switch Key
 * @desc The Self-Switch letter (A, B, C, or D) to toggle when in range.
 * @default D
 * 
 * @help  
 * =============================================================================
 * EVENT SENSOR SYSTEM
 * =============================================================================
 * Depending on the distance between the player and the event, a predefined
 * event page can be activated or deactivated.
 *
 * USAGE (Event Comments)
 * =============================================================================
 * To define the sensor distance for an event, put this comment on an event page:
 *
 * event sensor : X
 *
 * X: Distance in tiles.
 *
 * When the player is X tiles or closer, the designated Self-Switch will turn ON.
 * When the player moves further away, it will turn OFF.
 * =============================================================================
 */

var Imported = Imported || {};
Imported.AbsSensor = true;
var AbsEngine = AbsEngine || {}; 

AbsEngine.sensor_params = PluginManager.parameters('ActionSensor');
AbsEngine.sensor_switchKey = String(AbsEngine.sensor_params['Self Switch Key'] || "D");

//=============================================================================
// ** Character Base
//=============================================================================

var _abs_sensor_cbase_initMembers = Game_CharacterBase.prototype.initMembers;
Game_CharacterBase.prototype.initMembers = function() {
    _abs_sensor_cbase_initMembers.call(this);
	this._abs_sensorData = [false, 0];
};

//=============================================================================
// ** Game Event
//=============================================================================

var _abs_sensor_gevent_setupPage = Game_Event.prototype.setupPage;
Game_Event.prototype.setupPage = function() {
	_abs_sensor_gevent_setupPage.call(this);
    this.checkAbsSensorComments();
};

Game_Event.prototype.checkAbsSensorComments = function() {
	this._abs_sensorData = [false, 0];
	if (!this._erased && this.page()) {
		this.list().forEach(function(l) {
	       if (l.code === 108 || l.code === 408) {
			   var comment = l.parameters[0].split(' : ');
			   if (comment[0].toLowerCase() === "event sensor"){
                 this._abs_sensorData = [true, Number(Math.abs(comment[1]))];
			   };
     	   };
		}, this);
	};
};

var _abs_sensor_gevent_update = Game_Event.prototype.update;
Game_Event.prototype.update = function() {
	_abs_sensor_gevent_update.call(this);
	if (this._abs_sensorData[0]) {
		this.updateAbsSensorLogic();
	};
};

Game_Event.prototype.updateAbsSensorLogic = function() {
	  var dist = Math.abs($gamePlayer.x - this.x) + Math.abs($gamePlayer.y - this.y);
      var inRange = (dist <= this._abs_sensorData[1]);
	  
	  var key = [this._mapId, this._eventId, AbsEngine.sensor_switchKey];
      var currentState = $gameSelfSwitches.value(key);
	  
      if (inRange !== currentState) {
		  $gameSelfSwitches.setValue(key, inRange);
	  };
};

//=============================================================================
// ** Scene Map (Safety cleanup)
//=============================================================================

var _abs_sensor_scmap_terminate = Scene_Map.prototype.terminate;
Scene_Map.prototype.terminate = function() {
	_abs_sensor_scmap_terminate.call(this);
	// Optional: Reset sensors on map leave if required by turning switches off
    $gameMap.events().forEach(function(event) {
        if (event._abs_sensorData && event._abs_sensorData[0]) {
			var key = [event._mapId, event._eventId, AbsEngine.sensor_switchKey];
			$gameSelfSwitches.setValue(key, false);
		}
    }, this);	
};