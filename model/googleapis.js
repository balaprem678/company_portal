var http = require('http');
var CONFIG = require('../config/config');
var library = require('./library.js');

function geocode(data, callback) {
	var ApiKey = library.getMapApi();
    return http.get({
        protocol: 'http:',
        host: 'maps.googleapis.com',
        path: '/maps/api/geocode/json?latlng=' + data.latitude + ',' + data.longitude + '&sensor=false'+'&key='+ApiKey+'&libraries=places'
    }, function(response) {
		
        var body = '';
        response.on('data', function(d) {
			
            body += d;
        });
        response.on('end', function() {
			try{
				var parsed = JSON.parse(body);
				callback(parsed.results);
			}catch(e){
				callback({});
			}
        });
    });
}

var bl = require('bl');
function geocodePromise(data) {
	var ApiKey = library.getMapApi();
	return new Promise(function(resolve, reject) {
		var rp = require('request-promise');
		var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+ data.latitude + ',' + data.longitude + '&sensor=false'+'&key='+ApiKey+'&libraries=places';
		rp(url).then(function (parsedBody) {
			try{
				var parsed = JSON.parse(parsedBody);
				resolve(parsed.results);
			}catch(e){
				resolve({});
			}
		})
		.catch(function (err) {
			reject(err);
		});
	});
}

function directions(data, callback) {
	var ApiKey = library.getMapApi();
    return http.get({
        protocol: 'http:',
        host: 'maps.googleapis.com',
        path: '/maps/api/directions/json?origin=' + data.from + '&destination=' + data.to + '&alternatives=true&sensor=false&mode=driving'
    }, function(response) {
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {
            var parsed = JSON.parse(body);
            callback(parsed);
        });
    });
}
	var getFullAddress = function(data){
		if(typeof data != 'undefined' && typeof data.lat != 'undefined' &&  data.lat != '' && typeof data.lon != 'undefined' && data.lon != ''){
			var lat = data.lat;
			var lon = data.lon;
			var NodeGeocoder = require('node-geocoder');
			var options = {
				provider: 'google',
				httpAdapter: 'https', // Default
				apiKey: ApiKey, // for Mapquest, OpenCage, Google Premier
				formatter: null         // 'gpx', 'string', ...
			};
			var geocoder = NodeGeocoder(options);
			return geocoder.reverse({ lat: lat, lon: lon }).then(function(res) {
				if (typeof res != 'undefined' && res.length > 0) {
					var response = res[0];
					if (typeof response != 'undefined' && typeof response.city == 'undefined') {
						if (typeof response.administrativeLevels != 'undefined' && typeof response.administrativeLevels.level2long != 'undefined') {
							response.city = response.administrativeLevels.level2long;
						}
						
					}
					if (typeof response != 'undefined' && typeof response.state == 'undefined') {
						if (typeof response.administrativeLevels != 'undefined' && typeof response.administrativeLevels.level1long != 'undefined') {
							response.state = response.administrativeLevels.level1long;
						}
					}
					var result =  { err: 0, message: '', result: { address: response } };
					return new Promise(function(resolve, reject){
						resolve(result);
					})
				} else {
					var geocode = {
						'latitude': lat,
						'longitude': lon
					};
					var newdata = { address: {} };
					return GoogleAPI.geocodePromise(geocode).then(function(response) {
						if (typeof response != 'undefined' && response.length > 0 && response[0].address_components) {
							response[0].address_components.forEach(function (item) {
								switch (item.types[0]) {
									case "postal_code":
										newdata.address.zipcode = item.long_name;
										break;
									case "country":
										newdata.address.country = item.long_name;
										break;
									case "administrative_area_level_1":
										newdata.address.state = item.long_name;
										break;
									case "locality":
										newdata.address.line1 = item.long_name;
										break;
									case "administrative_area_level_2":
										newdata.address.city = item.long_name;
										break;
								}
							})
							return new Promise(function(resolve, reject){
								resolve({ err: 0, message: '', result: newdata });
							})
						}else{
							return new Promise(function(resolve, reject){
								resolve({ err: 0, message: '', result: {} });
							})
						}
					}).catch(function(err) {
						var result =  { err: 0, message: '', result: {} };
						return new Promise(function(resolve, reject){
							resolve(result);
						})
					});
				}
			}).catch(function(err) {
				var result =  { err: 0, message: '', result: {} };
				return new Promise(function(resolve, reject){
					resolve(result);
				})
			});
		}else{
			return new Promise(function(resolve, reject){
				resolve({ err: 0, message: '', result: {} });
			})
		}
	}
module.exports = {
    "geocode": geocode,
    "geocodePromise": geocodePromise,
    "getFullAddress": getFullAddress,
    "directions": directions
};