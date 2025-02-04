import './App.css';
import BookList  from './components/BookList/BookList';
import SuggestBookForm from './components/SuggestBookForm/SuggestBookForm';

function App() {
  return (
    <>
      <h1>Banned Books Hub</h1>
      <BookList />
      <SuggestBookForm apiUrl="https://localhost:3000"/>
    </>
  )
}

export default App
