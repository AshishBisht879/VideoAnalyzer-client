import React from 'react';
import DropdownBtn from '../DropdownBtn/DropdownBtn';
import "./Dropdown.css"

export const Dropdown = ({ buttonText, open, toggle }) => {

  return (
    <div className='dropdown'>
      <DropdownBtn toggle={toggle} open={open}>{buttonText}</DropdownBtn>
      {/* <DropdownContent open={open}>{content}</DropdownContent> */}
    </div>
  )
}

export default Dropdown
