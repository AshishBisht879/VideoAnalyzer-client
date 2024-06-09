import React from 'react';
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import './DropdownBtn.css';

const DropdownBtn = ({ children, open, toggle }) => {
  return (
    <div onClick={toggle} className={`dropdown-btn ${open ? 'button-open' : ''}`}>
      {children}
      <span className='toggle-icon' onClick={(e) => { e.stopPropagation(); toggle(); }}>
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </span>
    </div>
  );
};

export default DropdownBtn;
