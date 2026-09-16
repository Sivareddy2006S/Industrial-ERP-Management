const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 ERP Server running on http://localhost:${PORT}`);
  console.log(`📚 API Docs available at http://localhost:${PORT}/api-docs`);
});
