import { useNavigate } from 'react-router-dom';
import AddBookForm from '../AddBookForm/AddBookForm';
import AddImageForm from '../AddImageForm/AddImageForm';
import AdminBooksList from "../AdminBookList/AdminBookList";
interface AdminDashboardProps {
    handleLogout: () => void;
    apiUrl: string;
    username: string;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * Renders the admin dashboard with sections for suggested books, contact form submissions, book library, and an add book form.
 */
const AdminDashboard: React.FC<AdminDashboardProps> = ({ handleLogout, apiUrl, username, authFetch }) => {
    const navigate = useNavigate();

    return (
        <div className="admin-dashboard w-full p-4">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <div className="flex items-center gap-3">
                    {username && <span className="text-sm text-white/60 mr-2">{username}</span>}
                    <button
                        onClick={() => navigate('/')}
                        className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white rounded-full border border-white/20 hover:border-white/50 hover:bg-white/10 transition-colors"
                    >
                        Back to Main App
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-3 py-1.5 text-sm font-medium text-[#002251] bg-white rounded-full hover:bg-white/90 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <section className="border p-4 rounded-lg shadow-sm md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Suggested Books</h2>
                    <AdminBooksList apiUrl={apiUrl} bookList="suggested_books" authFetch={authFetch} />
                </section>

                <section className="border p-4 rounded-lg shadow-sm md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Contact Form Submissions</h2>
                    <AdminBooksList apiUrl={apiUrl} bookList="contact_form" authFetch={authFetch} />
                </section>

                <section className="border p-4 rounded-lg shadow-sm md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Book Library</h2>
                    <AdminBooksList apiUrl={apiUrl} bookList="books" authFetch={authFetch} />
                </section>

                <section className="border p-4 rounded-lg shadow-sm md:col-span-2">
                    <AddBookForm apiUrl={apiUrl} authFetch={authFetch} />
                    <AddImageForm apiUrl={apiUrl}/>
                </section>
            </div>
        </div>
    );
}

export default AdminDashboard;