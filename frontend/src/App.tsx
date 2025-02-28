import './App.css';
import BookList  from './components/BookList/BookList';
import SuggestBookForm from './components/SuggestBookForm/SuggestBookForm';

const API_URL = import.meta.env.VITE_API_URL; //backend url from railway

function App() {
  return (
    <>
      <h1>Banned Books Hub</h1>
      <BookList apiUrl={API_URL}/>
      <SuggestBookForm apiUrl={API_URL}/>
    </>
  )
}

export default App
