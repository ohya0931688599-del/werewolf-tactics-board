import { useGameSocket } from './hooks/useGameSocket';
import { NotesBoard } from './components/NotesBoard';

function App() {
  // Initialize Socket connection
  useGameSocket();

  return <NotesBoard />;
}

export default App;
