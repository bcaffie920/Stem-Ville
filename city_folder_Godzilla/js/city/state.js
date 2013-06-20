(function(window){
city.state = {};

/**
 * Create a city state
 * @constructor
 * @param {city.City} city
 * @param {city.Map} map
 * @param {city.engine.CityViewRenderer} renderer
 */
city.state.CityState = function(manager, city, map, renderer, infoEl){
	this._info = infoEl;
	this._manager = manager;
	this._city = city;
	this._map = map;
	this._renderer = renderer;
	
	//Explicit window. because of local "city" variable
	this._tools = {
		'Residential': new window.city.engine.ResidentialTool(),
		'Commercial': new window.city.engine.CommercialTool(),
		'Industrial': new window.city.engine.IndustrialTool(),
		'Road': new window.city.engine.RoadTool(),
		'PowerLine': new window.city.engine.Tool('PowerLine', 5),
		'NuclearPower': new window.city.engine.Tool('NuclearPower', 5000, 4),
		'PoliceStation': new window.city.engine.Tool('PoliceStation', 500, 3),
		'FireStation': new window.city.engine.Tool('FireStation', 500, 3),
		'Bulldozer': new window.city.engine.BulldozerTool(),
		'CoalPower': new window.city.engine.CoalPowerTool()
	};
};

city.state.CityState.prototype = {
	_city: null,
	_map: null,
	_renderer: null,
	_scrollY: 0,
	_scrollX: 0,
	_mouseX: -1,
	_mouseY: -1,
	_uiListeners: [],
	
	_tools: null,
	
	_tool: null,
	
	_updateUi: function() {
		for(var i = 0, len = this._uiListeners.length; i < len; i++) {
			this._uiListeners[i].onUiUpdate();
		}
	},
	
	addUiUpdateListener: function(listener) {
		this._uiListeners.push(listener);
	},
	
	work: function() {					
		this._city.simulate();
		
		var pos = {
			x: this._renderer._x,
			y: this._renderer._y			
		};
		if(this._scrollY != 0) {
			var tempY = pos.y + this._scrollY;
			if(tempY >= 0 && tempY + this._renderer.getHeight() <= this._map.getHeight()) {
				pos.y = tempY;
			}
		}
		
		if(this._scrollX != 0) {
			var tempX = pos.x + this._scrollX;
			if(tempX >= 0 && tempX + this._renderer.getWidth() <= this._map.getWidth()) {
				pos.x = tempX;
			}
		}
		
		this._renderer.setPosition(pos.x, pos.y);
		this._renderer.render();
	
		this._updateUi();
	},
	
	/**
	 * Which tool to use when clicking the canvas
	 * @param {String} name
	 */
	setTool: function(name) {
		this._tool = this._tools[name];
		
		this._info.innerHTML = name + ' (' + this._tool._cost + ')';
	},
	
	onKeyUp: function(key) {
		switch(key) {
			//Intentional fall-through
			case app.Keys.UP:
			case app.Keys.DOWN:
				//this._scrollY = 0;
				/*widget.setPreferenceForKey(this._city.save(), 'savegame');
				opera.postError(this._city.save());*/
				break;
				
			//Intentional fall-through				
			case app.Keys.LEFT:
			case app.Keys.RIGHT:
				/*this._city.load(widget.preferenceForKey('savegame'));
				this._renderer.render();*/
				//this._scrollX = 0;
				break;
		}
	},
	
	onKeyDown: function(key) {
		/*switch(key) {
			case app.Keys.UP: 
				this._scrollY = -1;
				break;
			
			case app.Keys.DOWN:
				this._scrollY = 1;
				break;
				
			case app.Keys.LEFT:
				this._scrollX = -1;
				break;
				
			case app.Keys.RIGHT:
				this._scrollX = 1;
				break;
				
			default:
				
				break;
		}
		*/
	},
	
	onMouseDown: function(x, y) {		
		if(this._tool) {
//			console.log(this._tool.getZone()._type);
		}
	},
	
	onMouseUp: function(x, y) {
		//console.log(x + ' ' + y);
		//this._plotter.setPosition(x, y);
		
		if(this._tool) {
			var cost = this._tool.getCost();
			
			//Bulldozer gets special handling
			if (this._tool instanceof city.engine.BulldozerTool) {
				var sq = this._renderer.getSquareAtCoords(x, y);
				//console.log(this._map._zones[sq.y][sq.x]._type);
				var land = new city.zone.Land();
				var zone = this._map._zones[sq.y][sq.x];
				
				land._size = zone._size;				
				this._map.setZone(sq.x - zone._offsetX, sq.y - zone._offsetY, land);			
			}
			else {
				var zone = this._tool.getZone();
				var sq = this._renderer.getSquareAtCoords(x, y);
				
				if (this._city.hasFunds(cost) && this._map.tryBuild(sq.x, sq.y, zone.constructor)) {
					this._city.decreaseFunds(cost);
					this._updateUi();
				}
			}
		}
	},
	
	onMouseMove: function(x, y) {
		this._mouseX = x;
		this._mouseY = y;
	},
	
	showMenu: function() {
		this._manager.changeState('menu');
	},
	
	debug: function() {
		//opera.postError(this._city._terrainDensity._data);
		/*this._manager._states.graph._renderer.data = this._city._power.powerGrid;
		this._manager.changeState('graph');*/
		for(var x in this._city._census) {
			console.log(x + ': ' + this._city._census[x]);
		}
	}
};

city.state.MenuState = function(manager, city) {
	this._manager = manager;
	this._city = city;
	//explicit window due to local city variable
	this._menu = new window.city.ui.Menu(this);
	this._menu.create();
	
	if(window.widget && widget.preferenceForKey('has_save') === '1') {
		this._menu.showLoad();
	}
};

city.state.MenuState.prototype = {
	work: function() { },
	
	newCity: function() {
		var f = new city.MapFactory();
		var map = f.createEmptyMap();
		var newCity = new city.City('New City', 'Mayor Tutorial', 3000, map, this._manager._states.city._info);
		
		this._city = newCity;
		this._manager._states.city._city = newCity;
		this._manager._states.city._map = map;
		//this._manager._states.graph._map = map;
		this._manager._states.city._renderer._map = map;
		this._menu.showReturnSave();
		this._manager.changeState('city');
	},
	
	loadCity: function() {
		document.getElementById('menu').style.display='none';
		document.getElementById('loading').style.display='block';
		//this._manager._states.city._city.load(widget.preferenceForKey('savegame'));

		var f = new city.MapFactory();
		var map = f.createEmptyMap();
		var newCity = new city.City('New City', 'Mayor Tutorial', widget.preferenceForKey('save_funds')*1, map, this._manager._states.city._info);
		this._city = newCity;
		
		this._manager._states.city._city = newCity;
		this._manager._states.city._map = map;
		//this._manager._states.graph._map = map;
		this._manager._states.city._renderer._map = map;
		
		var section = this._city._map._width / 8;
		for(var i = 0; i < 8; i++) {
			var mapH = this._city._map._height;
			var startX = i * section;
			var endX = (i + 1) * section;
			var data = eval(widget.preferenceForKey('save_section_' + i));
			for (var y = 0; y < mapH; y++) {
				for (var x = startX; x < endX; x++) {
					var z = data[y][x - startX];
					var type = z._type;
					var idx = type.indexOf(' ');
					if(idx > 0) {
						type = type.substr(0, idx);
					}
					
					var zone = city.zone.Zone.fromType(type);
					if (zone instanceof city.zone.RoadPower) {
						this._city._map._zones[y][x] = new city.zone.Road();
						this._city._map.fixConnections(x, y);
						this._city._map._zones[y][x] = zone;
						this._city._map.fixConnections(x, y);
					}
					else {
						if(!isNaN(z._offsetX) && !isNaN(z._offsetY) && (z._offsetX != 0 || z._offsetY != 0)) {
							zone.setOffset(z._offsetX, z._offsetY);
						}
						if (!isNaN(z.population)) {
							zone.population = z.population;
						}
						
						if (!isNaN(z.value)) {
							zone.value = z.value;
						}
						zone.powered = z.powered;
						
						if (!isNaN(z.traffic)) {
							zone.traffic = z.traffic;
						}
						this._city._map._zones[y][x] = zone;
						this._city._map.fixConnections(x, y);
					}
					
					this._city._map._zones[y][x] = data[y][x - startX];
				}
			}
		}
		
		document.getElementById('menu').style.display='block';
		document.getElementById('loading').style.display='none';
		this._menu.showReturnSave();
		this._manager.changeState('city');
	},
	
	saveCity: function() {
		document.getElementById('menu').style.display='none';
		document.getElementById('loading').style.display='block';
		//widget.setPreferenceForKey(this._manager._states.city._city.save(), 'savegame');
		
		//The city state has to be split into smaller pieces and saved as them
		//so that devices with low memory capacity won't run out of memory while saving
		var section = this._city._map._width / 8;
		for(var i = 0; i < 8; i++) {
			var mapH = this._city._map._height;
			var startX = i * section;
			var endX = (i + 1) * section;
			var data = [];
			for (var y = 0; y < mapH; y++) {
				data[y] = [];
				for (var x = startX; x < endX; x++) {
					data[y][x - startX] = this._city._map._zones[y][x];
				}
			}
			
			widget.setPreferenceForKey(JSON.stringify(data), 'save_section_' + i);
		}
		
		widget.setPreferenceForKey(this._city._funds, 'save_funds');
		widget.setPreferenceForKey('1', 'has_save');
		this._menu.showLoad();
		document.getElementById('menu').style.display='block';
		document.getElementById('loading').style.display='none';
	},
	
	exit: function() {
		window.close();
	},
	
	returnToGame: function() {
		this._manager.changeState('city');
	},
	
	onKeyUp: function() {},
	onKeyDown: function() {}
};


city.state.GraphState = function(manager, city, map, renderer) {
	this._renderer = renderer;
	this._city = city;
	this._manager = manager;
	this._map = map;
	this._rendered = false;
};

city.state.GraphState.prototype = {
	work: function() {
		if (!this._rendered) {
			this._renderer.render();
			this._rendered = true;
		}
	}
};
})(window);
