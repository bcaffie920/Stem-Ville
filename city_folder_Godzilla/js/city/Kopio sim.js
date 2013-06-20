(function(window){
city.sim = {};

//Performance optimization to reduce lookups.
var min = Math.min;
var floor = Math.floor;
var clamp = Math.clamp;
var randMax = Math.randMax;
/**
 * Calculates things related to zone desirability like
 * land values, etc.
 * @param {city.Map} map
 */
city.sim.Desirability = function(map) {
	var _map = map;
	
	//this._landValues = new city.MapArray(2, this._map);
	//this._landValues.fill(0);
	this._landValues = [];
	for(var i = 0, ml = _map._height / 2; i < ml; i++) {
		this._landValues[i] = [];
	}
	//this._terrainDensity = new city.MapArray(4, this._map);
	//this._terrainDensity.fill(0);
	_terrainDensity = [];
	for(var i = 0, ml = _map._height / 4; i < ml; i++) {
		_terrainDensity[i] = [];
	}
	
	//This will contain distances to city center from points on the map
	//which affects commercial zone desirability
	//this._centerDistances = new city.MapArray(8, this._map);
	var _centerDistances = [];
	for(var i = 0, cw = _map._height / 8; i < cw; i++) {
		_centerDistances[i] = [];
	}
	
	//this._populationDensity = new city.MapArray(2, this._map);
	
	var _center = { x: 0, y: 0 };
	this._averageLandValue = 0;
	
	var _height2 = _map._height >> 1;
	var _width2 = _map._width >> 1;
	
	/**
	 * Return average land value in the city
	 * @return {Number}
	 */
	this.getAverageLandValue = function() {
		return this._averageLandValue;
	},
	
	/**
	 * Get land value at point
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Number}
	 */
	this.getLandValue = function(x, y) {
		return this._landValues[y >> 1][x >> 1];
	};
	
	/**
	 * Get point desirability for commercial
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} hasRoad -1 for no road
	 */
	this.getCommercialDesirability = function(x, y, hasRoad) {
		if(hasRoad < 0) {
			return -3000;
		}
		
		return _centerDistances[y >> 3][x >> 3];
	};
	
	/**
	 * Get point desirability for residential
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} hasRoad -1 for no road
	 */
	this.getResidentialDesirability = function(x, y, hasRoad) {
		if(hasRoad < 0) {
			return -3000;
		}
		
		var value = this._landValues[y >> 1][x >> 1];
		//reduce value by pollution
		//opera.postError(value);		
		if(value < 0) {
			value = 0;
		}
		else {
			value = min(value * 32, 6000);
		}
		
		value = value - 3000;

		return value;
	};
	
	
	/**
	 * Smooths development density to terrain density
	 * @param {city.MapArray} dev
	 */
	var _applyDevelopmentToTerrain = function(dev) {
		var w = _map._width / 4;
		var h = _map._height / 4;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var z = 0;
                if (x > 0) {
                    z += dev[y][x - 1];
                }
                if (x < (w - 1)) {
                    z += dev[y][x + 1];
                }
                if (y > 0) {
                    z += dev[y - 1][x];
                }
                if (y < (h - 1)) {
                    z += dev[y + 1][x];
                }
                var val = (z / 4 + dev[y][x]) / 2;
                _terrainDensity[y][x] = val;
            }
        }
	};
	
	/**
	 * Scan and change pollution and land value factors
	 */
	this.doPollutionLandValueScan = function() {
		//var developmentMap = new city.MapArray(4, this._map);
		//developmentMap.fill(0);

		var developmentMap = [];
		for(var i = 0, dh = _map._height / 4; i < dh; i++) {
			developmentMap[i] = [];
		}

		var lvTot = 0,
		    lvNum = 0;
			
		var h = _map._height;
		var w = _map._width;
		for(var y = 0; y < h; y += 2) {
			for(var x = 0; x < w; x += 2) {
				var calcLandValue = false;
				//test world pieces instead of two-blocks for this
				for(var my = y; my <= y + 1; my++) {
					for(var mx = x; mx <= x + 1; mx++) {
						if(_map._zones[my][mx]._type != 'land') {
							calcLandValue = true;
							
							//This is same as floor(mx / 4)
							var dmX = mx >> 2;
							var dmY = my >> 2;
							
							var prevValue = developmentMap[dmY][dmX];//developmentMap.get(mx,my);
							if(!prevValue) {
								prevValue = 0;
							}
							//developmentMap.set(mx, my, prevValue + 15);
							developmentMap[dmY][dmX] = prevValue + 15;
						}
					}
				}
				
				
				if(!calcLandValue) {
					this._landValues[y >> 1][x >> 1] = 0;
				}
				else {
					var dis = 34 - _getCityCenterDistance(x, y) / 2;
					dis = dis << 2;
					
					var terrDens = _terrainDensity[y >> 2][x >> 2];
					if(!terrDens) {
						terrDens = 0;
					}
					
					dis += terrDens;
					//reduce pollution density map
					//add crime effect
					//opera.postError(dis);
					dis = clamp(dis, 1, 250);
					this._landValues[y >> 1][x >> 1] = dis;
					
					//Add value of this to total land value
					lvTot += dis;
					lvNum++;
				}				
			}
		}
		
		this._averageLandValue = 0;
		if(lvNum > 0) {
			this._averageLandValue = floor(lvTot / lvNum);
		}
		
		_applyDevelopmentToTerrain(developmentMap);
	};
	
	/**
	 * Smooths a MapArray with 2-size
	 * @param {city.MapArray} srcArr
	 * @return {city.MapArray}
	 */
	var _smoothMap = function(srcArr) {
		//Commented out code is old non-optimized code.
		//Replacement code is performance optimized and tested
		//to be enough faster to be useful.
		
		var dstArr = [];
				
		for (var y = 0; y < _height2; y++) {
			dstArr[y] = [];
        	for (var x = 0; x < _width2; x++) {
            	var z = 0;
                if (x > 0) {
                   // z += source.directGet(x - 1, y);
				   z += srcArr[y][x-1];
                }
                if (x < _width2 - 1) {
                    //z += source.directGet(x + 1, y);
					z += srcArr[y][(x+1)];
                }
                if (y > 0) {
                    //z += source.directGet(x, y - 1);
					z += srcArr[y-1][x];
                }
                if (y < (_height2 - 1)) {
                    //z += source.directGet(x, y + 1);
					z += srcArr[y+1][x];
                }
                //z = (z + source.directGet(x, y)) >>2;
				z = (z + srcArr[y][x]) >> 2;
                if (z > 255) {
                    z = 255;
                }
				//dest.directSet(x, y, z);
				dstArr[y][x] = z;
			}
		}
	
		return dstArr;

	};
	
	var _getCityCenterDistance = function(x, y) {
		var xDis = _center.x - x,
		    yDis = _center.y - y;
			
		if(x > _center.x) {
			xDis = x - _center.x;
		}
		
		if(y > _center.y) {
			yDis = y - _center.y;
		}
		
		var t = xDis + yDis;
		return  t < 64 ? t : 64;
	};
	
	var _calculateCenterDistances = function() {
		var w = _map._width / 8;
		var h = _map._height / 8;
		for(var x = 0; x < w; x++) {
			for(var y = 0; y < h; y++) {
				//Acceptable values for distance are -64 to 64 in this case
				
				//Results in 0 - 32
				var value = _getCityCenterDistance(x * 8, y * 8) >> 1;
				
				//Results in 0 - 128
				value = value * 4;
				
				//Finally between -64 and 64
				value = 64 - value;
				
				_centerDistances[y][x] = value;
			}
		}
	};
	
	/**
	 * Scans for population density changes
	 */
	this.doPopulationDensityScan = function() {
		//The bitwise op ">> 1" often used here 
		//divides by two and converts to int while at it
		
		//var tempMap1 = new city.MapArray(2, this._map);
		//tempMap1.fill(0);
		var tempMap1 = [];		
		for(var i = 0; i < _height2; i++) {
			tempMap1[i] = [];
		}
	
		//Used to determine center of city, ie. highest pop density pos
		var xTot = 0,
		    yTot = 0,
			zTot = 0;
			
		var h = _map._height;
		var w = _map._width;
		for(var y = 0; y < h; y++) {
			for(var x = 0; x < w; x++) {
				var ty = y >> 1;
				//CUJSO:inline return:pop args:x,y
				var pop = 0;
				var zone = _map._zones[y][x];
				switch(zone._type) {
					case 'residential':
						pop = _map.getResidentialPopulation(x, y);
						break;
					case 'commercial':
						pop = _map.getCommercialPopulation(x, y);
						break;
				}
				///var pop = this._getPopulationDensity(x,y);

				if(pop > 0) {
					//pop = Math.min(pop, 254);
					pop = pop < 254 ? pop : 254;
					
					//tempMap1.set(x, y, pop);
					tempMap1[ty][x >> 1] = pop;
					xTot += x;
					yTot += y;
					zTot++;
				}
				else {
					tempMap1[ty][x >> 1] = 0;
				}
			}
		}
		
		var tempMap2 = _smoothMap(tempMap1);
		tempMap1 = _smoothMap(tempMap2);
		tempMap2 = _smoothMap(tempMap1);
		
		this._populationDensity = tempMap2;
		
		_calculateCenterDistances();
	
		
		if(zTot > 0) {			
			_center.x = xTot / zTot;
			_center.y = yTot / zTot;
		}
		else {
			_center.x = _width2;
			_center.y = _height2;
		}
	};
};


