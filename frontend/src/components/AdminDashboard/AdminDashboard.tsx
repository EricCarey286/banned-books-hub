import { useNavigate } from "react-router-dom";
import AddBookForm from '../AddBookForm/AddBookForm';
import AdminBooksList from "../AdminBookList/AdminBookList";

const API_URL = import.meta.env.VITE_API_URL; //backend URL

interface AdminDashboardProps {
    setAuth: (isAuthenticated: boolean) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ setAuth }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        setAuth(false); // Log out the admin
        navigate("/login"); // Redirect to the login page
    };
//<AdminBooksList apiUrl={API_URL} bookList="books"/>
    return <>
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
        
        <AdminBooksList apiUrl={API_URL} bookList="suggested_books"/>
        <AddBookForm apiUrl={API_URL} />

    </>
}

export default AdminDashboard;