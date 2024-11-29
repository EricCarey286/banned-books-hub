import './App.css'
import BookList  from './components/BookList/BookList'  
import AddBookForm from './components/AddBookForm/AddBookForm'

function App() {
  const handleFormSubmit = (book: {
    isbn: string;
    title: string;
    author: string;
    description: string;
    ban_reason: string;
    banned_by: string;
  }) => {
    console.log("Submitted Book:", book);
  };

  return (
    <>
      <h1>Banned Books Hub</h1>
      <BookList />
      <AddBookForm onSubmit={handleFormSubmit}/>
    </>
  )
}

export default App
