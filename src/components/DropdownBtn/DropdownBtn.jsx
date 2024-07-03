import React from 'react';
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import './DropdownBtn.css';

const DropdownBtn = ({ children, open, toggle }) => {
  return (
    <div onClick={(e) => { e.stopPropagation(); toggle(); }}className={`dropdown-btn ${open ? 'button-open' : ''}`}>
      {children}
      <span className='toggle-icon' >
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </span>
    </div>
  );
};

export default DropdownBtn;
