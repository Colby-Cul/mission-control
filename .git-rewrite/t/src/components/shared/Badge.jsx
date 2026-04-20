import { C } from '../../data/constants';

const Badge = ({ children, color = C.accent }) => (
  <span style={{ 
    background: color + "22", 
    color, 
    fontSize: 11, 
    padding: "2px 8px", 
    borderRadius: 9999, 
    fontWeight: 600 
  }}>
    {children}
  </span>
);

export default Badge;