/**
 * Traffic simulator part
 */
city.sim.Traffic = function(map){
	this._map = map;
	this._trafficMap = [];//new city.MapArray(2, map);
	var mapH = map._height >> 1;
	for(var i = 0; i < mapH; i++) {
		this._trafficMap[i] = [];
	}
	this._math = Math;
};

city.sim.Traffic.prototype = {	
	/**
	 * This is used to reduce traffic to simulate passing of time
	 * so it won't just keep accumulating for higher and higher
	 */
	reduceTraffic: function() {
		var w = this._map._width >> 1;
		var h = this._map._height >> 1;
		
		for(var x = 0; x < w; x++) {
			for(var y = 0; y < h; y++) {
				var trafficValue = this._trafficMap[y][x];//this._trafficMap.get(x, y);
				if(trafficValue == 0) {
					continue;
				}
				
				if(trafficValue <= 24) {
					//this._trafficMap.set(x, y, 0);
					this._trafficMap[y][x] = 0;
					continue;
				}
				
				if(trafficValue > 200) {
					//this._trafficMap.set(x, y, trafficValue - 34);
					this._trafficMap[y][x] = trafficValue - 34;
				}
				else {
					//this._trafficMap.set(x, y, trafficValue - 24);
					this._trafficMap[y][x] = trafficValue - 24;
				}
			}
		}
	},
	/**
	 * Try going to a target zone type using roads
	 * @param {Number} x
	 * @param {Number} y
	 * @param {String} target
	 */
	tryDriveTo: function(x, y, target) {
		var road = this._findRoad(x, y);
		
		if(!road) {
			return -1;
		}
		
		var route = [];
		
		//Maximum steps to try driving to destination
		var maxDist = 30;
		var lastPos = null;
		var currentPos = road;
		var targetFound = false;
		for(var distance = 0; distance < maxDist; distance++) {
			var pos = this._findNextRoad(currentPos.x, currentPos.y, lastPos);
			
			//No road found
			if(pos == null) {
				//Go back if possible
				if(lastPos != null) {
					pos = lastPos;
					lastPos = currentPos;
					currentPos = pos;
					distance += 3;
				}
				else {
					return false;
				}
			}
			//Found road so go there
			else {			
				lastPos = currentPos;
				currentPos = pos;
				
				//every other
				if(distance & 1) {
					route.push(pos);
				}
				
				if(this._targetFound(pos, target)) {
					targetFound = true;
					break;
				}				
			}
		}
		
		if(!targetFound) {
			return false;
		}
		
		for(var i = 0, len = route.length; i < len; i++) {
			var point = route[i];
			var traffic = this._trafficMap[point.y][point.x];//this._trafficMap.get(point.x, point.y);
			
			if(!traffic) {
				traffic = 0;
			}

			traffic = min(traffic + 50, 240);
						//opera.postError('Mapping: ' + point.x + ' ' + point.y + ' ' + traffic);
			//this._trafficMap.set(point.x, point.y, traffic);
			this._trafficMap[point.y][point.x] = traffic;
			
			//@todo move helicopter towards heavy traffic?
			
		}
		
		return true;
	},
	
	_targetFound: function(pos, target) {
		//offsets for up, down, left, right
		var posX = [-1,1,0,0];
		var posY = [0,0,-1,1];
		
		for(var i = 0; i < 4; i++) {
			var xx = pos.x + posX[i];
			var yy = pos.y + posY[i];
			
			if(this._map.onMap(xx, yy) && this._map._zones[yy][xx] instanceof city.zone[target]) {
				return true;
			}
		}
		
		return false;
	},
	
	_findNextRoad: function(x, y, prevPos) {
		//offsets for up, down, left, right for moving
		var posX = [-1,1,0,0];
		var posY = [0,0,-1,1];
		
		if(!prevPos) {
			prevPos = { x: -1, y: -1 };
		}
		
		var directions = [];
		for(var i = 0; i < 4; i++) {
			var xx = x + posX[i];
			var yy = y + posY[i];
			
			if(!(xx == prevPos.x && yy == prevPos.y) && this._isRoad(xx, yy)) {
				directions.push({ x: xx, y: yy });
			}
		}
		
		var options = directions.length;
		if(options == 0) {
			return null;
		}
		
		if(options == 1) {
			return directions[0];
		}
		
		return directions[randMax(options)];
	},
	
	_findRoad: function(x, y) {
		//zone offsets where a road can be accessed
		var perimX = [-1, 0, 1, 2, 2, 2, 1, 0,-1,-2,-2,-2];
		var perimY = [-2,-2,-2,-1, 0, 1, 2, 2, 2, 1, 0,-1];
		
		for(var i = 0; i < 12; i++) {
			var xx = x + perimX[i];
			var yy = y + perimY[i];
			
			if(!this._map.onMap(xx, yy) || !this._isRoad(xx, yy)) {
				continue;
			}
			
			//it's a road
			return { x: xx, y: yy };
		}
		
		return null;
	},
	
	_isRoad: function(x, y) {
		if(x < 0 || y < 0 || x > this._map._width || y > this._map._height) {
			return false;
		}
		return this._map._zones[y][x] instanceof city.zone.Road;
	}
};

