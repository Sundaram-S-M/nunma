const axios = require('axios');

async function checkKeys() {
  const keyId = 'rzp_test_SfM7IvQYqSEhkk';
  const keySecret = '3KBeUVam8s0FprfkSjXR5dlk';
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

  try {
    const res = await axios.get('https://api.razorpay.com/v1/customers', {
      headers: { Authorization: authHeader }
    });
    console.log("SUCCESS, keys are valid.", res.status);
  } catch (error) {
    console.log("FAILED:", error.response?.data || error.message);
  }
}

checkKeys();
