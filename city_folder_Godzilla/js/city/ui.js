(function(window){
city.ui = {};

city.ui.Menu = function(state) {
	this._state = state;
};

city.ui.Menu.prototype = {
	_state: null,
	
	showReturnSave: function() {
		document.getElementById('return').style.display = 'block';
		document.getElementById('save').style.display = 'block';		
	},
	
	showLoad: function() {
		document.getElementById('load').style.display = 'block';
	},
	
	create: function() {
		var self = this;
		document.getElementById('new').addEventListener('click', function() {	
			var myAudio = document.getElementById("audio1");
			myAudio.volume= 0.1;
			self._state.newCity();
		}, false);

		document.getElementById('index').addEventListener('click', function() {	
			var myAudio = document.getElementById("audio1");
			myAudio.volume= 0.01;
			Credits();
		}, false);

		document.getElementById('help').addEventListener('click', function() {
			Guide();
			}, false);
		
		document.getElementById('notlucky').addEventListener('click', function() {
			var myAudio = document.getElementById("audio1");
			myAudio.volume= 0.1;
			Gotcha();
			}, false);
		
		
		document.getElementById('save').addEventListener('click', function() {
			self._state.saveCity();
		}, false);
		
		document.getElementById('load').addEventListener('click', function() {
			self._state.loadCity();
		}, false);

		document.getElementById('exit').addEventListener('click', function() {
			self._state.exit();
		}, false);

		document.getElementById('return').addEventListener('click', function() {
			self._state.returnToGame();
		}, false);
	}
};

/**
 * Create a new city tool menu
 * @param {Object} state the state to affect
 */
city.ui.CityMenu = function(state) {
	this._state = state;
};

city.ui.CityMenu.prototype = {
	_el: null,
	_state: null,
	
	
	create: function() {
		this._el = document.createElement('div');
		this._el.id = 'citymenu';
		
		var state = this._state;
		this._createButtons([
			{ image: 'r', click: function() { state.setTool('Residential'); } },
			{ image: 'c', click: function() { state.setTool('Commercial'); } },
			{ image: 'i', click: function() { state.setTool('Industrial'); } },		
			{ image: 'pd', click: function() { state.setTool('PoliceStation'); } },			
			{ image: 'fd', click: function() { state.setTool('FireStation'); } },
			{ image: 'co', click: function() { state.setTool('CoalPower'); } },
			{ image: 'nu', click: function() { state.setTool('NuclearPower'); } },			
			{ image: 'w', click: function() { state.setTool('PowerLine'); } },			
			{ image: 'ro', click: function() { state.setTool('Road'); } },
			//{ image: 'RA', click: function() { state.setTool('Rail'); } },
			{ image: 'b', click: function() { state.setTool('Bulldozer'); } },						
			{ image: 'menu', click: function() { question(); } }
			//state.showMenu();
		]);
		
		var navi = document.createElement('div');
		navi.className = 'navi';
		
		var up = document.createElement('a');
		up.className = 'up';
		up.addEventListener('click', function() { }, false);
		up.onmousedown = function() {
			state._scrollY = -1;
		};
		up.onmouseup = function() {
			state._scrollY = 0;
		};
		navi.appendChild(up);
		
		var right = document.createElement('a');
		right.className = 'right';
		right.addEventListener('click', function() { }, false);
		right.onmousedown = function() {
			state._scrollX = 1;
		};
		right.onmouseup = function() {
			state._scrollX = 0;
		};
		navi.appendChild(right);
		
		var down = document.createElement('a');
		down.className = 'down';
		down.addEventListener('click', function() { }, false);
		down.onmousedown = function() {
			state._scrollY = 1;
		};
		down.onmouseup = function() {
			state._scrollY = 0;
		};
		navi.appendChild(down);
		
		var left = document.createElement('a');
		left.className = 'left';
		left.addEventListener('click', function() { }, false);
		left.onmousedown = function() {
			state._scrollX = -1;
		};
		left.onmouseup = function() {
			state._scrollX = 0;
		};
		navi.appendChild(left);
		
		this._el.appendChild(navi);
	
		document.getElementById('city').appendChild(this._el);
	},
	
	destroy: function() {
		this._el.parentNode.removeChild(this._el);
		this._el = null;
	},
	
	_createButtons: function(buttons) {
		for(var i = 0; i < buttons.length; i++) {
			var b = document.createElement('a');
			b.className = buttons[i].image;
			b.addEventListener('click', buttons[i].click, false);
			this._el.appendChild(b);
		}
	}
};


/**
 * Create a city status UI element
 * @constructor
 */
city.ui.CityStatus = function(state) {
	this._state = state;
	this._oldFunds = getScore() *500;
	//this._oldFunds = 0;
	this._oldR = 0;
	this._oldC = 0;
	this._oldI = 0;		
	this._oldPop = 0;
};

city.ui.CityStatus.prototype = {
	_el: null,
	_city: null,
	_funds: null,
	_rci: null,
	_r: null,
	_c: null,
	_i: null,
	_date: null,
	_pop: null,
	
	create: function() {
		this._el = document.createElement('div');
		this._el.id = 'citystatus';
		
		this._funds = document.createElement('div');
		this._el.appendChild(this._funds);		
		this._funds.className = 'funds';
		
		this._pop = document.createElement('div');
		this._el.appendChild(this._pop);		
		this._pop.className = 'pop';
		this._pop.innerHTML = '0';
		
		this._rci = document.createElement('div');
		this._rci.className = 'rci';
		var r = document.createElement('div');
		r.className = 'r';

		var c = document.createElement('div');
		c.className = 'c';

		var i = document.createElement('div');
		i.className = 'i';
		

		this._r = r;
		this._c = c;
		this._i = i;
		this._rci.appendChild(r);
		this._rci.appendChild(c);
		this._rci.appendChild(i);				
		
		this._el.appendChild(this._rci);
		
		//this.onUiUpdate();
		
		document.getElementById('city').appendChild(this._el);
	},
	
	destroy: function() {
		this._el.parentNode.removeChild(this._el);
	},
	
	onUiUpdate: function() {
		var moneyMod = getScore();
		var funds = this._state._city._funds + moneyMod;
		if(this._oldFunds != funds) {
			this._funds.innerHTML = Math.round(funds * 100) / 100;
			this._oldFunds = funds;
			
		}
		
		
		var r = this._state._city.getDemand('r');
		if(this._oldR != r) {
			this._setBar(this._r, r);
			this._oldR = r;
		}

		var c = this._state._city.getDemand('c');
		if(this._oldC != c) {
			this._setBar(this._c, c);
			this._oldC = c;
		}

		var i = this._state._city.getDemand('i');
		if(this._oldI != i) {
			this._setBar(this._i, i);
			this._oldI = i;				
		}
		
		var pop = this._state._city._population;
		if(this._oldPop != pop) {
			this._pop.innerHTML = Math.floor(pop * 100);
			this._oldPop = pop;
		}
	},
	
	_setBar: function(bar, value) {
		var bottom, height;
		
		if(value >= 0) {
			//positive values just make the bar higher
			bottom = 10;
			height = ((value / 100) * 10);
		}
		else {
			//negative values must move the bar down and change the height
			//so that it looks like it goes below the middle
			bottom = 10 + ((value / 100) * 10);
			height = -1 * ((value / 100) * 10);
		}
		
		bar.style.bottom = bottom + 'px';
		bar.style.height = height + 'px';
	}
};

})(window);

	var numberCorrect = 0;
	var percentModifier = 1;
	var numberWrong = 0;
	var score = 0;
	var q_Index = 0
	var messageIndex = 1;
	var questionArray = [  ["Question: Mutiply 96 * 101?", 9696], ["Question: How many hydrogen atoms are in water?" , 2], ["Question: What year was the most PC desktops sold?" , 2012], ["Question: How many states of matter are in the universe?" , 4] , ["Question: Divide 693 and 63." , 11] , ["Question: What is the unemployment percentage of engineers in the U.S?" , 2] , ["Question: How fast does the Earth spin on its axis? (in miles)", 1038 ], ["Question: What is the hottest temperature ever recorded? (in Fahrenheit)", 134], ["Question: How many centimeters are in a 100 kilometers?", 10000000],["Question: How long is Earth's equator?(in miles)", 24,901], ["Question: Based on Moore's Law, if the number of transistors in 1971 is 2,300, what is the transistor count in 1975?", 9200],["Fun Question: What is pi*(z^2)*a? (Think!)", "pizza"], ["Question: How many yards are in 1 mile?", 1760 ], ["Question: What is 1.57 rad in degrees?", 180], ["Fill in the blanks: There are __ types of people: Ones who know binary and ones who don't. (Answer in binary)", 10], ["Question: A man has a mass of 60kg on Earth. What is his mass on the moon?", 60] ];
	

