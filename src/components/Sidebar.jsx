import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <nav className="sidebar">
      <ul>
        <li><Link to="/cmd-1">CMD-1: Executive Overview</Link></li>
        <li><Link to="/cmd-2">CMD-2: Entity Map</Link></li>
        <li><Link to="/cmd-3">CMD-3: Revenue Command</Link></li>
        <li><Link to="/cmd-4">CMD-4: Expense & Efficiency</Link></li>
        <li><Link to="/cmd-5">CMD-5: Cash Flow & Finance</Link></li>
        <li><Link to="/cmd-6">CMD-6: Investing & Capital Allocation</Link></li>
        <li><Link to="/cmd-7">CMD-7: Operations & Automation</Link></li>
        <li><Link to="/cmd-8">CMD-8: Strategic Initiatives</Link></li>
        <li><Link to="/cmd-9">CMD-9: Risk & Exposure</Link></li>
        <li><Link to="/cmd-10">CMD-10: Memory & Decisions</Link></li>
      </ul>
    </nav>
  );
};

export default Sidebar;
