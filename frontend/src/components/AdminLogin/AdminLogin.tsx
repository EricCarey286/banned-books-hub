import { useState } from "react";
import { useNavigate } from "react-router-dom";


interface AdminLoginProps {
    setAuth: (isAuthenticated: boolean) => void;
    apiUrl: string;
}

const URL_PREFIX = import.meta.env.VITE_URL_PREFIX;

const AdminLogin: React.FC<AdminLoginProps> = ({ setAuth, apiUrl }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const response = await fetch(`${URL_PREFIX}://${apiUrl}/api/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            setAuth(true); // Update the parent component state
            navigate("/admin");
        } else {
            setError(data.message);
        }
    };

    return (
        <>
            <form onSubmit={handleLogin}>
                <h2>Admin Login</h2>
                {error && <p style={{ color: "red" }}>{error}</p>}
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Login</button>
            </form>
        </>
    );
};

export default AdminLogin;