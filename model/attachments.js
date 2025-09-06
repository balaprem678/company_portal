var CONFIG = require('../config/config');

let get_attachment = function (path, name) {
    return encodeURI(path.substring(2) + name);
}

let capitalizeFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
    "get_attachment": get_attachment,
    "capitalizeFirstLetter": capitalizeFirstLetter
};
