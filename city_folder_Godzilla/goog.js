if(!CU.google) 
	CU.google = {};

CU.google.SERVICE_READER = 'reader';

/**
 * @constructor
 * @param {String} token authentication SID
 */
CU.google.Reader = function(token) {
	this._token = token;
};

CU.google.Reader.prototype = {
//	_apiUrl: 'http://www.google.com/reader/api/0/',
	_apiUrl: 'http://admins.fi/~eagleeye/dump.php',
	_token: '',
	
	/**
	 * Fetch list of subscribed-to feeds
	 * @param {Function} callback function(feeds) to call when done
	 */
	listSubscriptions: function(callback) {
		var xhr = new XMLHttpRequest();
		var keys = [
			'output=json',
			'ck=' + (new Date()).getTime(),
			'client=grwidget-1'			
		];
		
		xhr.open('GET', this._apiUrl /*+ 'subscription/list?'*/ + '?' + keys.join('&'), true);

		//opera.postError('SID=' + this._token);
		//document.cookie = 'SID=' + this._token;
			//document.cookie = 'SID=' + this._token;
//		xhr.setRequestHeader('Cookie', 'SID=' + encodeURIComponent(this._token));
	//	xhr.setRequestHeader('Cookie', 'SID=' + encodeURIComponent(this._token));		
		//xhr.setRequestHeader('Cookie', 'SID=' + encodeURIComponent(this._token));		
//		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.onreadystatechange = function(ev) {
			if(xhr.readyState != 4)
				return;
			
			callback(xhr.responseText);
		};
		opera.postError(keys.join('&'));
		xhr.send('');
	}
	//Cookie: SID=token
};

/**
 * @constructor
 */
CU.google.Authenticator = function() {
};

CU.google.Authenticator.prototype = {
	/**
	 * Authenticate to a service
	 * @param {String} service service name
	 * @param {String} user username
	 * @param {String} password password
	 * @param {Function} callback callback to which an AuthToken is passed, or null on failure
	 * @method
	 */
	authenticate: function(service, user, password, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://www.google.com/accounts/ClientLogin', true);
	
		var keys = [
			'service=' + service,
			'Email=' + encodeURIComponent(user),
			'Passwd=' + encodeURIComponent(password),
			'source=grwidget-1',
			'continue=http://www.google.com/',
			'accountType=GOOGLE'
		];
		
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.onreadystatechange = function(ev) {			
			if(xhr.readyState != 4)
				return;
				
			if(xhr.status == 200) {
				var pieces = xhr.responseText.split('\n');
				//Need to find SID=<something here> as SID is the login token
				opera.postError(xhr.responseText);
				for(var i = 0, len = pieces.length; i < len; i++) {
					var parts = pieces[i].split('=');
					
					if(parts[0] != 'SID') {
						continue;
					}
					else {
						callback(parts[1]);
						return;
					}
				}
				
				callback(null);
			}
			else {
				callback(null);
			}
		}
		
		xhr.send(keys.join('&'));
	}
};
