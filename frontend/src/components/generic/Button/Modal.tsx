import React from "react";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)] z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-2xl border border-gray-200 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-semibold mb-4 text-gray-600">{title}</h2>
                <div>{children}</div>
                <div className="mt-4">
                    <button
                        onClick={onClose}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;