/**
 * This simulates funding requirements of various city services
 * like fire dept., roads etc.
 * @constructor
 */
city.sim.Services = function() {
	this._funding = {
		Road: 100
	};
	
	this._efficiency = {
		Road: 100
	};
	
	this._amount = {
		Road: 0
	};
	
	this._cost = {
		Road: 0
	};
	
	this._availableFunds = 0;
	this._math = Math;
};

city.sim.Services.prototype = {
	/**
	 * Set the total available funds for spending on services
	 * @param {Number} funds
	 */
	setAvailableFunds: function(funds) {
		this._availableFunds = funds;
	},
	
	/**
	 * How many items of specific service exist in city?
	 * Ie. how many police stations or how many pieces of road
	 * @param {String} service
	 * @param {Number} amount
	 */
	setServiceAmount: function(service, amount) {
		this._amount[service] = amount;
	},
	
	/**
	 * Set a service's funding percentage
	 * @param {String} service
	 * @param {Number} percents 0-100
	 */
	setServiceFundingPercent: function(service, percents) {
		this._funding[service] = percents;
	},
	
	calculateCostAndEfficiency: function() {
		//This is how much roads would cost if funding = 100
		var roadMaxCost = this._amount['Road'] * 0.7;		
		
		//This is the actual cost of roads with funding taken into account
		this._cost.Road = roadMaxCost * (this._funding.Road / 100);
		
		var total = this._cost.Road;
		
		var availFunds = this._availableFunds;
		
		if(availFunds < this._cost.Road) {
			this._funding.Road = floor((availFunds / this._cost.Road) * 100);
			availFunds = 0;
		}
		else {
			availFunds -= this._cost.Road;
		}
		
		this._efficiency.Road = this._funding.Road;
	},
	
	/**
	 * Get efficiency of a service
	 * @param {String} service
	 * @return {Number} 0-100
	 */
	getEfficiency: function(service) {
		return this._efficiency[service];
	},
	
	getCost: function(service) {
		return this._cost[service];
	}
};

})(window);
