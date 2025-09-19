import AddBookForm from '../AddBookForm/AddBookForm';
import AddImageForm from '../AddImageForm/AddImageForm';
import AdminBooksList from "../AdminBookList/AdminBookList";
interface AdminDashboardProps {
    handleLogout: () => void;
    apiUrl: string;
    username: string;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ handleLogout, apiUrl, username, authFetch }) => {

    return (
        <div className="admin-dashboard w-full p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <div className="flex items-center gap-4 m-auto">
                    {username && <span>Welcome, {username}</span>}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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