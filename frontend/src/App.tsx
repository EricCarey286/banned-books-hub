import './App.css';
import BookList  from './components/BookList/BookList';
import FeaturedBook  from './components/FeaturedBook/FeaturedBook';
import SuggestBookForm from './components/SuggestBookForm/SuggestBookForm';
import ContactForm from './components/ContactForm/ContactForm';
//import AddBookForm from './components/AddBookForm/AddBookForm';


const API_URL = import.meta.env.VITE_API_URL; //backend url

function App() {
  return (
    <>
      <h1>Banned Books Hub</h1>
      <p>This is a one stop hub for finding, supporting and reporting books that have been banned or censored </p>
      <FeaturedBook apiUrl={API_URL}/>
      <BookList apiUrl={API_URL}/>
      <SuggestBookForm apiUrl={API_URL}/>
      {/*<AddBookForm apiUrl={API_URL}/>*/}
      <ContactForm apiUrl={API_URL}/>
    </>
  )
}

export default App
