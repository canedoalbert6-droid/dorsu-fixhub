const fs = require('fs');

let code = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf-8');

// Fix lucide-react imports
if (!code.includes('LayoutGrid')) {
  code = code.replace(/import \{ RefreshCcw,([^}]+)\} from 'lucide-react';/, (match, p1) => {
    return match.replace(p1, p1 + ', LayoutGrid, Send, User ');
  });
}

// Fix authModel imports
if (!code.includes('getUserId')) {
  code = code.replace(/import \{ getQrToken \} from '\.\.\/models\/authModel';/, "import { getQrToken, getUserId } from '../models/authModel';");
}

// Fix destructured viewType
if (!code.includes('viewType, setViewType')) {
  code = code.replace(/loading,\r?\n\s*activeTab, setActiveTab,\r?\n\s*editingNotes/, 
    "loading,\n    activeTab, setActiveTab,\n    viewType, setViewType,\n    editingNotes"
  );
}

fs.writeFileSync('src/pages/AdminDashboard.jsx', code);
console.log('Fixed imports successfully.');
