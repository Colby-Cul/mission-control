import { C } from '../../data/constants';

const Card = ({ children, style = {}, onClick }) => (
  <div 
    onClick={onClick} 
    style={{
      background: C.card, 
      borderRadius: 12, 
      border: `1px solid ${C.border}`,
      padding: 20, 
      ...style, 
      cursor: onClick ? "pointer" : "default",
    }}
  >
    {children}
  </div>
);

export default Card;