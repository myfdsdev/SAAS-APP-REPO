import dotenv from "dotenv";
dotenv.config();

import SibApiV3Sdk from 'sib-api-v3-sdk';

console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY ? "FOUND" : "MISSING");

let apiInstance = null;

if (process.env.BREVO_API_KEY) {
  const client = SibApiV3Sdk.ApiClient.instance;
  const apiKey = client.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  console.log('✅ Brevo email API ready');
} else {
  console.log('⚠️ BREVO_API_KEY not set — emails disabled');
}

export default apiInstance;