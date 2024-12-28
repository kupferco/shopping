const fs = require('fs');
const path = require('path');

// Paths to .env files
const proxyEnvPath = path.join(__dirname, 'proxy-server', '.env');
const clientEnvPath = path.join(__dirname, 'VoiceApp', '.env.development');

// Ngrok API endpoint
const ngrokApiUrl = 'http://127.0.0.1:4040/api/tunnels';

// Helper function to wait for ngrok
const fetchNgrokUrls = async (retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(ngrokApiUrl); // Using built-in fetch
      const data = await response.json();
      const tunnels = data.tunnels;

      // Identify tunnels by name
      const clientTunnel = tunnels.find(tunnel => tunnel.name === 'client')?.public_url;
      const proxyTunnel = tunnels.find(tunnel => tunnel.name === 'proxy')?.public_url;

      if (clientTunnel && proxyTunnel) {
        return { clientTunnel, proxyTunnel };
      }

      console.log(`Retrying... (${i + 1}/${retries})`);
    } catch (error) {
      console.error(`Error fetching ngrok URLs (attempt ${i + 1}):`, error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error('Failed to find two named ngrok tunnels after retries.');
};


// Function to update a .env file
function updateEnvFile(filePath, placeholder, newValue) {
  try {
    let envContent = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`${placeholder}=.*`);
    envContent = envContent.replace(regex, `${placeholder}=${newValue}`);
    fs.writeFileSync(filePath, envContent, 'utf8');
    console.log(`Updated ${placeholder} in ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

// Main function to update all .env files
(async () => {
  try {
    const { clientTunnel, proxyTunnel } = await fetchNgrokUrls();

    console.log(`Fetched Client Ngrok URL: ${clientTunnel}`);
    console.log(`Fetched Proxy Ngrok URL: ${proxyTunnel}`);

    // Update client .env
    updateEnvFile(clientEnvPath, 'API_URL', proxyTunnel); // Proxy URL goes to client

    // Update proxy .env
    updateEnvFile(proxyEnvPath, 'PROXY_SERVER_NGROK', proxyTunnel); // Proxy URL
    updateEnvFile(proxyEnvPath, 'CLIENT_DEVELOPMENT_NGROK', clientTunnel); // Client URL
  } catch (error) {
    console.error('Error updating ngrok environment variables:', error.message);
    process.exit(1);
  }
})();
