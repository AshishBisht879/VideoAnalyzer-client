import React, { useState,useEffect,useRef } from 'react';
import DropdownBtn from '../DropdownBtn/DropdownBtn';
import DropdownContent from '../DropdownContent/DropdownContent';
import "./Dropdown.css"

export const Dropdown = ({buttonText,content}) => {
    const [open,setOpen] = useState(false)

    const dropdownRef = useRef()

    useEffect(()=>{
      const handler =(event)=>{
        if(dropdownRef.current && !dropdownRef.current.contains(event.target))
        setOpen(false)
      }
      document.addEventListener("click",handler)

      return ()=>{
        document.removeEventListener("click",handler)
      }
    },[dropdownRef])

    const toggelDropdonw = () =>{
        setOpen((open)=>!open);
    }
  return (
    <div className='dropdown' ref={dropdownRef}>
        <DropdownBtn toggle={toggelDropdonw} open={open}>{buttonText}</DropdownBtn>
        <DropdownContent open={open}>{content}</DropdownContent>
    </div>
  )
}

export default Dropdown
