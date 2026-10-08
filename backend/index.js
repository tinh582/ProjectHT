import { createApp } from './app.js';
import { createClients } from './config/supabase.js';

const port = process.env.PORT || 5000;
createApp(createClients()).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
