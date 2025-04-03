import { useEffect, useState } from 'react';
import AddBookForm from '../AddBookForm/AddBookForm';
import AdminBooksList from "../AdminBookList/AdminBookList";

interface AdminDashboardProps {
    handleLogout: () => void;
    apiUrl: string;
    username: string;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ handleLogout, apiUrl, username, authFetch }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [dashboardData, setDashboardData] = useState<any>({});
    
    useEffect(() => {
        // Fetch dashboard data using the authenticated fetch
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                const response = await authFetch(`https://${apiUrl}/api/admin`);
                
                if (response.ok) {
                    const data = await response.json();
                    setDashboardData(data);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchDashboardData();
    }, [apiUrl, authFetch]);
    
    if (isLoading) {
        return <div className="p-4 text-center">Loading dashboard...</div>;
    }
    
    return (
        <div className="admin-dashboard p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    {username && <span>Welcome, {username}</span>}
                    <button 
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
            
            <div className="grid gap-6">
                <section className="border p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Suggested Books</h2>
                    <AdminBooksList apiUrl={apiUrl} bookList="suggested_books" authFetch={authFetch} />
                </section>
                
                <section className="border p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Contact Form Submissions</h2>
                    <AdminBooksList apiUrl={apiUrl} bookList="contact_form" authFetch={authFetch} />
                </section>
                
                <section className="border p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Book Library</h2>
                    <AdminBooksList apiUrl={apiUrl} bookList="books" authFetch={authFetch} />
                </section>
                
                <section className="border p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Add New Book</h2>
                    <AddBookForm apiUrl={apiUrl} authFetch={authFetch} />
                </section>
            </div>
        </div>
    );
}

export default AdminDashboard;