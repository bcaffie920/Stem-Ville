(function(window){
window.city = {};

//Performance opt, reducing lookups
var min = Math.min;
var clamp = Math.clamp;
var max = Math.max;
var floor = Math.floor;
var randMax = Math.randMax;
var ceil = Math.ceil;

city.City = function(name, mayor, funds, map, info) {
	this._info = info;
	this._name = name;
	this._mayor = mayor;
	this._funds = funds;
	this._map = map;
	this._demand = {
		r: 0,
		c: 0,
		i: 0
	};
	
	this._services = new city.sim.Services();
	this._traffic = new city.sim.Traffic(this._map);
	this._desirability = new city.sim.Desirability(this._map);
	this._power = new city.sim.Power(this);
};

city.City.prototype = {
	_name: '',
	_mayor: '',
	_funds: 0,
	_demand: {
		r: 0,
		c: 0,
		i: 0
	},
	
	_time: 0,
	_phase: 0,
	_simCycle: 0,
	_map: null,
	_population: 0,
	_services: null,
	_traffic: null,
	_desirability: null,
	_taxRatio: 7,
	_disasters: false,
	
	TAX_FREQUENCY: 48,

	getName: function() {
		return this._name;
	},
	
	getMayor: function() {
		return this._mayor;
	},
	
	getFunds: function() {
		return this._funds;
	},
	
	increaseFunds: function(amount) {
		this._funds += amount;
	},
	
	decreaseFunds: function(amount) {
		this._funds -= amount;
	},
	
	hasFunds: function(amount) {
		return this._funds >= amount;
	},
	
	getDemand: function(type) {
		//Convert to percentages, -100% to 100%
		switch(type) {
			case 'r':
				return floor((this._demand[type] / 2000) * 100);
				break;
				
			case 'c':
			case 'i':
				return floor((this._demand[type] / 1500) * 100);
				break;
		}
			
			
		return 0;
	},
	
	/**
	 * Return city state in a saveable format
	 * @return {String}
	 */
	save: function() {
		var data = {
			zones: this._map._zones/*,
			powerGrid: this._power.powerGrid,
			landValues: this._desirability._landValues,
			crimeRateMap: this._desirability._crimeRateMap,
			crimeAverage: this._desirability._crimeAverage,
			pollutionDensityMap: this._desirability._pollutionDensityMap,
			pollutionAverage: this._desirability._pollutionAverage,
			populationDensity: this._desirability._populationDensity,
			terrainDensity: this._desirability._terrainDensity,
			policeStationMap: this._desirability._policeStationMap,
			fireStationMap: this._desirability._fireStationMap*/
		};
		return JSON.stringify(data);
	},
	
	/**
	 * Load city state from saved data
	 * @param {String} data
	 */
	load: function(data) {
		data = eval('(' + data + ')');
		var zones = data.zones, y, x, yl, xl, z, zone, type, idx;
		for(y = 0, yl = zones.length; y < yl; y++) {
			for(x = 0, xl = zones[y].length; x < xl; x++) {
				z = zones[y][x];
				type = z._type;
				idx = type.indexOf(' ');
				if(idx > 0) {
					type = type.substr(0, idx);
				}
				
				switch(type) {
					case 'residential':
						zone = new city.zone.Residential();
						break;
					case 'resbuilding':
						zone = new city.zone.ResidentialBuilding();
						break;
					case 'commercial':
						zone = new city.zone.Commercial();
						break;
					case 'combuilding':
						zone = new city.zone.CommercialBuilding();
						break;
					case 'industrial':
						zone = new city.zone.Industrial();
						break;
					case 'indbuilding':
						zone = new city.zone.IndustrialBuilding();
						break;
					case 'road':
						zone = new city.zone.Road();
						break;
					case 'roadpower':
						zone = new city.zone.RoadPower();
						break;
					case 'powerline':
						zone = new city.zone.PowerLine();
						break;
					case 'policestation':
						zone = new city.zone.PoliceStation();
						break;
					case 'firestation':
						zone = new city.zone.FireStation();
						break;
					case 'coalpower':
						zone = new city.zone.CoalPower();
						break;
					case 'nuclearpower': 
						zone = new city.zone.NuclearPower();
						break;
					case 'smallhouse':
						zone = new city.zone.SmallHouse();
						break;
					default:
						zone = new city.zone.Land();
						break;
				}
				
				if (zone instanceof city.zone.RoadPower) {
					this._map._zones[y][x] = new city.zone.Road();
					this._map.fixConnections(x, y);
					this._map._zones[y][x] = zone;
					this._map.fixConnections(x, y);
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
					this._map._zones[y][x] = zone;
					this._map.fixConnections(x, y);
				}
			}
		}
	},
	
	simulate: function() {				
		if(this._phase > 15)
			this._phase = 0;
			
		if(this._phase == 0) {
			if(++this._simCycle > 1023) {
				this._simCycle = 0;
			}
			
			this._time++;
			
				
			if(!(this._simCycle & 1)) {
				this._calculateRciDemand();
			}
			
			//Store historic data for calculations
			if(this._census) {
				this._censusHistory = this._census;
			}
			
			this._census = {
				Road: 0,
				Residential: 0,
				Commercial: 0,
				Industrial: 0,
				CoalPower: 0,
				NuclearPower: 0,
				PoliceStation: 0,
				FireStation: 0,
				Fire: 0,
				resPopulation: 0,
				comPopulation: 0,
				indPopulation: 0,
				unpoweredZones: 0,
				poweredZones: 0
			};
			
			//Initialize history values if not set
			if(!this._censusHistory) {
				this._censusHistory = this._census;
			}					
			
			this._power.plantLocations = [];
		}				
		else if(this._phase > 0 && this._phase < 9) {
			var mapW = this._map._width;
			this._scanMap((this._phase - 1) * mapW / 8, this._phase * mapW / 8);
		}
		else if(this._phase == 9) {
			if(this._time % this.TAX_FREQUENCY == 0) {
				this._calculateCashFlow();
			}
		}
		else if(this._phase == 10) {
			this._traffic.reduceTraffic();
		}
		else if(this._phase == 11) {
			if(this._simCycle % 5 == 0) {
				this._power.doPowerScan();
				
				if(this._power.powerConsumption > this._power.powerGenerated) {
					this._info.innerHTML = 'Need power plants';
				}
			}
		}
		else if(this._phase == 12) {
			if(this._simCycle % 17 == 0) {
				this._desirability.doPollutionLandValueScan();				
			}
		}
		else if(this._phase == 13) {
			if(this._simCycle % 18 == 0) {
				//crime affects city score, and if it's very high,
				//it also affects land values
				this._desirability.doCrimeScan();
			}
		}
		else if(this._phase == 14) {
			if(this._simCycle % 19 == 0) {
				this._desirability.doPopulationDensityScan();	
			}
		}
		else if(this._phase == 15) {
			if(this._simCycle % 20 == 0) {
				this._desirability.doFireAnalysis();
				this._info.innerHTML = '';
			}
			
			//@todo incomplete
			//this._doDisasters();
		}
		
		
		this._phase++;
	},
	
	_doDisasters: function() {
		//chance of disaster determined by randMax 480
		if(randMax(480) === 0) {
			//just fires now
			var x = randMax(this._map._width - 1),
			    y = randMax(this._map._height - 1),
				z;
			
			z = this._map._zones[y][x];
			if (z instanceof city.zone.Residential || z instanceof city.zone.Commercial ||
				z instanceof city.zone.Industrial) {
				this._map._zones[y][x] = new city.zone.Fire();
			}
		}
	},
	
	/**
	 * This determines RCI demand based on various values
	 */
	_calculateRciDemand: function() {
		var taxMax = 20;
		
		var employment = 0,
		    migration = 0,
			births = 0,
			projectedResPop = 0,
			projectedComPop = 0,
			projectedIndPop = 0,
			laborBase = 0;
		
		//Not sure why this is done but it works in Sim City so it works here.. =)
		var normalizedResPop = this._census.resPopulation / 8;
		
		//City's total population
		this._population = normalizedResPop + this._census.comPopulation + this._census.indPopulation;
		
		//Employment ratio is determined by historic data
		if(this._census.resPopulation > 0) {
			employment = (this._censusHistory.comPopulation + this._censusHistory.indPopulation) / normalizedResPop
		}
		else {
			employment = 1;
		}
		
		//Determine how much people come from elsewhere to the city
		//Availability of employment and existing population affect this
		migration = normalizedResPop * (employment - 1);
		
		//Births are determined by pop and birthrate which is 0.02
		births = normalizedResPop * 0.02;
		
		//This is the projected new population for the next year
		projectedResPop = normalizedResPop + migration + births;
		
		//Determine how much labor is needed at the city based on previous populations
		//affects how much industry city requires
		var prevLaborNeed = this._censusHistory.comPopulation + this._censusHistory.indPopulation;
		if(prevLaborNeed > 0) {
			//Divide by 8 to make into normalized res pop
			laborBase = (this._censusHistory.resPopulation / 8) / prevLaborNeed;
		}
		else {
			laborBase = 1;
		}
		
		laborBase = clamp(laborBase, 0, 1.3);
		
		var internalMarket = (normalizedResPop + this._census.comPopulation + this._census.indPopulation) / 3.7;
		
		//how much commercial will be needed in the future
		projectedComPop = internalMarket * laborBase;

		//1.2 for easy in original		
		projectedIndPop = this._census.indPopulation * laborBase * 1.2;
		
		//there's always projectedIndPopMin amount of industrial demand
		projectedIndPop = projectedIndPop > 5 ? projectedIndPop : 5;
		
		//projected pop vs actual pop -ratios
		var resRatio = 1.3; //defaults to 1.3
		if(normalizedResPop > 0) {		
			resRatio = projectedResPop / normalizedResPop; 
		}	
		
		var comRatio = projectedComPop;
		if(this._census.comPopulation > 0) {
			comRatio = projectedComPop / this._census.comPopulation;
		}
		
		var indRatio = projectedIndPop;
		if(this._census.indPopulation > 0) {
			indRatio = projectedIndPop / this._census.indPopulation;
		}
		
		resRatio = resRatio < 2 ? resRatio : 2;
		comRatio = comRatio < 2 ? comRatio : 2;
		indRatio = indRatio < 2 ? indRatio : 2;
		
		//Effect of each tax ratio on demand
		var taxRatioEffects = [200, 150, 120, 100, 80, 50, 30, 0, -10, -40, -100,
	        -150, -200, -250, -300, -350, -400, -450, -500, -550, -600];
		
		//"counter weight" for tax effect
		var taxScale = 600;
		
		var taxModifier = min(this._taxRatio, taxMax);
		resRatio = (resRatio - 1) * taxScale + taxRatioEffects[taxModifier];
		comRatio = (comRatio - 1) * taxScale + taxRatioEffects[taxModifier];
		indRatio = (indRatio - 1) * taxScale + taxRatioEffects[taxModifier];
		
		this._demand['r'] = clamp(this._demand['r'] + resRatio, -2000, 2000);
		this._demand['c'] = clamp(this._demand['c'] + comRatio, -1500, 1500);
		this._demand['i'] = clamp(this._demand['i'] + indRatio, -1500, 1500);
		//opera.postError(this._demand['r'] + ' ' + this._demand['c'] + ' ' + this._demand['i']);
		//Caps can be added here as per orig simulate.cpp line 651
	},
	
	_calculateCashFlow: function() {
		//No pop means no "wear" of services, and no tax either
		if (this._population > 0) {
			var taxIncome = (this._population * this._desirability.getAverageLandValue() / 120) * this._taxRatio * 1.4;
			
			this._services.setAvailableFunds(this.getFunds() + taxIncome);
			this._services._amount.Road = this._census.Road;
			this._services._amount.FireStation = this._census.FireStation;
			this._services._amount.PoliceStation = this._census.PoliceStation;
			this._services._funding.Road = 100;
			this._services._funding.FireStation = 100;
			this._services._funding.PoliceStation = 100;
			this._services.calculateCostAndEfficiency();
		
			var servicesCost = this._services._cost.Road + this._services._cost.PoliceStation + this._services._cost.FireStation;
			
			this.increaseFunds(taxIncome);
			this.decreaseFunds(servicesCost);
		}
		else {
			this._services.resetEfficiency();
		}
	},
	
	_scanMap: function(startX, endX) {
		var mapH = this._map._height;
		for(var y = 0; y < mapH; y++) {
			for(var x = startX; x < endX; x++) {
				var zone = this._map._zones[y][x];
				
				if(zone.conductive) {
					zone.powered = this._power.powerGrid[y][x] || 0;
					
					if(zone.powered) {
						this._census.poweredZones++;
					}
					else {
						this._census.unpoweredZones++;
					}
				}

				switch(zone._type) {
					case 'fire': 
						this._census.Fire++;
						if(!(randMax(65536) & 3)) {
							//Attempt to set neighboring tiles on fire
							var offX = [0,1,0,-1], offY = [-1,0,1,0], i;
							for(i = 0; i < 4; i++) {
								if((randMax(65536) & 7) == 0) {
									
								}
							}
						}
						break;
						
					case 'road':
					case 'roadpower':
						//also determine traffic amount, and high traffic = two roads
						this._census['Road']++;
						var roadEff = this._services._efficiency.Road;
						//32 = max road efficiency, roads start to deteriorate 
						//at 15/16ths of efficiency
						if(roadEff < (15 * 32 / 16) && (randMax(32767) & 511) == 0) {
							if(roadEff < (randMax(32767) & 31)) {
								this._map.setZone(x, y, new city.zone.Land());
							}
						}
						
						if(zone.traffic == 2) {
							//Heavy traff counts as two roads
							this._census.Road++;
						}
						
						var trafDen = this._traffic._trafficMap[y >> 1][x >> 1] >> 6;
						if(trafDen > 1) {
							trafDen--;
						}
						
						zone.traffic = trafDen;
						break;
						
					case 'coalpower': 
						this._census.CoalPower++;
						this._power.plantLocations.push({ x: x, y: y });
						break;
						
					case 'nuclearpower':
						if(this._disasters && randMax(30000) === 0) {
							//@todo do meltdown
							break;
						}
						
						this._census.NuclearPower++;
						this._power.plantLocations.push({ x: x, y: y });
						
						break;
					
					case 'firestation':
						this._census.FireStation++;
						
						var z;
						if(zone.powered) {
							z = this._services._efficiency.FireStation;
						}
						else {
							z = floor(this._services._efficiency.FireStation / 2);
						}
						
						//if no road, reduce efficiency some more
						if(this._traffic._findRoad(x, y) == null) {
							z = z / 2;
						}
						
						this._desirability._fireStationMap[y >> 3][x >> 3] += z;
						break;
						
					case 'policestation':
						this._census.PoliceStation++;
						
						var z;
						if(zone.powered) {
							z = this._services._efficiency.PoliceStation;
						}
						else {
							z = floor(this._services._efficiency.PoliceStation / 2);
						}
						
						//if no road, reduce efficiency some more
						if(this._traffic._findRoad(x, y) == null) {
							z = z / 2;
						}
						
						this._desirability._policeStationMap[y >> 3][x >> 3] += z;
						break;
						
					case 'residential':
					case 'resbuilding':
						this._census.Residential++;

						var population = this._map.getResidentialPopulation(x, y);
						this._census.resPopulation += population;
						
						var trafficOk = 1;
						if(population > randMax(35)) {
							trafficOk = this._traffic.tryDriveTo(x, y, 'Commercial');
						}

						if(trafficOk == -1) {
							this._doResEmigration(x, y, population, this._desirability.getSuitabilityValue(x, y));
							break;
						}
						
						//Randomly build or not
						if(randMax(32767) & 7) {
							break;
						}

						var score = this._desirability.getResidentialDesirability(x, y, trafficOk);
						var totalScore = this._demand['r'] + score;
						
						//Check for power
						if(!zone.powered) {
							totalScore = -500;
						}
						
						if(totalScore > -350 && (totalScore - 26380) > (randMax(65536) - 32767)) {
							//determine pollution and pass it instead of 1000 for next
							this._doResImmigration(x, y, population, this._desirability.getSuitabilityValue(x, y));
							break;
						}
						
						if(totalScore < 350 && (totalScore + 26380) < (randMax(65536) - 32767)) {
							//determine pollution and pass it
							this._doResEmigration(x, y, population, this._desirability.getSuitabilityValue(x, y));							
						}
						break;														
						
					case 'commercial': 
					case 'combuilding':
						this._census.Commercial++;
						var population = this._map.getCommercialPopulation(x, y);
						this._census.comPopulation += population;
						
						var trafficOk = 1;
						if(population > randMax(6)) {
							trafficOk = this._traffic.tryDriveTo(x, y, 'Industrial');
						}
						
						if(trafficOk == -1) {
							this._doComEmigration(x, y, population, this._desirability.getSuitabilityValue(x, y));							
							break;
						}
						
						if(!(randMax(65536) & 7)) {
							var score = this._desirability.getCommercialDesirability(x, y, trafficOk);
							var totalScore = this._demand['c'] + score;
							
							if(!zone.powered) {
								totalScore = -500;
							}
						
							if(trafficOk && totalScore > -350 && 
								(totalScore - 26380) > (randMax(65536) - 32767)) {
								this._doComImmigration(x, y, population, this._desirability.getSuitabilityValue(x, y));
								break;
							}
							
							if(totalScore < 350 && (totalScore + 26380) < (randMax(65536) - 32767)) {
								this._doComEmigration(x, y, population, this._desirability.getSuitabilityValue(x, y));							
							}
						}
						break;
					
					case 'industrial':
					case 'indbuilding':
						this._census.Industrial++;
						var population = this._map.getIndustrialPopulation(x, y);
						this._census.indPopulation += population;
						
						var trafficOk = 1;
						if (population > randMax(6)) {
							trafficOk = this._traffic.tryDriveTo(x, y, 'Residential');
						}
						
						if (trafficOk == -1) {
							this._doIndEmigration(x, y, population, randMax(65536) & 1);
							break;
						}
						
						if (!(randMax(65536) & 7)) {
							var totalScore = this._demand['i'];
							
							if(!zone.powered) {
								totalScore = -500;
							}
						
							
							//Industrial does not care about pollution
							if(totalScore > -350 && (totalScore - 26380) > (randMax(65536) - 32767)) {
								this._doIndImmigration(x, y, population, randMax(65536) & 1);
								break;
							}
							
							if(totalScore < 350 && (totalScore + 26380) < (randMax(65536) - 32767)) {
								this._doIndEmigration(x, y, population, randMax(65536) & 1);							
							}
						}
				}
			}
		}
	},
	
	_doIndImmigration: function(x, y, pop, value) {
		//4 = max ind pop
		if(pop < 4) {
			var indb = new city.zone.IndustrialBuilding();
			indb.population = pop + 1;
			
			//indbuildings are only for landvalue 0 and 1
			//no building types for better landvalue
			indb.value = value < 2 ? value : 1;
			this._map.setZone(x, y, indb);
		}
	},
	
	_doIndEmigration: function(x, y, pop, value) {
		if(pop > 1) {
			var indb = new city.zone.IndustrialBuilding();
			indb.population = pop - 1;
			indb.value = value < 2 ? value : 1;
			this._map.setZone(x, y, indb);
			return;
		}
		
		if(pop == 1) {
			this._map.setZone(x, y, new city.zone.Industrial());
		}
	},

	_doComImmigration: function(x, y, pop, value) {
		var z = this._desirability.getLandValue(x, y);
		
		z = z >> 5;
		
		if(pop > z) {
			return;
		}
		
		//Commercial building max pop = 5
		if(pop < 5) {
			//comPlop pos pop value
			var comb = new city.zone.CommercialBuilding();
			comb.population = pop + 1;
			comb.value = value;
			this._map.setZone(x, y, comb);
		}
	},

	_doComEmigration: function(x, y, oldPop, landValue) {
		if(oldPop > 1) {
			var comb = new city.zone.CommercialBuilding();
			comb.population = oldPop - 1;
			comb.value = landValue;
			this._map.setZone(x, y, comb);
			return;
		}
		
		if(oldPop == 1) {
			this._map.setZone(x, y, new city.zone.Commercial());
		}
	},
	
	_doResEmigration: function(x, y, pop, suitability) {
		if(!pop) {
			return;
		}
		
		if(pop > 16) {
			var resb = new city.zone.ResidentialBuilding();
			resb.value = suitability;
			resb.population = pop - 8;
			this._map.setZone(x, y, resb);
			return;
		}
		
		if(pop == 16) {
			//Replace building with small houses
			for (var yy = y - 1; yy <= y + 1; yy++) {
				for (var xx = x - 1; xx <= x + 1; xx++) {
					//make sure this is an empty res zone and not the center
					var zone = this._map._zones[yy][xx];
					if (zone._offsetX != 0 || zone._offsetY != 0) {
						this._map.setZone(xx, yy, new city.zone.SmallHouse());
					}
					else {
						this._map._zones[yy][xx] = new city.zone.Residential();
					}
				}
			}
		}
		
		if(pop < 16) {
			//Clear one small house off the zone
			for(var yy = y - 1; yy <= y + 1; yy++) {
				for(var xx = x - 1; xx <= x + 1; xx++) {
					var zone = this._map._zones[yy][xx];
					if(zone instanceof city.zone.SmallHouse) {
						var emptyRes = new city.zone.Residential();
						emptyRes.setOffset(xx - x, yy - y);
						this._map._zones[yy][xx] = emptyRes;
						return;
					}										
				}
			}
		}
	},
	
	_doResImmigration: function(x, y, oldPopulation, landValue) {
		//Too much pollution is bad		
		if(this._desirability._pollutionDensityMap[y >> 1][x >> 1] > 128) {
			return;	
		}

		var zone = this._map._zones[y][x];
		if (zone._type == 'residential') {
			//Attempt to build a small house on the lot
			if (oldPopulation < 8) {
				for (var yy = y - 1; yy <= y + 1; yy++) {
					for (var xx = x - 1; xx <= x + 1; xx++) {
						//make sure this is an empty res zone and not the center
						var zone = this._map._zones[yy][xx];
						if (zone._type != 'residential' && zone instanceof city.zone.Residential &&
						!(zone instanceof city.zone.SmallHouse)) {
							this._map.setZone(xx, yy, new city.zone.SmallHouse());
							return;
						}
					}
				}
			}
			else if(this._desirability._populationDensity[y >> 1][x >> 1] > 64) {
				//resPlop pos, 0 landValue
				//base = ((landvalue * 4 + 0) * 9) + RZB - 4;
				var resb = new city.zone.ResidentialBuilding();
				resb.value = landValue;
				resb.population = 16;
				this._map.setZone(x, y, resb);
			}
			
			return;
		}
		
		//res building pop can be 16, 24, 32, 40
		if(oldPopulation < 40) {
			var resb = new city.zone.ResidentialBuilding();
			resb.value = landValue;
			resb.population = oldPopulation + 8;
			this._map.setZone(x, y, resb);
		}
	}
};

/**
 * @constructor
 */
city.Map = function() {	
	this._zones = [];//new Array(this._height);
	/*var size = this._height * this._width;
	for(var i = 0; i < size; i++) {
		this._zones[i] = null;
	}*/
	
	//this._zones = new city.MapArray(1, this);
	
	for(var i = 0; i < this._height; i++) {
		this._zones[i] = [];//new Array(this._width);
	}
};

city.Map.prototype = {
	/**
	 * @type {Integer} width in squares
	 */
	_width: 128,

	/**
	 * @type {Integer} height in squares
	 */
	_height: 128,
	
	/**
	 * @return {Number} map width
	 */
	getWidth: function() {
		return this._width;		
	},
	
	/**
	 * @return {Number} map height
	 */
	getHeight: function() {
		return this._height;
	},
	
	/**
	 * Try to build zone at location
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Function} zone constructor for zone
	 */
	tryBuild: function(x, y, zone) {
		var zObj = new zone();
		var size = zObj.getSize();
		
		var startX = 0,
		    startY = 0,
			endX = 0,
			endY = 0;
			
		//just hardcoded for now..
		if(size == 3) {
			startX = -1;
			startY = -1;
			endX = 1;
			endY = 1;
		}
		else if(size == 4) {
			startX = -1;
			startY = -1;
			endX = 2;
			endY = 2;
		}
		
		var roadOnPower = false;
		for(var i = startY; i <= endY; i++) {
			for(var j = startX; j <= endX; j++) {
				//must offset for location check
				var xx = x + j;
				var yy = y + i;
				
				if(!this.onMap(xx, yy)) {
					return false;
				}
				
				var zoneType = this._zones[yy][xx]._type;
				//buildings can be placed over powerlines
				if(zObj.isBuilding && zoneType == 'powerline') {
					continue;
				}
				
				//If existing tile is road or power and we build power or road,
				//we need special handling to replace the tile with a road on power tile
				if((zObj._type == 'road' && zoneType == 'powerline') 
					|| (zObj._type == 'powerline' && zoneType == 'road')) {
					
					var conns = this._zones[yy][xx].connections;
					//Make sure the existing road/power on the map is in straight
					//line and not a corner or a crossing as we don't support building on those
					if (!conns || (conns[0] == 0 && conns[2] == 0) || (conns[1] == 0 && conns[3] == 0)) {
						this.setZone(x, y, new city.zone.RoadPower());
						return true;
					}
					else {
						return false;
					}
				}
				
				if(zoneType != 'land') {
					return false;
				}
			}
		}

		this.setZone(x, y, new zone());
		
		return true;
	},
	
	fixConnections: function(x, y) {
		var zone = this._zones[y][x], xx, yy, i, adjZone,
		    offX = [0,1,0,-1], offY = [-1,0,1,0],
			connections = [0,0,0,0];
		
		if(zone._type == 'road' || zone._type == 'powerline' || zone._type =='roadpower')
			this._fixSingle(x, y);
	
		for(i = 0; i < 4; i++) {
			xx = x + offX[i];
			yy = y + offY[i];
			
			if (xx >= 0 && yy >= 0 && xx < this._width && yy < this._height) {
				adjZone = this._zones[yy][xx];
				if(!adjZone) {
					continue;
				}
				
				/*if(adjZone._type == zone._type || (zone._type == 'road' && adjZone._type == 'roadpower')
					|| (zone._type == 'roadpower' && adjZone._type == 'road')
					|| (zone._type == 'roadpower' && adjZone._type == 'powerline')
					|| (zone._type == 'powerline' && adjZone._type == 'roadpower'))*/
					this._fixSingle(xx, yy);				
			}
		}
				
	},
	
	_fixSingle: function(x, y) {
		var zone = this._zones[y][x], xx, yy, i, adjZone,
		    offX = [0,1,0,-1], offY = [-1,0,1,0],
			connections = [0,0,0,0];
		
		for(i = 0; i < 4; i++) {
			xx = x + offX[i];
			yy = y + offY[i];
			
			if (xx >= 0 && yy >= 0 && xx < this._width && yy < this._height) {
				adjZone = this._zones[yy][xx];
				if(!adjZone) {
					continue;
				}
				
				if(adjZone._type == zone._type || (zone._type == 'powerline' && adjZone.isBuilding)
					|| (zone._type == 'road' && adjZone._type == 'roadpower')
					|| (zone._type == 'roadpower' && adjZone._type == 'road')
					|| (zone._type == 'powerline' && adjZone._type == 'roadpower')) {
					connections[i] = 1;
				}
				else {
					connections[i] = 0;
				}
			}
		}
		
		zone.connections = connections;
	},
	
	/**
	 * Test if square is inside map
	 * @param {Number} x
	 * @param {Numebr} y
	 * @return {Boolean}
	 */
	onMap: function(x, y) {
		if(x < 0 || y < 0) {
			return false;
		}
		
		if(x >= this._width || y >= this._height) {
			return false;
		}
		
		return true;
	},
	
	/**
	 * Set zone at position
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Object} zone
	 */
	setZone: function(x, y, zone) {
		//this._zones[y][x] = zone;
		var size = zone.getSize();
		
		var startX = 0,
		    startY = 0,
			endX = 0,
			endY = 0;
		
		//if the zone is already offset it means it's being
		//set in to replace something else and this is not needed
		if (zone._offsetX == 0 && zone._offsetY == 0) {
			if (size == 3) {
				startX = -1;
				startY = -1;
				endX = 1;
				endY = 1;
			}
			else 
				if (size == 4) {
					startX = -1;
					startY = -1;
					endX = 2;
					endY = 2;
				}
		}
		
		for(var i = startY; i <= endY; i++) {
			for(var j = startX; j <= endX; j++) {
				var xx = x + j;
				var yy = y + i;
				var z = new zone.constructor();
				if(z._type != 'land')
					z.setOffset(j, i);
				
				if(zone.population !== null) {
					z.population = zone.population;
				}
				
				if(zone.value !== null) {
					z.value = zone.value;
				}
				//this._zones.set(xx, yy, z);
				this._zones[yy][xx] = z;
				this.fixConnections(xx, yy);
				//console.log('bar');
				//this._zones[xx * this._height + yy] = z;
			}
		}
		
		if(zone._type == 'road' || zone._type == 'powerline' || zone._type == 'rail' || zone._type == 'roadpower') {
			this.fixConnections(x, y);
		}
		
		//For buildings may need to fix powerline connections or other such
		if(zone.isBuilding) {
			//Just do a looping of all the possible outer tiles and inner ones
			//doesn't really matter for the extra looping since this is ran
			//only very rarely
			startX--;
			startY--;
			endY++
			endX++;
			for(var i = startY; i <= endY; i++) {
				for(var j = startX; j <= endX; j++) {
					var xx = x + j;
					var yy = y + i;
					
					if (xx >= 0 && yy >= 0 && xx < this._width && yy < this._height) {
						var fixZone = this._zones[yy][xx];
						if(fixZone._type == 'powerline') {
							this._fixSingle(xx, yy);
						}
					}		
				}
			}
		}
		
		//this._zones.set(x, y, zone);
	},
	
	/**
	 * Return zone at position
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Object}
	 */
	getZone: function(x, y) {
		/*if(this._zones[y] && this._zones[y][x])
			return this._zones[y][x];
			*/
		/*if(this.onMap(x, y))
			return this._zones.get(x, y);*/
		return this._zones[y][x];
		//throw new foo;
		//return this._zones[x * this._height + y];
		//return null;
	},
	
	/**
	 * Get population of residential zone centered at x, y
	 * @param {Number} x
	 * @param {Number} y
	 * @return {Number} can be 0-8, 16, 24, 32, 40
	 */
	getResidentialPopulation: function(x, y) {
		var count = 0, zone = this._zones[y][x];
		if(zone._type == 'residential') {
			for(var i = y - 1; i <= y + 1; i++) {
				for(var j = x - 1; j <= x + 1; j++) {
					if(this._zones[i][j]._type == 'smallhouse') {
						count++;
					}
				}
			}
		}
		else {
			return this._zones[y][x].population;
		}
		
		return count;
	},
	
	getCommercialPopulation: function(x, y) {
		var zone = this._zones[y][x];
		if(zone instanceof city.zone.CommercialBuilding) {
			return zone.population;
		}
		
		return 0;
	},
	
	getIndustrialPopulation: function(x, y) {
		var zone = this._zones[y][x];
		if(zone instanceof city.zone.IndustrialBuilding) {
			return zone.population;
		}
		
		return 0;
	}
};

/**
 * @constructor
 */
city.MapFactory = function() {	
};

city.MapFactory.prototype = {
	/**
	 * Create empty map
	 * @method
	 * @return {city.Map}
	 */
	createEmptyMap: function() {
		var m = new city.Map();
		var w = m.getWidth();
		var h = m.getHeight();
		
		for(var i = 0; i < h; i++) {
			for(var j = 0; j < w; j++) {
				m._zones[i][j] = new city.zone.Land();
			}
		}
		
		return m;
	}
};

})(window);
