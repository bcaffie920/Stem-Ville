(function(window){
city.engine = {};

city.engine.Tool = function(zone, cost, size) {
	this._zone = zone;
	this._cost = cost;
	this._size = size || 1;
};

city.engine.Tool.prototype = {
	_zone: '',
	_building: null,
	_cost: 0,
	
	getCost: function() {
		return this._cost;
	},
	
	getZone: function() {
		return new city['zone'][this._zone];
	},
	
	getBuilding: function() {
		return new city['building'][this._building];
	}
};

city.engine.ResidentialTool = function() {
	this._zone = 'Residential';
	this._cost = 250;
};
extend(city.engine.ResidentialTool, city.engine.Tool);

city.engine.CommercialTool = function(){
	this._zone = 'Commercial';
	this._cost = 250;
};
extend(city.engine.CommercialTool, city.engine.Tool);

city.engine.IndustrialTool = function(){
	this._zone = 'Industrial';
	this._cost = 250;
};
extend(city.engine.IndustrialTool, city.engine.Tool);

city.engine.RoadTool = function(){
	this._zone = 'Road';
	this._cost = 50;
};
extend(city.engine.RoadTool, city.engine.Tool);

city.engine.CoalPowerTool = function(){
	this._zone = 'CoalPower';
	this._cost = 3000;
};
extend(city.engine.CoalPowerTool, city.engine.Tool);

city.engine.BulldozerTool = function() {
	this._cost = 1;
};
extend(city.engine.BulldozerTool, city.engine.Tool);

/**
 * Create a new input manager
 * @param {Object} stateManager the object to which send input events
 */
city.engine.InputManager = function(stateManager) {
	this._stateManager = stateManager;
};

city.engine.InputManager.prototype = {
	_stateManager: null,
	
	registerEventHandlers: function(keySource, mouseSource) {
		var self = this;
		keySource.onkeydown = function(ev) {
			self._stateManager.getActiveState().onKeyDown(ev.keyCode);
		};
		
		keySource.onkeyup = function(ev) {
			self._stateManager.getActiveState().onKeyUp(ev.keyCode);
		};
		
		mouseSource.onmousedown = function(ev) {
			self._stateManager.getActiveState().onMouseDown(ev.clientX, ev.clientY);
		};
		
		mouseSource.onmouseup = function(ev) {
			self._stateManager.getActiveState().onMouseUp(ev.clientX, ev.clientY);
		};
		
		/*mouseSource.onmouseout = function(ev) {
			self._stateManager.getActiveState().onMouseMove(-1, -1);
		};
		
		mouseSource.onmousemove = function(ev) {
			self._stateManager.getActiveState().onMouseMove(ev.clientX, ev.clientY);
		}*/
	}
}

/**
 * @constructor
 * @param {city.Map} map
 * @param {Number} width width of view
 * @param {Number} height height of view
 */
city.engine.CityViewRenderer = function(map, width, height) {	
	this._width = width; //9
	this._height = height; //12
	this._map = map;
	
	this._mapHeight = this._map.getHeight();
	this._mapWidth = this._map.getWidth();
	
	this._grid = [];
	this._el = document.createElement('table');
	this._el.cellSpacing = 0;
	this._el.cellPadding = 0;
	this._el.id = 'cityview';
	for(var i = 0; i < this._height; i++) {
		var tr = document.createElement('tr');
		this._grid[i] = [];
		for(var j = 0; j < this._width; j++) {
			var td = document.createElement('td');
			//Add dummy listener for Opera Mobile on non-touchscreen phones.
			//Without this, the cursor won't "snap" to the cells
			td.addEventListener('click', function() { }, false);
			this._grid[i][j] = td;
			
			tr.appendChild(td);
		}
		
		this._el.appendChild(tr);
	}
	
	document.getElementById('city').appendChild(this._el);
	
	this._activeGrid = [];
	for (var i = 0; i < this._height; i++) {
		this._activeGrid[i] = [];
	}
};

city.engine.CityViewRenderer.prototype = {
	_el: null,
	_grid: [],
	_width: 0,
	_height: 0,
	_sqWidth: 16,
	_sqHeight: 16,
	_map: null,
	_x: 0,
	_y: 0,
	_sprites: [],
	
	getWidth: function() {
		return 9;
	},
	
	getHeight: function() {
		return 12;
	},
	
	getElement: function() {
		return this._el;
	},
	
	/**
	 * Set the view position of the map
	 * @param {Number} x
	 * @param {Number} y
	 */
	setPosition: function(x, y) {		
		this._x = x;
		this._y = y;					
	},
	
	getPosition: function() {
		return { x: this._x, y: this._y };
	},
	
	/**
	 * Render the city view on the canvas
	 */
	render: function() {	
		var startY = this._y, startX = this._x, terrain = '',
		    i, j, zone, maxI, maxJ;
			
		for(i = startY, maxI = startY + this._height; i < maxI; i++) {			
			for(j = startX, maxJ = startX + this._width; j < maxJ; j++) {
				zone = this._map._zones[i][j];
				terrain = zone._type;
				if(!zone.powered) {
					terrain += ' nopower' + zone._offsetX + zone._offsetY;
				}
				
				if(zone.connections) {
					if(zone.connections[0] == 1) {
						terrain += ' up';
					}
					if(zone.connections[1] == 1) {
						terrain += ' right';
					}
					if(zone.connections[2] == 1) {
						terrain += ' down';
					}
					if(zone.connections[3] == 1) {
						terrain += ' left';
					}
				}
				
				if(zone.value !== null && zone.population !== null) {
					terrain += ' v' + zone.value + 'p' + zone.population;
				}
				

				if (this._activeGrid[i - startY][j - startX] != terrain) {
					this._grid[i - startY][j - startX].className = terrain;
					//this._grid[i - startY][j - startX].innerHTML = '<img src="tiles/' + zone._type + '.gif" />';
					this._activeGrid[i - startY][j - startX] = terrain;
					//opera.postError(terrain);					
				}
			}
		}
	/*var i = this._y + 11;
		var startY = this._y;
		var startX = this._x;
		var terrain = '';
		do {
			var j = startX + 8;
			do {
				terrain = this._map._zones[i][j]._type;
				if (this._activeGrid[i - startY][j - startX] != terrain) {
					this._grid[i - startY][j - startX].className = terrain;
					this._activeGrid[i - startY][j - startX] = terrain;
					//opera.postError(terrain.getType());
				}
			} while(j--);
			
		} while(i--);
	*/
		/*var n = this._y + 12;
		var k = n;
		var startY = this._y;
		var startX = this._x;
		var terrain = '';
		
		do {
			var nn = startX + 9;
			var kk = nn;
			var i = k - n;
			do {
				var j = kk - nn;
				terrain = this._map._zones[i][j]._type;
				if (this._activeGrid[i - startY][j - startX] != terrain) {
					this._grid[i - startY][j - startX].className = terrain;
					this._activeGrid[i - startY][j - startX] = terrain;
					//opera.postError(terrain.getType());
				}
			} while(--nn);
			
		} while(--n);*/
//		throw new x;
		
	},
	
	/**
	 * Here because in the end it's this that determine the coords etc.
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Object} with x, y indexes of square
	 */
	getSquareAtCoords: function(x, y) {
		/*
		var i = this._y + 11;
		var startY = this._y;
		var startX = this._x;
		var terrain = '';
		do {
			var j = startX + 8;
			do {
				terrain = this._map._zones[i][j]._type;
				if (this._activeGrid[i - startY][j - startX] != terrain) {
					this._grid[i - startY][j - startX].className = terrain;
					this._activeGrid[i - startY][j - startX] = terrain;
					//opera.postError(terrain.getType());
				}
			} while(j--);
			
		} while(i--);
		
		
		 */
		var height = this._map.getHeight();
		var width = this._map.getWidth();

		var xc = Math.floor(x / this._sqWidth);
		var yc = Math.floor(y / this._sqHeight);
		
		var sq = { x: xc + this._x, y: yc + this._y };
		if(sq.x > width || sq.y > height || sq.x < 0 || sq.y < 0) {
			return null;
		}
		
		return sq;		
	},
	
	getSquareCoords: function(x, y) {
		return { x: this._sqWidth * x, y: this._sqHeight * y };
	}
};


city.engine.GraphRenderer = function(ctx, width, height) {
	this._ctx = ctx;
	this._width = width;
	this._height = height;
	this.dataSize = 1;
	this.data = null;
};

city.engine.GraphRenderer.prototype = 
	{
	render: function() 
		{
		var x, y, xx, yy, value;
		for(y = 0; y < this._height; y++) 
			{
			for(x = 0; x < this._width; x++) {
				xx = x;
				yy = y;
				
				if(this.dataSize != 1) 
				{
					xx = floor(xx / this.dataSize);
					yy = floor(yy / this.dataSize);
				}
				
				if(this.data[yy][xx]) 
				{
					this._ctx.fillStyle = 'rgba(255,255,255,1)';
				}
				else 
				{
					this._ctx.fillStyle = 'rgba(03,30,30,1)';
				}
				
				this._ctx.fillRect(x, y, 10, 10);
				
			}
		}
	}
}

})(window);
