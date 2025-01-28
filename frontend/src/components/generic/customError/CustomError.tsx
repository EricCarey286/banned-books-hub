import React from "react";
import './CustomError.css';

interface ErrorProps {
    errorMessage: string; // Optional mapping for header labels
}

const CustomError: React.FC<ErrorProps> = ({ errorMessage }) => {
    return (
        <p>{errorMessage}</p>);
}

export default CustomError;