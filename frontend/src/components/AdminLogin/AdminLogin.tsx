import React, { useState } from "react";

// Make sure the prop types are explicitly defined
export interface AdminLoginProps {
    handleLogin: (
        e: React.FormEvent,
        username: string,
        password: string
    ) => void;
    error: string;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ handleLogin, error }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleFormSubmit = (e: React.FormEvent) => {
        handleLogin(e, username, password);
    };

    return (
        <div className="max-w-[600px] mx-auto my-10 p-5 border border-gray-300 rounded-lg shadow-md bg-gray-100 font-sans">
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <h2 className="text-center text-xl font-semibold text-gray-800">Admin Login</h2>
                {error && <p className="mt-5 text-red-600 text-sm">{error}</p>}
                <div className="flex flex-col">
                    <label className="mb-1 font-bold text-gray-700">Username</label>
                    <input className="p-2 text-base border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="flex flex-col">
                    <label className="mb-1 font-bold text-gray-700">Password</label>
                    <input className="p-2 text-base border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="p-2 text-white bg-blue-500 rounded-md cursor-pointer hover:bg-blue-700">Login</button>
            </form>
        </div>
    );
};

export default AdminLogin;