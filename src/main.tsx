import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BackupService } from './services/backupService';

// Automatically restore user accounts, products, and reports across system updates
BackupService.ensureRestoredFromVault();

createRoot(document.getElementById('root')!).render(<App />);
