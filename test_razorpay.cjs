async function checkKeys() {
  const keyId = 'rzp_test_SfM7IvQYqSEhkk';
  const keySecret = '3KBeUVam8s0FprfkSjXR5dlk';
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  
  const createPayload = {
      email: "test@example.com",
      phone: "+919999999999",
      type: "route",
      legal_business_name: "Test Name",
      business_type: "individual",
      customer_facing_business_name: "Test Business",
      profile: { 
        category: "education",
        subcategory: "professional_courses",
        addresses: {
            registered: {
                street1: "123 Test St",
                street2: "Apt 4",
                city: "Tirunelveli",
                state: "Tamil Nadu", // Testing with space
                postal_code: "627951",
                country: "IN"
            }
        }
      }
  };

  try {
    const res = await fetch('https://api.razorpay.com/v2/accounts', {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });
    const data = await res.json();
    if (res.ok) {
        console.log("SUCCESS, account created:", data.id);
    } else {
        console.log("FAILED:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log("ERROR:", error.message);
  }
}

checkKeys();
