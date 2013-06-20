(function(window){
city.sim = {};

//Performance optimization to reduce lookups.
var min = Math.min;
var floor = Math.floor;
var clamp = Math.clamp;
var randMax = Math.randMax;

city.sim.Power = function(city) {
	this.plantLocations = [];
	this.powerGrid = [];
	for(var i = 0, pl = city._map._height; i < pl; i++) {
		this.powerGrid[i] = [];
	}
	this._city = city;
};

city.sim.Power.prototype = {
	doPowerScan: function() {
		//offX and offY are offsets from a point to up, down, left, right
		var plantsLeft = this.plantLocations.length,
		    pos, totalPower, usedPower = 0, conNum, i,
			offX = [0,1,0,-1], offY = [-1,0,1,0], xx, yy,
			map = this._city._map, pl, moveIndex, outOfPower = false;
			
		this.powerGrid = [];
		for(i = 0, pl = map._height; i < pl; i++) {
			this.powerGrid[i] = [];
		}
		
		totalPower = (this._city._census.CoalPower * 700) + (this._city._census.NuclearPower * 2000)
		
		while(plantsLeft--) {
			pos = this.plantLocations.pop();
			moveIndex = -1;
			do {
				usedPower++;
				if(usedPower > totalPower) {
					outOfPower = true;
					break;
				}
				
				if(moveIndex != -1) {
					xx = pos.x + offX[moveIndex];
					yy = pos.y + offY[moveIndex];
					
					if(xx >= 0 && yy >= 0 && xx < map._width && yy < map._height) {
						pos.x = xx;
						pos.y = yy;
					}
				}
				
				this.powerGrid[pos.y][pos.x] = 1;
				conNum = 0;
				/*if (!rend._grid[pos.y][pos.x].innerHTML) {
					rend._grid[pos.y][pos.x].innerHTML = idx;
					idx++;
				}*/
				for(i = 0; i < 4 && conNum < 2; i++) {
					xx = pos.x + offX[i];
					yy = pos.y + offY[i];
					
					if(xx >= 0 && yy >= 0 && xx < map._width && yy < map._height) {
						if(map._zones[yy][xx].conductive && !this.powerGrid[yy][xx]) {
							conNum++;
							moveIndex = i;
							
							
						}
					}
				}
				
				if(conNum > 1) {
					this.plantLocations.push({
						x: pos.x,
						y: pos.y
					});
					plantsLeft++;
				}
				
				
			} while(conNum);

			if(outOfPower) {
				break;
			}
		}
		//console.log(plantsLeft);
		//console.log(usedPower);
		this.powerConsumption = usedPower;
		this.powerGenerated = totalPower;
	}
};


/**
 * Calculates things related to zone desirability like
 * land values, etc.
 * @param {city.Map} map
 */
city.sim.Desirability = function(map) {
	this._map = map;
	
	//this._landValues = new city.MapArray(2, this._map);
	//this._landValues.fill(0);
	this._landValues = [];
	this._crimeRateMap = [];
	this._crimeAverage = 0;
	this._pollutionDensityMap = [];
	this._pollutionAverage = 0;
	this._populationDensity = [];
	for(var i = 0, ml = this._map._height / 2; i < ml; i++) {
		this._landValues[i] = [];
		this._crimeRateMap[i] = [];
		this._pollutionDensityMap[i] = [];
		this._populationDensity[i] = [];		
	}
	//this._terrainDensity = new city.MapArray(4, this._map);
	//this._terrainDensity.fill(0);
	this._terrainDensity = [];
	for(var i = 0, ml = this._map._height / 4; i < ml; i++) {
		this._terrainDensity[i] = [];
	}
	
	//This will contain distances to city center from points on the map
	//which affects commercial zone desirability
	//this._centerDistances = new city.MapArray(8, this._map);
	this._centerDistances = [];
	this._policeStationMap = [];
	this._fireStationMap = [];
	for(var i = 0, cw = this._map._height / 8; i < cw; i++) {
		this._centerDistances[i] = [];
		this._policeStationMap[i] = [];
		this._fireStationMap[i] = [];
		
		for(var j = 0, ch = this._map._width / 8; j < ch; j++) {
			this._policeStationMap[i][j] = 0;
			this._fireStationMap[i][j] = 0;
		}
	}
	
	//this._populationDensity = new city.MapArray(2, this._map);
	
	this._center = { x: 0, y: 0 };
	this._averageLandValue = 0;
	this._math = Math;
	
	this._height2 = this._map._height >> 1;
	this._width2 = this._map._width >> 1;
};

city.sim.Desirability.prototype = {
	/**
	 * Return average land value in the city
	 * @return {Number}
	 */
	getAverageLandValue: function() {
		return this._averageLandValue;
	},
	
	/**
	 * Get land value at point
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Number}
	 */
	getLandValue: function(x, y) {
		return this._landValues[y >> 1][x >> 1];
	},
	
	/**
	 * Return a build suitability value for given position
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Number} 0-3, bigger is better
	 */
	getSuitabilityValue: function(x, y) {
		var xx = x >> 1, yy = y >> 1, val;
		val = this._landValues[yy][xx] - this._pollutionDensityMap[yy][xx];
		
		if(val < 30) {
			return 0;
		}
		
		if(val < 80) {
			return 1;
		}
		
		if(val < 150) {
			return 2;
		}
		
		return 3;
	},
	
	/**
	 * Get point desirability for commercial
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} hasRoad -1 for no road
	 */
	getCommercialDesirability: function(x, y, hasRoad) {
		if(hasRoad < 0) {
			return -3000;
		}
		
		return this._centerDistances[y >> 3][x >> 3];
	},
	
	/**
	 * Get point desirability for residential
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} hasRoad -1 for no road
	 */
	getResidentialDesirability: function(x, y, hasRoad) {
		var xx = x >> 1, yy = y >> 1, value;
		if(hasRoad < 0) {
			return -3000;
		}
		
		value = this._landValues[yy][xx] - this._pollutionDensityMap[yy][xx];

		if(value < 0) {
			value = 0;
		}
		else {
			value = min(value * 32, 6000);
		}
		
		value = value - 3000;

		return value;
	},
	
	doFireAnalysis: function() {
		this._fireStationMap = this._smoothStationMap(this._smoothStationMap(this._smoothStationMap(this._fireStationMap)));
	},
	
	doCrimeScan: function() {
		this._policeStationMap = this._smoothStationMap(this._policeStationMap);
		this._policeStationMap = this._smoothStationMap(this._policeStationMap);
		this._policeStationMap = this._smoothStationMap(this._policeStationMap);				
		
		var totz = 0, numz = 0, x, y ,z;
		
		for(y = 0; y < this._height2; y++) {
			for(x = 0; x < this._width2; x++) {
				z = this._landValues[y][x];
				if(z <= 0) {
					this._crimeRateMap[y][x] = 0;
				}
				else {
					numz++;
					z = 128 - z;
					z += this._populationDensity[y][x];
					z = z < 300 ? z : 300;
					z -= this._policeStationMap[y >> 2][x >> 2];
					z = clamp(z, 0, 250);
					this._crimeRateMap[y][x] = z;
					totz += z;
				}
			}
		}
		
		if(numz > 0) {
			this._crimeAverage = totz / numz;
		}
		else {
			this._crimeAverage = 0;
		}
	},
	
	_smoothStationMap: function(map) {
		var dstArr = [];
		
		var h = this._map._height / 8, w = this._map._width / 8,
		    x, y, edge;
		
		for(y = 0; y < h; y++) {
			dstArr[y] = [];
			
			for(x = 0; x < w; x++) {
				edge = 0;
				if(x > 0) {
					edge += map[y][x - 1];
				}
				
				if(x < w - 1) {
					edge += map[y][x + 1];
				}
				
				if(y > 0) {
					edge += map[y - 1][x];
				}
				
				if(y < h - 1) {
					edge += map[y + 1][x];
				}
				
				edge = map[y][x] + edge / 4;
				dstArr[y][x] = edge / 2;
			}	
		}
		
		return dstArr;
	},
	
	/**
	 * Scan and change pollution and land value factors
	 */
	doPollutionLandValueScan: function() {
		//var developmentMap = new city.MapArray(4, this._map);
		//developmentMap.fill(0);

		var developmentMap = [], lvTot = 0, lvNum = 0, map = this._map,
		    h = map._height, w = map._width, zones = map._zones, y = 0, x = 0,
			my, mx, dmX, dmY, calcLandValue, dh, i = 0, xDis, yDis, t, dis,
			center = this._center, landValues = this._landValues, density = this._terrainDensity,
			pollutionLevel, zone, tempMap1 = [], z, pnum, ptot, pmax;
			
		for(dh = h / 4; i < dh; i++) {
			developmentMap[i] = [];
		}
		
		for(var i = 0; i < this._height2; i++) {
			tempMap1[i] = [];
		}

		for(; y < h; y += 2) {
			for(x = 0; x < w; x += 2) {
				pollutionLevel = 0;
				calcLandValue = false;
				//test world pieces instead of two-blocks for this
				for(my = y; my <= y + 1; my++) {
					for(mx = x; mx <= x + 1; mx++) {
						zone = zones[my][mx];
						if(zone._type == 'land') {
							//This is same as floor(mx / 4)
							dmX = mx >> 2;
							dmY = my >> 2;
							
							var prevValue = developmentMap[dmY][dmX];//developmentMap.get(mx,my);
							if(!prevValue) {
								prevValue = 0;
							}
							//developmentMap.set(mx, my, prevValue + 15);
							developmentMap[dmY][dmX] = prevValue + 15;
							continue;
						}
						
						calcLandValue = true;
						
						//Determine pollution caused by whatever is built here
						switch(zone._type) {
							case 'road':
							case 'roadpower':
								/* high traffic: 75 */
								/* low traffic: 50 */
								break;
								
							case 'indbuilding':
								 pollutionLevel += 50;
								 break;
								
							//nuclearpower does not pollute
							case 'airport':
							case 'seaport':
							case 'coalpower':
								pollutionLevel += 100;
								break;
						}
					}
				}
				
				pollutionLevel = pollutionLevel < 255 ? pollutionLevel : 255;
				mx = x >> 1;
				my = y >> 1;
				
				tempMap1[my][mx] = pollutionLevel;
				
				if(!calcLandValue) {
					landValues[my][mx] = 0;
				}
				else {
					//Determine distance to city center (t)
					xDis = center.x - x;
					yDis = center.y - y;
						
					if(x > center.x) {
						xDis = x - center.x;
					}
					
					if(y > center.y) {
						yDis = y - center.y;
					}
					
					t = xDis + yDis;
					
					dis = 34 - (t < 64 ? t : 64) / 2;
					dis = dis << 2;
										
					dis += density[y >> 2][x >> 2] || 0;
					
					dis -= this._pollutionDensityMap[my][mx] || 0;
					if(this._crimeRateMap[my][mx] > 190) {
						dis -= 20;
					}
					//opera.postError(dis);
					dis = clamp(dis, 1, 250);
					landValues[my][mx] = dis;
					
					//Add value of this to total land value
					lvTot += dis;
					lvNum++;
				}				
			}
		}
		
		this._averageLandValue = (lvNum > 0 ? floor(lvTot / lvNum) : 0);
		
		this._pollutionDensityMap = this._smoothMap(this._smoothMap(tempMap1));
		
		for(y = 0; y < this._height2; y++) {
			for(x = 0; x < this._width2; x++) {
				z = this._pollutionDensityMap[y][x];
				if(z > 0) {
					pnum++;
					ptot += z;
					//max pol zone for monster target can be done here
				}
			}
		}
		
		this._pollutionAverage = 0;
		if(pnum > 0) {
			this._pollutionAverage = ptot / pnum;
		}
		
		this._applyDevelopmentToTerrain(developmentMap);
	},
		
	/**
	 * Smooths development density to terrain density
	 * @param {city.MapArray} dev
	 */
	_applyDevelopmentToTerrain: function(dev) {
		var w = this._map._width / 4, h = this._map._height / 4,
		    y = 0, x = 0;
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
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
                this._terrainDensity[y][x] = val;
            }
        }
	},
	
	/**
	 * Scans for population density changes
	 */
	doPopulationDensityScan: function() {
		//The bitwise op ">> 1" often used here 
		//divides by two and converts to int while at it
		
		var tempMap1 = [], i, j, y, x, xTot = 0, yTot = 0, zTot = 0,
		    h = this._map._height, w = this._map._width, ty, pop, zone;		
		for(i = 0; i < this._height2; i++) {
			tempMap1[i] = [];
		}
	
			
		/*var z = this._map._zones;
		z.forEach(function(val, y, arr) {
			val.forEach(function(zone, x, arr2) {
				var ty = y >> 1;
				//CUJSO:inline return:pop args:x,y
				var pop = 0;
				//var zone = this._map._zones[y][x];
				switch(zone._type) {
					case 'residential':
						pop = this._map.getResidentialPopulation(x, y);
						break;
					case 'commercial':
						pop = this._map.getCommercialPopulation(x, y);
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
			}, this);
		}, this);
		*/
		/*
		var y = h, x;
		do {
			x = w;
			do {
				var ty = y >> 1;
				//CUJSO:inline return:pop args:x,y
				var pop = 0;
				var zone = this._map._zones[y][x];
				switch(zone._type) {
					case 'residential':
						pop = this._map.getResidentialPopulation(x, y);
						break;
					case 'commercial':
						pop = this._map.getCommercialPopulation(x, y);
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
			} while(x--);
		} while(y--);*/
		for(y = 0; y < h; y++) {
			for(x = 0; x < w; x++) {
				ty = y >> 1;
				pop = 0;
				zone = this._map._zones[y][x];
				switch(zone._type) {
					case 'residential':
					case 'resbuilding':
						pop = this._map.getResidentialPopulation(x, y) * 8;
						break;
					case 'combuilding':
						pop = this._map.getCommercialPopulation(x, y) * 8;
						break;
					case 'indbuilding':
						pop = this._map.getIndustrialPopulation(x, y) * 8;
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
			}
		}
		
 		tempMap1 = this._smoothMap(this._smoothMap(this._smoothMap(tempMap1)));
		for(i = 0; i < this._height2; i++) {
			this._populationDensity[i] = [];
			for(j = 0; j < this._width2; j++) {
				this._populationDensity[i][j] = tempMap1[i][j] * 2;
			}
		}
		
		this._calculateCenterDistances();
	
		
		if(zTot > 0) {			
			this._center.x = xTot / zTot;
			this._center.y = yTot / zTot;
		}
		else {
			this._center.x = this._width2;
			this._center.y = this._height2;
		}
	},
	
	/**
	 * Smooths a MapArray with 2-size
	 * @param {city.MapArray} srcArr
	 * @return {city.MapArray}
	 */
	_smoothMap: function(srcArr) {
		//Commented out code is old non-optimized code.
		//Replacement code is performance optimized and tested
		//to be enough faster to be useful.
		
		var dstArr = [];
				
		for (var y = 0; y < this._height2; y++) {
			dstArr[y] = [];
        	for (var x = 0; x < this._width2; x++) {
            	var z = 0;
                if (x > 0) {
                   // z += source.directGet(x - 1, y);
				   z += srcArr[y][x-1] || 0;
                }
                if (x < this._width2 - 1) {
                    //z += source.directGet(x + 1, y);
					z += srcArr[y][(x+1)] || 0;
                }
                if (y > 0) {
                    //z += source.directGet(x, y - 1);
					z += srcArr[y-1][x] || 0;
                }
                if (y < (this._height2 - 1)) {
                    //z += source.directGet(x, y + 1);
					z += srcArr[y+1][x] || 0;
                }
                //z = (z + source.directGet(x, y)) >>2;
				z = (z + (srcArr[y][x] || 0)) >> 2;
                if (z > 255) {
                    z = 255;
                }
				//dest.directSet(x, y, z);
				dstArr[y][x] = z;
			}
		}
	
		return dstArr;

	},
	
	
	_calculateCenterDistances: function() {
		var w = this._map._width / 8;
		var h = this._map._height / 8;
		for(var x = 0; x < w; x++) {
			for(var y = 0; y < h; y++) {
				//Acceptable values for distance are -64 to 64 in this case
				
				//Results in 0 - 32
				var value = this._getCityCenterDistance(x * 8, y * 8) >> 1;
				
				//Results in 0 - 128
				value = value * 4;
				
				//Finally between -64 and 64
				value = 64 - value;
				
				this._centerDistances[y][x] = value;
			}
		}
	},
	
	/**
	 * Returns distance to city center from point
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Number}
	 */
	_getCityCenterDistance: function(x, y) {
		var xDis = this._center.x - x,
		    yDis = this._center.y - y;
			
		if(x > this._center.x) {
			xDis = x - this._center.x;
		}
		
		if(y > this._center.y) {
			yDis = y - this._center.y;
		}
		
		var t = xDis + yDis;
		return  t < 64 ? t : 64;
	}
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
			var px = point.x >> 1;
			var py = point.y >> 1;
			var traffic = this._trafficMap[py][px];//this._trafficMap.get(point.x, point.y);
			
			if(!traffic) {
				traffic = 0;
			}

			traffic = min(traffic + 50, 240);
						//opera.postError('Mapping: ' + point.x + ' ' + point.y + ' ' + traffic);
			//this._trafficMap.set(point.x, point.y, traffic);
			this._trafficMap[py][px] = traffic;
			
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
		Road: 100,
		FireStation: 100,
		PoliceStation: 100
	};
	
	this.resetEfficiency();
	
	this._amount = {
		Road: 0,
		FireStation: 0,
		PoliceStation: 0
	};
	
	this._cost = {
		Road: 0,
		FireStation: 0,
		PoliceStation: 0
	};
	
	this._availableFunds = 0;
};

