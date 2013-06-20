/**
 * @namespace city.zone
 */
city.zone = {};

/**
 * City zone base class
 * @constructor
 */
city.zone.Zone = function(){
};

city.zone.Zone.prototype = {
	/**
	 * Zone X offset from center of zone
	 * @type {Number}
	 */
	_offsetX: 0,
	
	/**
	 * Zone Y offset from center of zone
	 * @type {Number}
	 */
	_offsetY: 0,
	
	/**
	 * Zone type string
	 * @type {String}
	 */
	_type: '',
	
	/**
	 * Zone size, ie 1 = 1x1, 3 = 3x3
	 * @type {Number}
	 */
	_size: 1,
	
	_name: '',
	
	/**
	 * Does this zone conduct power?
	 */
	conductive: false,
	
	/**
	 * Is this zone powered 0/1
	 */
	powered: 0,
	
	/**
	 * Used to map connections to bordering tiles with roads etc.
	 */
	connections: null,
	
	/**
	 * Is this a building? (changes things like building on top of powerlines and connections)
	 */
	isBuilding: false,
	
	/**
	 * Used w/ roads
	 */
	traffic: null,
	
	/**
	 * population value
	 */
	population: null,
	
	/**
	 * land price value
	 */
	value: null,
	
	getName: function() {
		return this._name;
	},
	
	/**
	 * Return zone type
	 * @return {String}
	 */
	getType: function() {
		if (this._offsetX != 0 || this._offsetY != 0) {
			return this._type + ' o' + this._offsetX + 'x' + this._offsetY;
		}
		
		return this._type;		
	},
	
	/**
	 * Return zone size
	 * @return {Number} example: 1 = 1x1, 3 = 3x3, etc.
	 */
	getSize: function() {
		return this._size;
	},
	
	/**
	 * Offset of this piece of a bigger zone
	 * @param {Object} x
	 * @param {Object} y
	 */
	setOffset: function(x, y) {
		this._offsetX = x;
		this._offsetY = y;
		
		if(x != 0 || y != 0) {
			this._type = this._type + ' o' + this._size + '' + this._offsetX + 'x' + this._offsetY;
		}
	}
};

/**
 * @method getZone
 * @memberOf city.zone.Zone
 * @param {String} type
 * @return {city.zone.Zone}
 */
city.zone.Zone.getZone = function(type) {
	return city.zone[type];
};

city.zone.Zone.fromType = function(typeString) {
	var zone;
	switch(typeString) {
		case 'fire':
			zone = new city.zone.Fire();
			break;
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
		case 'land':
			zone = new city.zone.Land();
			break;
		default:
			throw 'Unhandled zone type';
	}
	
	return zone;
}

city.zone.Land = function() {
	this._type = 'land';
};
extend(city.zone.Land, city.zone.Zone);

city.zone.Water = function() {
	this._type = 'water';
};
extend(city.zone.Water, city.zone.Zone);

city.zone.Road = function() {
	this._type = 'road';
};
extend(city.zone.Road, city.zone.Zone);

city.zone.PowerLine = function() {
	this._type = 'powerline';
	this.conductive = true;
};
extend(city.zone.PowerLine, city.zone.Zone);

city.zone.RoadPower = function() {
	this._type = 'roadpower';
	this.conductive = true;
}
extend(city.zone.RoadPower, city.zone.Road);

city.zone.Residential = function(){
	this._type = 'residential';
	this._size = 3;
};
extend(city.zone.Residential, city.zone.Zone);
city.zone.Residential.prototype.conductive = true;
city.zone.Residential.prototype.isBuilding = true;

city.zone.ResidentialBuilding = function() {	
	this._type = 'resbuilding';
	this._size = 3;
};
extend(city.zone.ResidentialBuilding, city.zone.Residential);

city.zone.SmallHouse = function(){
	this._type = 'smallhouse';
};
extend(city.zone.SmallHouse, city.zone.Residential);


city.zone.Commercial = function(){
	this._type = 'commercial';
	this._size = 3;
};
extend(city.zone.Commercial, city.zone.Zone);
city.zone.Commercial.prototype.conductive = true;
city.zone.Commercial.prototype.isBuilding = true;

city.zone.CommercialBuilding = function() {
	this._size = 3;
	this._type = 'combuilding';
};
extend(city.zone.CommercialBuilding, city.zone.Commercial);



city.zone.Industrial = function(){
	this._type = 'industrial';
	this._size = 3;
};
extend(city.zone.Industrial, city.zone.Zone);
city.zone.Industrial.prototype.conductive = true;
city.zone.Industrial.prototype.isBuilding = true;

city.zone.IndustrialBuilding = function() {
	this._size = 3;
	this._type = 'indbuilding';
};
extend(city.zone.IndustrialBuilding, city.zone.Industrial);


city.zone.CoalPower = function() {
	this._type = 'coalpower';
	this._size = 4;
	this.conductive = true;
};
extend(city.zone.CoalPower, city.zone.Zone);
city.zone.CoalPower.prototype.isBuilding = true;

city.zone.NuclearPower = function() {
	this._type = 'nuclearpower';
	this._size = 4;
	this.conductive = true;
	this.isBuilding = true;
};
extend(city.zone.NuclearPower, city.zone.Zone);

city.zone.PoliceStation = function() {
	this._type = 'policestation';
	this._size = 3;
	this.conductive = true;
	this.isBuilding = true;
};
extend(city.zone.PoliceStation, city.zone.Zone);

city.zone.FireStation = function() {
	this._type = 'firestation';
	this._size = 3;
	this.conductive = true;
	this.isBuilding = true;
};
extend(city.zone.FireStation, city.zone.Zone);

city.zone.Rubble = function(){
	this._type = 'rubble';
	this._size = 1;
};
extend(city.zone.Rubble, city.zone.Zone);

city.zone.Fire = function(){
	this._type = 'fire';
	this._size = 1;
};
extend(city.zone.Fire, city.zone.Zone);
