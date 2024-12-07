import './App.css';
import BookList  from './components/BookList/BookList';
import AddBookForm from './components/AddBookForm/AddBookForm';

function App() {
  return (
    <>
      <h1>Banned Books Hub</h1>
      <BookList />
      <AddBookForm apiUrl="https://localhost:3000"/>
    </>
  )
}

export default App