city.sim.Services.prototype = {
	resetEfficiency: function() {
		this._efficiency = {
			Road: 32,
			FireStation: 1000,
			PoliceStation: 1000
		};
	},
	
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
		var policeMaxCost = this._amount['PoliceStation'] * 100;
		var fireMaxCost = this._amount['FireStation'] * 100;
		
		//This is the actual cost of roads with funding taken into account
		this._cost.Road = roadMaxCost * (this._funding.Road / 100);
		this._cost.FireStation = fireMaxCost * (this._funding.FireStation / 100);
		this._cost.PoliceStation = policeMaxCost * (this._funding.PoliceStation / 100);		
		
		var availFunds = this._availableFunds;
		
		if(availFunds < this._cost.Road) {
			this._funding.Road = floor((availFunds / this._cost.Road) * 100);
			availFunds = 0;
		}
		else {
			availFunds -= this._cost.Road;
		}
		
		if(availFunds < this._cost.FireStation) {
			this._funding.FireStation = floor((availFunds / this._cost.FireStation) * 100);
			availFunds = 0;
		}
		else {
			availFunds -= this._cost.FireStation;
		}
		
		if(availFunds < this._cost.PoliceStation) {
			this._funding.PoliceStation = floor((availFunds / this._cost.PoliceStation) * 100);
			availFunds = 0;
		}
		else {
			availFunds -= this._cost.PoliceStation;
		}
		
		//Maximum efficiency = 32
		this._efficiency.Road = 32;
		if(this._funding.Road < 100) {
			this._efficiency.Road = 32 * (this._funding.Road / 100);
		}
		
		this._efficiency.PoliceStation = 1000;
		if(this._funding.PoliceStation < 100) {
			this._efficiency.PoliceStation = 1000 * (this._funding.PoliceStation / 100);
		}
		
		this._efficiency.FireStation = 1000;
		if(this._funding.FireStation < 100) {
			this._efficiency.FireStation = 1000 * (this._funding.FireStation / 100);
		}
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
