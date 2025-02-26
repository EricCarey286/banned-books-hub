import './App.css';
import BookList  from './components/BookList/BookList';
import SuggestBookForm from './components/SuggestBookForm/SuggestBookForm';

//const API_URL = import.meta.env.VITE_API_URL;
const TEST_URL = 'http://localhost:3000'

function App() {
  return (
    <>
      <h1>Banned Books Hub</h1>
      <BookList apiUrl={TEST_URL}/>
      <SuggestBookForm apiUrl={TEST_URL}/>
    </>
  )
}

export default App
