var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ORDER_ADDRESS_SCHEMA = {};
ORDER_ADDRESS_SCHEMA.ORDER = {
	name: String,
	first_name: String,
	last_name: String,
	username: String,
	phone: {
		code: String,
		number: String
	},
	line1: String,
	landmark: String,
	country: String,
	city: String,
	state: String,
	email: String,
	phone_number: Number,
	street: String,
	zipcode: String,
	choose_location: String,
	address_value: String,
	fulladres: String,
	active: { type: Boolean, default: false },
	distance: { type: Number, default: 0 },
	loc: {
		lng: Number,
		lat: Number
	},
	status: { type: Number, default: 1 },
	flag: { type: Number, default: 1 },
	user_id: { type: Schema.ObjectId, ref: 'users' },
	addressList: [
		{
			name: String,
			first_name: String,
			last_name: String,
			username: String,
			phone: {
				code: String,
				number: String
			},
			line1: String,
			landmark: String,
			country: String,
			choose_location: String,
			email: String,

			city: String,
			state: String,
			street: String,
			zipcode: String,
			isDefault: { type: Number, default: 1 },
			fullAddress: String,
		}
	]
};
module.exports = ORDER_ADDRESS_SCHEMA;