var qNum = questionArray.length;

	function question()
	{	
		var count = 0;
		while (count < 6)
		{		
			q_Index = Math.floor((Math.random()*16));			
			displayMessage ( gradeAnswer( q_Index, 1 , askQuestion( q_Index ) ) );							
			count++
			timeWindow = 5000;

			if (count >= 6)	
			{
				displayMessage(3);
																		
			}
		}
	
		}
						
	function askQuestion(Question)
	{
		var input = prompt ( questionArray[Question][0], "Enter Answer" );
		return input;
	}
	
	function gradeAnswer(Question, Answer, submission)
	{
		var messageIndex = 0;

		if (submission == questionArray[Question][Answer])
		{
			numberCorrect++							
			messageIndex = 1;			
		}
		else
		{
			numberWrong++	
			messageIndex = 2;											
		}

		setScore();

	return messageIndex;	

	}


	function setScore()
	{
		score = (numberCorrect * 400) - (numberWrong * 600);
		
			if (numberCorrect > numberWrong)
		{
					percentModifier = (numberWrong / numberCorrect) + 1;
		}
		if (numberCorrect < numberWrong){
			if(numberCorrect == 0)
				percentModifier = 0.5;	
		}
		
	}

	

	function getScore()
	{
		var currentScore = score;
		return currentScore;

		//return score;
	}
		
	function displayMessage(MessageIndex)
	{
		switch (MessageIndex)
		{
			case 1:
				alert ("Correct!!") 
				this.document.getElementById('audio8').play();
				break;
			case 2:
				alert ("Wrong!") 						
				break;
			case 3:
				alert ("Correct: " + numberCorrect + "\nIncorrect: " + numberWrong + "\n Score:" + score)
				//timeWindow == 30000;
				//score = 0;
				if(numberWrong>=3)
				{
					this.document.getElementById('audio2').play();
					releaseZilla(3);}
					
				break;			
		}
		if( numberWrong > numberCorrect && q_Index > (questionArray.length / 2)-1 )
			this.document.getElementById('audio7').play();					
	}	

function Guide()
{
window.open('img/guide.html');
}

function Gotcha()
{
window.open('gotcha.html');
}
function Credits()
{
window.open('roll.html');
}