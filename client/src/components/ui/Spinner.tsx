import React from "react";

const Spinner = ({ size = 40, className = "" }) => (
  <svg
    className={`animate-spin text-blue-500 ${className}`}
    width={size}
    height={size}
    viewBox="0 0 50 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      className="opacity-20"
      cx="25"
      cy="25"
      r="20"
      stroke="currentColor"
      strokeWidth="6"
    />
    <path
      className="opacity-80"
      d="M45 25c0-11.046-8.954-20-20-20"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
    />
  </svg>
);

export default Spinner; 