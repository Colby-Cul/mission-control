import { C } from '../../data/constants';

const ProgressBar = ({ value, color = C.accent, height = 6 }) => (
  <div style={{ height, borderRadius: height / 2, background: C.border, width: "100%" }}>
    <div style={{ 
      height, 
      borderRadius: height / 2, 
      background: color, 
      width: `${Math.min(100, value)}%`, 
      transition: "width 0.3s" 
    }} />
  </div>
);

export default ProgressBar;