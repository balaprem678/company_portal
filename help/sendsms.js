// const axios = require('axios');
// const querystring = require('querystring');

// const tlClient = axios.create({
//   baseURL: 'https://api.textlocal.in/',
//   params: {
//     apiKey: 'NjU1NDcwNjMzMjc2NDU0MzZjNDc2ZDcwNDQ2YjU1NzQ=', // Textlocal API key
//     sender: 'pillai' // 6-character sender ID
//   }
// });


// const smsClient = {
//   sendVerificationMessage: user => {
//     if (user && user.phone && user.verifyCode) {
//       const params = querystring.stringify({
//         numbers: `91${user.phone}`,
//         message: `Your iWheels verification code is ${user.verifyCode}`
//       });
//    console.log(tlClient);
   
//       tlClient.post('/send', params)
//         .then(response => {
//           console.log('OTP sent successfully:', response.data);
//         })
//         .catch(error => {
//           console.error('Error sending OTP:', error);
//         });
//     }
//   }
// };


// module.exports = smsClient;

const axios = require('axios');
const querystring = require('querystring');

async function smsClient(numbers, message) {
    const data = querystring.stringify({
        apikey: "NGUzMzc3MzY3MDRiNjI3MDRjNDc2ZDQ0Njg0MzM4NTI=",
        numbers: numbers,
        message: message,
        sender: "PILAIS"
    });

    try {
        const response = await axios.post('https://api.textlocal.in/send/', data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
}

    module.exports = smsClient